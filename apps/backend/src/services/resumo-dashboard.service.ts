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
}

export async function getResumoDashboard(params: ResumoParams) {
  // 1. Busca os KPIs reais que alimentam o resumo (amostras, ensaios, NCs, conformidade)
  const kpis = await getKpisDashboard(params);
  const processos = await getRankingProcessos(params);
  const ensaios = await getRankingEnsaios(params);
  const produtos = await getRankingProdutos(params);

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
      produtos
    } as unknown as Record<string, unknown>
  );

  // 3. Verifica cache
  const cacheado = await buscarCache(chave);
  if (cacheado) return cacheado;

  // 4. Chama o Gateway de IA
  const resposta = await chamarGatewayIA('resumo-dashboard', {
    periodo: { inicio: params.dataInicio, fim: params.dataFim },
    kpis,
    processos,
    ensaios,
    produtos
  });

  // 5. Salva no cache
  await salvarCache(chave, 'resumo_dashboard', resposta);

  return resposta;
}
