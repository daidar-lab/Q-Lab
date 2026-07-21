// apps/backend/src/services/busca.service.ts
//
// Serviço do buscador geral — três responsabilidades:
//  1. getCatalogo(filialId)   — bootstrap de produtos + ensaios (cache 4h, server-side Map)
//  2. executarBusca(tokens, filialId)  — query composta com cache de resultado (5min)
//  3. Utilitários de cache (buildCacheKey, cachedQuery)
//
// Não reimplemente: blabQuery, resolveFilialLaboratorios, resolverFiltroPorId

import { blabQuery } from '../db/blab.pool';
import { resolveFilialLaboratorios } from '../utils/filial.helper';
import { resolverFiltroPorId } from './analitica.service';

// ─── Tipos ────────────────────────────────────────────────────────────────────

export interface CatalogoItem {
  id: number;
  nome: string;
}

export interface TipoCatalogoItem {
  tipo: string;
  produtos: CatalogoItem[];
}

export interface Catalogo {
  produtos: CatalogoItem[];
  ensaios: CatalogoItem[];
  tipos: TipoCatalogoItem[];
  carregadoEm: number;
}

export interface SearchTokens {
  processos: string[];
  produtos: number[];
  ensaios: number[];
  periodo: { dataInicio: string; dataFim: string };
}

export interface SearchResultRow {
  cod_amostra: number;
  cod_ensaio: number;
  ensaio: string;
  cod_produto: number;
  produto: string;
  lote_de_controle_de_qualidade: string;
  data_resultado: string;
  valor: string;
  conformidade: 'CONFORME' | 'NÃO CONFORME';
  limite_inferior: number | null;
  limite_superior: number | null;
  valor_alvo: number | null;
}

// ─── Peça 1 — getCatalogo ─────────────────────────────────────────────────────

const _catalogoCache = new Map<number, Catalogo>();
const _catalogoInFlight = new Map<number, Promise<Catalogo>>();
const TTL_CATALOGO = 24 * 60 * 60 * 1000; // 24 horas

export async function getCatalogo(filialId: number): Promise<Catalogo> {
  const cached = _catalogoCache.get(filialId);
  // Invalida cache legado que não possui o campo tipos (gerado antes dessa versão)
  if (cached && !cached.tipos) _catalogoCache.delete(filialId);
  else if (cached && Date.now() - cached.carregadoEm < TTL_CATALOGO) return cached;

  const inFlight = _catalogoInFlight.get(filialId);
  if (inFlight) return inFlight;

  const promise = (async () => {

  const labs = await resolveFilialLaboratorios(filialId);

  // Se não há labs, retorna catálogo vazio — não query global
  if (labs.length === 0) {
    const vazio: Catalogo = { produtos: [], ensaios: [], tipos: [], carregadoEm: Date.now() };
    _catalogoCache.set(filialId, vazio);
    return vazio;
  }

  const labPlaceholders = labs.map(() => '?').join(',');

  const [produtos, ensaios, tiposRows] = await Promise.all([
    blabQuery<CatalogoItem>(`
      SELECT DISTINCT cod_produto AS id, produto AS nome
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND cod_produto IS NOT NULL
        AND conformidade != 'NÃO AVALIADO'
        AND cod_laboratorio IN (${labPlaceholders})
      ORDER BY nome
    `, labs),

    blabQuery<CatalogoItem>(`
      SELECT DISTINCT cod_ensaio AS id, ensaio AS nome
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND cod_ensaio IS NOT NULL
        AND conformidade != 'NÃO AVALIADO'
        AND cod_laboratorio IN (${labPlaceholders})
      ORDER BY nome
    `, labs),

    // Tipos de produto — JOIN com DIM_PRODUTO para obter dp.tipo
    blabQuery<{ tipo: string; id: number; nome: string }>(`
      SELECT DISTINCT
        dp.tipo   AS tipo,
        dw.cod_produto AS id,
        dw.produto     AS nome
      FROM DW_FAT_RESULTADO dw
      INNER JOIN DIM_PRODUTO dp
        ON dp.cod_produto = dw.cod_produto
        AND dp.D_E_L_E_T IS NULL
      WHERE dw.D_E_L_E_T IS NULL
        AND dw.cod_produto IS NOT NULL
        AND dw.conformidade != 'NÃO AVALIADO'
        AND dw.cod_laboratorio IN (${labPlaceholders})
      ORDER BY dp.tipo ASC, dw.produto ASC
    `, labs),
  ]);

  // Agrupa produtos por tipo (mesmo padrão de getRankingProdutos)
  const tiposMap = new Map<string, TipoCatalogoItem>();
  for (const r of tiposRows) {
    const tipo = r.tipo ?? 'Sem Tipo';
    if (!tiposMap.has(tipo)) {
      tiposMap.set(tipo, { tipo, produtos: [] });
    }
    tiposMap.get(tipo)!.produtos.push({ id: Number(r.id), nome: r.nome });
  }
  const tipos = Array.from(tiposMap.values());

  const catalogo: Catalogo = { produtos, ensaios, tipos, carregadoEm: Date.now() };
  _catalogoCache.set(filialId, catalogo);

  return catalogo;
  })().finally(() => {
    _catalogoInFlight.delete(filialId);
  });

  _catalogoInFlight.set(filialId, promise);
  return promise;
}

