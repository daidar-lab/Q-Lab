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

export interface Catalogo {
  produtos: CatalogoItem[];
  ensaios: CatalogoItem[];
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
const TTL_CATALOGO = 4 * 60 * 60 * 1000; // 4 horas

export async function getCatalogo(filialId: number): Promise<Catalogo> {
  const cached = _catalogoCache.get(filialId);
  if (cached && Date.now() - cached.carregadoEm < TTL_CATALOGO) return cached;

  const labs = await resolveFilialLaboratorios(filialId);

  // Se não há labs, retorna catálogo vazio — não query global
  if (labs.length === 0) {
    const vazio: Catalogo = { produtos: [], ensaios: [], carregadoEm: Date.now() };
    _catalogoCache.set(filialId, vazio);
    return vazio;
  }

  const labPlaceholders = labs.map(() => '?').join(',');

  const [produtos, ensaios] = await Promise.all([
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
  ]);

  const catalogo: Catalogo = { produtos, ensaios, carregadoEm: Date.now() };
  _catalogoCache.set(filialId, catalogo);

  // Revalidação silenciosa em background após TTL — não bloqueia request seguinte
  // (a próxima chamada após TTL retorna o valor stale e agenda nova carga)
  return catalogo;
}

// ─── Peças 4 e 5 — Cache de resultados ───────────────────────────────────────

interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

const _resultCache = new Map<string, CacheEntry<unknown>>();
const TTL_RESULTADO = 5 * 60 * 1000; // 5 minutos

export function buildCacheKey(tokens: SearchTokens, filialId: number): string {
  const processos = [...tokens.processos].sort().join(',');
  const produtos = [...tokens.produtos].sort().join(',');
  const ensaios = [...tokens.ensaios].sort().join(',');
  const periodo = `${tokens.periodo.dataInicio}:${tokens.periodo.dataFim}`;
  return `f${filialId}|proc:${processos}|prod:${produtos}|ens:${ensaios}|p:${periodo}`;
}

async function cachedQuery<T>(
  key: string,
  queryFn: () => Promise<T>,
  ttl = TTL_RESULTADO,
): Promise<T> {
  const cached = _resultCache.get(key) as CacheEntry<T> | undefined;
  if (cached && cached.expiresAt > Date.now()) return cached.data;

  const data = await queryFn();
  _resultCache.set(key, { data, expiresAt: Date.now() + ttl });
  return data;
}

// Limpeza periódica do cache — evita crescimento ilimitado
setInterval(() => {
  const agora = Date.now();
  for (const [key, entry] of _resultCache.entries()) {
    if (entry.expiresAt < agora) _resultCache.delete(key);
  }
}, 10 * 60 * 1000); // a cada 10 minutos

// ─── Peça 6 — executarBusca ──────────────────────────────────────────────────

export async function executarBusca(
  tokens: SearchTokens,
  filialId: number,
): Promise<SearchResultRow[]> {
  const key = buildCacheKey(tokens, filialId);

  return cachedQuery(key, async () => {
    const labs = await resolveFilialLaboratorios(filialId);
    const labFilter = labs.length > 0
      ? `AND R.cod_laboratorio IN (${labs.map(() => '?').join(',')})`
      : '';

    const clausulas: string[] = [];
    // Ordem obrigatória de params: [dataInicio, dataFim, ...labs, ...paramsProcesso, ...produtos, ...ensaios]
    const params: unknown[] = [
      tokens.periodo.dataInicio,
      tokens.periodo.dataFim,
      ...labs,
    ];

    // PROCESSOS — OR entre si (uma amostra pertence a UM processo por vez)
    // O bloco inteiro entra como AND com o restante
    if (tokens.processos.length > 0) {
      const filtrosProcesso = tokens.processos.map(slug => resolverFiltroPorId(slug));
      const orProcessos = filtrosProcesso.map(f => `(${f.sql})`).join(' OR ');
      clausulas.push(`(${orProcessos})`);
      filtrosProcesso.forEach(f => params.push(...f.params));
    }

    // PRODUTO — AND direto (afunilamento progressivo)
    if (tokens.produtos.length > 0) {
      clausulas.push(`R.cod_produto IN (${tokens.produtos.map(() => '?').join(',')})`);
      params.push(...tokens.produtos);
    }

    // ENSAIO — AND direto (afunilamento progressivo)
    if (tokens.ensaios.length > 0) {
      clausulas.push(`R.cod_ensaio IN (${tokens.ensaios.map(() => '?').join(',')})`);
      params.push(...tokens.ensaios);
    }

    const whereExtra = clausulas.length > 0
      ? `AND (${clausulas.join(' AND ')})`
      : '';

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
      WHERE R.D_E_L_E_T IS NULL
        AND R.conformidade != 'NÃO AVALIADO'
        AND R.valor IS NOT NULL AND R.valor != ''
        AND R.data_resultado BETWEEN ? AND ?
        ${labFilter}
        ${whereExtra}
      ORDER BY R.data_resultado DESC
      LIMIT 30000
    `, params, 30_000); // timeout explícito de 30s
  });
}
