// apps/backend/src/services/resumo-dashboard.service.ts

import { chamarGatewayIA } from './ia-gateway.service';
import { gerarChaveCache, buscarCache, salvarCache } from './cache-ia.service';
import { getKpisDashboard } from './analitica.service';
import { getRankingProcessos } from './analitica.service';
import { getRankingEnsaios } from './analitica.service';
import { getRankingProdutos } from './analitica.service';

interface ResumoParams {
  dataInicio: string;
  dataFim: string;
  filialId: number;
  kpis: any;
  processos: any;
  ensaios: any;
  produtos: any;
  metaConformidade?: number;
}

export async function getResumoDashboard(params: ResumoParams) {
  // 1. Desestrutura os dados recebidos do frontend
  const { kpis, processos, ensaios, produtos, metaConformidade } = params;

  // 2. Monta chave de cache com fingerprint dos números reais
  // 2. Monta chave de cache com fingerprint dos números reais
  const chave = gerarChaveCache(
    'resumo_dashboard',
    { dataInicio: params.dataInicio, dataFim: params.dataFim },
    // 👇 Agrupamos tudo dentro de um único objeto {} para ser o 3º argumento
    {
      kpis,
      processos,
      ensaios,
      produtos,
      metaConformidade
    } as unknown as Record<string, unknown>
  );

  // 3. Verifica cache
  const cacheado = await buscarCache(chave);
  if (cacheado) return cacheado;

  // 4. Prepara os KPIs, forçando a meta correta para não confundir a IA
  const kpisParaIA = { ...kpis };
  if (kpisParaIA?.conformidade && params.metaConformidade !== undefined) {
    kpisParaIA.conformidade = {
      ...kpisParaIA.conformidade,
      meta: params.metaConformidade, // Substitui os 95% do kpi original
    };
  }

  // Chama o Gateway de IA
  const resposta = await chamarGatewayIA('resumo-dashboard', {
    periodo: { inicio: params.dataInicio, fim: params.dataFim },
    kpis: kpisParaIA,
    processos,
    ensaios,
    produtos,
    metaConformidade: params.metaConformidade
  });

  // ── Trata o caso em que a IA retorna um JSON stringificado no campo 'texto' ──
  try {
    const parseado = JSON.parse(resposta.texto);
    if (parseado.texto) resposta.texto = parseado.texto;
    if (parseado.destaques && (!resposta.destaques || resposta.destaques.length === 0)) resposta.destaques = parseado.destaques;
    if (parseado.acoes && (!resposta.acoes || resposta.acoes.length === 0)) resposta.acoes = parseado.acoes;
  } catch (e) {
    // Ignora silenciosamente, significa que é um texto normal
  }

  // ── Slugs válidos do sistema (espelho do resolverFiltroPorId) ──────────────
  const SLUGS_VALIDOS = new Set([
    'fermento', 'residuos', 'ar-co2', 'co2-beneficiado',
    'microbiologia-estabilidade-micro', 'microbiologia-estabilidade-envase',
    'microbiologia-agua-enxague', 'microbiologia-swab',
    'envase-arrolhamento', 'envase-provas-horarias', 'envase-assoprador',
    'envase-lubrificante', 'envase-recravacao', 'envase-pasteurizador',
    'envase-chopp', 'envase-produto-acabado',
    'cip-processo', 'cip-envasamento-novo', 'cip-envasamento-antigo',
    'microbiologia-analise-microbiologia',
    'fisico-embalagem', 'fisico-materia-prima', 'fisico-quimicos',
    'desalcoolizacao', 'filtracao', 'fermentacao', 'brassagem',
    'maturacao', 'captacao', 'tratamento-efluentes', 'envase-interunidades',
  ]);

  // ── Valida e aplica fallback nas acoes retornadas pela IA ──────────────────
  const acoes: { tipo: string; id: string | number; label: string }[] = Array.isArray(resposta.acoes)
    ? resposta.acoes
    : [];

  const acaoProcesso = acoes.find(a => a.tipo === 'processo');
  const acaoEnsaio   = acoes.find(a => a.tipo === 'ensaio');

  const processoIdFinal = acaoProcesso && SLUGS_VALIDOS.has(String(acaoProcesso.id))
    ? acaoProcesso.id
    : processos?.[0]?.id ?? null;

  const ensaioIdFinal = acaoEnsaio && typeof acaoEnsaio.id === 'number'
    ? acaoEnsaio.id
    : ensaios?.[0]?.id ?? null;

  // ── Reconstrói acoes com valores validados ─────────────────────────────────
  resposta.acoes = [
    {
      tipo: 'processo' as const,
      id: processoIdFinal,
      label: acaoProcesso?.label ?? `Analisar ${processos?.[0]?.nome ?? 'processo'}`,
    },
    {
      tipo: 'ensaio' as const,
      id: ensaioIdFinal,
      label: acaoEnsaio?.label ?? 'Ver ensaio crítico',
    },
  ].filter(a => a.id !== null) as any;

  // 5. Salva no cache
  await salvarCache(chave, 'resumo_dashboard', resposta);

  return resposta;
}