// ─── Peças 4 e 5 — Cache de resultados ───────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const _resultCache = new Map<string, CacheEntry<unknown>>();
const _inFlight    = new Map<string, Promise<unknown>>();
const TTL_RESULTADO = 5 * 60 * 1000; // 5 minutos

export function buildCacheKey(tokens: SearchTokens, filialId: number, affix = ''): string {
  // Os arrays são normalizados com .sort() para garantir que a ordem dos tokens
  // não gere chaves de cache distintas para consultas semanticamente idênticas.
  const processos = [...tokens.processos].sort().join(',');
  const produtos = [...tokens.produtos].sort().join(',');
  const ensaios = [...tokens.ensaios].sort().join(',');
  const periodo = `${tokens.periodo.dataInicio}:${tokens.periodo.dataFim}`;
  return `f${filialId}|proc:${processos}|prod:${produtos}|ens:${ensaios}|p:${periodo}${affix ? '|' + affix : ''}`;
}

// Proteção contra thundering herd: se múltiplos requests chegarem com o mesmo
// cache expirado ao mesmo tempo, apenas o primeiro dispara a query — os demais
// aguardam a mesma Promise em voo. Mesmo padrão usado no catalogo-store.ts do frontend.
async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl = TTL_RESULTADO,
): Promise<T> {
  const cached = _resultCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  // Já tem uma query em voo — devolve a mesma Promise
  const inFlight = _inFlight.get(key) as Promise<T> | undefined;
  if (inFlight) return inFlight;

  // Primeira chamada — dispara e registra
  const promise = queryFn().then(data => {
    _resultCache.set(key, { data, expiresAt: Date.now() + ttl });
    _inFlight.delete(key);
    return data;
  }).catch(err => {
    _inFlight.delete(key); // permite retry em caso de falha
    throw err;
  });

  _inFlight.set(key, promise);
  return promise;
}

// Limpeza periódica do cache — evita crescimento ilimitado
const cleanupInterval = setInterval(() => {
  const agora = Date.now();
  for (const [key, entry] of _resultCache.entries()) {
    if (entry.expiresAt < agora) _resultCache.delete(key);
  }
}, 10 * 60 * 1000); // a cada 10 minutos

// O unref previne que o intervalo bloqueie o shutdown do processo (hot-reload/graceful exit)
cleanupInterval.unref();

// ─── Helpers de Query ────────────────────────────────────────────────────────

// Prefixador de colunas — garante que filtros dinâmicos de processo usem o alias correto.
// cod_skip_lote vem obrigatoriamente do JOIN com DIM_CABECALHO_DE_ESPECIFICACAO (CAB),
// pois o campo desnormalizado em DW_FAT_RESULTADO pode estar desatualizado ou NULL.
// Mesmo padrão do detalhe.service.ts e do getRankingProcessos.
function prefixFilterBusca(filterSql: string): string {
  let prefixed = filterSql;
  const colsR = [
    'cod_produto', 'cod_laboratorio', 'lote_de_controle_de_qualidade',
    'operacao', 'cod_centro_de_custo', 'cod_amostra_interunidade',
    'cod_cabecalho_de_especificacao', 'cod_ensaio', 'cod_area', 'produto',
    'cod_operacao',
  ];
  for (const col of colsR) {
    prefixed = prefixed.replace(new RegExp(`(?<!\\.)\\b${col}\\b`, 'g'), `R.${col}`);
  }
  // cod_skip_lote é a única que vem obrigatoriamente da dimensão (CAB)
  prefixed = prefixed.replace(/(?<!\.)\bcod_skip_lote\b/g, 'CAB.cod_skip_lote');
  return prefixed;
}

async function buildSearchConditions(tokens: SearchTokens, filialId: number) {
  const labs = await resolveFilialLaboratorios(filialId);
  const labFilter = labs.length > 0
    ? `AND R.cod_laboratorio IN (${labs.map(() => '?').join(',')})`
    : '';

  const clausulas: string[] = [];
  const params: unknown[] = [
    tokens.periodo.dataInicio,
    tokens.periodo.dataFim,
    ...labs,
  ];

  // PROCESSOS — filtragem via cod_skip_lote requer o JOIN com CAB
  let needsSkipLoteJoin = false;
  if (tokens.processos.length > 0) {
    const filtrosProcesso = tokens.processos.map(slug => resolverFiltroPorId(slug));
    const orProcessos = filtrosProcesso
      .map(f => `(${prefixFilterBusca(f.sql)})`)
      .join(' OR ');
    clausulas.push(`(${orProcessos})`);
    filtrosProcesso.forEach(f => params.push(...f.params));
    // Detecta se algum filtro usa cod_skip_lote (virará CAB.cod_skip_lote após prefixação)
    needsSkipLoteJoin = filtrosProcesso.some(f => /cod_skip_lote/i.test(f.sql));
  }

  // PRODUTO
  if (tokens.produtos.length > 0) {
    clausulas.push(`R.cod_produto IN (${tokens.produtos.map(() => '?').join(',')})`);
    params.push(...tokens.produtos);
  }

  // ENSAIO
  if (tokens.ensaios.length > 0) {
    clausulas.push(`R.cod_ensaio IN (${tokens.ensaios.map(() => '?').join(',')})`);
    params.push(...tokens.ensaios);
  }

  const whereExtra = clausulas.length > 0
    ? `AND (${clausulas.join(' AND ')})`
    : '';

  // JOIN necessário sempre que algum filtro de processo referenciar CAB.cod_skip_lote
  const cabJoin = needsSkipLoteJoin
    ? `LEFT JOIN DIM_CABECALHO_DE_ESPECIFICACAO CAB
         ON CAB.cod_cabecalho_de_especificacao = R.cod_cabecalho_de_especificacao`
    : '';

  return { labFilter, whereExtra, params, cabJoin };
}

// ─── Peça 6 — executarBusca (Linhas Paginadas) ───────────────────────────────

export async function executarBusca(
  tokens: SearchTokens,
  filialId: number,
  limit = 500,
  offset = 0
): Promise<SearchResultRow[]> {
  const key = buildCacheKey(tokens, filialId, `L${limit}O${offset}`);

  return cachedQuery(key, async () => {
    const { labFilter, whereExtra, params, cabJoin } = await buildSearchConditions(tokens, filialId);

    return blabQuery<SearchResultRow>(`
      SELECT
        R.cod_amostra,
        R.cod_ensaio,
        R.ensaio,
        R.cod_produto,
        R.produto,
        R.lote_de_controle_de_qualidade,
        R.data_resultado,
        R.valor,
        R.conformidade,
        R.lie AS limite_inferior,
        R.lse AS limite_superior,
        R.operacao
      FROM DW_FAT_RESULTADO R
      ${cabJoin}
      WHERE R.D_E_L_E_T IS NULL
        AND R.conformidade != 'NÃO AVALIADO'
        AND R.valor IS NOT NULL AND R.valor != ''
        AND R.data_resultado BETWEEN ? AND ?
        ${labFilter}
        ${whereExtra}
      ORDER BY R.data_resultado DESC
      LIMIT ? OFFSET ?
    `, [...params, limit, offset], 30_000); // timeout explícito de 30s
  });
}

// ─── Peça 7 — executarAgregacoesBusca (KPIs e Gráficos) ──────────────────────

export interface AgregacoesBusca {
  kpis: {
    totalResultados: number;
    naoConformes: number;
    taxaConformidade: number;
    ensaiosIds: number[];
    produtosIds: number[];
  };
  graficoConformidade: {
    periodo: string;
    conforme: number;
    naoConforme: number;
  }[];
  pontosEspecificacao: SearchResultRow[];
}

export async function executarAgregacoesBusca(
  tokens: SearchTokens,
  filialId: number
): Promise<AgregacoesBusca> {
  const key = buildCacheKey(tokens, filialId, 'aggs');

  return cachedQuery(key, async () => {
    const { labFilter, whereExtra, params, cabJoin } = await buildSearchConditions(tokens, filialId);

    // Query 1 — Gráfico por período (gera KPIs e gráfico em um único scan).
    // GROUP_CONCAT eliminado: ensaiosIds/produtosIds são extraídos dos pontosEspecificacao em JS.
    const sqlGrafico = `
      SELECT
        DATE_FORMAT(R.data_resultado, '%Y-%m')           AS periodo,
        COUNT(*)                                          AS totalPeriodo,
        SUM(IF(R.conformidade = 'CONFORME', 1, 0))       AS conforme,
        SUM(IF(R.conformidade = 'NÃO CONFORME', 1, 0))   AS naoConforme
      FROM DW_FAT_RESULTADO R
      ${cabJoin}
      WHERE R.D_E_L_E_T IS NULL
        AND R.conformidade != 'NÃO AVALIADO'
        AND R.valor IS NOT NULL AND R.valor != ''
        AND R.data_resultado BETWEEN ? AND ?
        ${labFilter}
        ${whereExtra}
      GROUP BY periodo
      ORDER BY periodo ASC
    `;

    // Query 2 — Pontos para gráficos de especificação (LIMIT 2000 para não explodir o frontend)
    const sqlSpecs = `
      SELECT
        R.cod_amostra,
        R.cod_ensaio,
        R.ensaio,
        R.cod_produto,
        R.produto,
        R.lote_de_controle_de_qualidade,
        R.data_resultado,
        R.valor,
        R.conformidade,
        R.lie AS limite_inferior,
        R.lse AS limite_superior,
        R.operacao
      FROM DW_FAT_RESULTADO R
      ${cabJoin}
      WHERE R.D_E_L_E_T IS NULL
        AND R.conformidade != 'NÃO AVALIADO'
        AND R.valor IS NOT NULL AND R.valor != ''
        AND R.data_resultado BETWEEN ? AND ?
        ${labFilter}
        ${whereExtra}
      ORDER BY R.data_resultado DESC
      LIMIT 2000
    `;

    const [graficoPorPeriodo, pontosEspecificacao] = await Promise.all([
      blabQuery<any>(sqlGrafico, params, 60_000),
      blabQuery<SearchResultRow>(sqlSpecs, params, 60_000),
    ]);

    // KPIs calculados em JS — zero custo extra no banco
    const total = graficoPorPeriodo.reduce((s: number, r: any) => s + Number(r.totalPeriodo), 0);
    const nc    = graficoPorPeriodo.reduce((s: number, r: any) => s + Number(r.naoConforme), 0);
    const taxa  = total > 0 ? Math.round(((total - nc) / total) * 1000) / 10 : 0;

    // ensaiosIds/produtosIds derivados dos pontosEspecificacao — sem GROUP_CONCAT e sem risco de truncamento
    const ensaiosIds  = [...new Set(pontosEspecificacao.map(r => r.cod_ensaio))];
    const produtosIds = [...new Set(pontosEspecificacao.map(r => r.cod_produto))];

    return {
      kpis: { totalResultados: total, naoConformes: nc, taxaConformidade: taxa, ensaiosIds, produtosIds },
      graficoConformidade: graficoPorPeriodo.map((g: any) => ({
        periodo:     g.periodo,
        conforme:    Number(g.conforme),
        naoConforme: Number(g.naoConforme),
      })),
      pontosEspecificacao,
    };
  });
}
