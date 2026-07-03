import { blabQuery } from '../db/blab.pool';
import { resolverFiltroPorId } from './analitica.service';
import { resolveFilialLaboratorios } from '../utils/filial.helper';

export interface FaixaExplosaoRow {
    lie: number;
    lse: number;
    n_amostras: number;
    n_produtos: number;
    pct_amostras: number;
}

export interface HistoricoSemFaixaRow {
    cod_produto: string;
    produto: string;
    cod_amostra?: string;
    numero_de_controle?: string;
    data_resultado: string;
    hora_resultado: string;
    timestamp: string;
    conformidade: string;
    valor: number | null;
}

export interface ProdutoFaixaRow {
    cod_produto: string;
    produto: string;
    n_amostras: number;
    pct_conforme: number;
}

export interface HistoricoProdutoRow {
    cod_produto: string;
    produto: string;
    data_resultado: string;
    hora_resultado: string;
    timestamp: string;
    valor: number;
}

// ─── Discriminador de contexto ────────────────────────────────────────────────
// Resolve o filtro usando a nova função resolverFiltroPorId exportada.
// Mantém suporte a prefixos legados 'LCQ...'.

function resolverFiltroContexto(id: string): { sql: string; params: unknown[] } {
    if (id.startsWith('LCQ')) {
        return { sql: 'AND dw.lote_de_controle_de_qualidade LIKE ?', params: [`${id}%`] };
    }
    const filtro = resolverFiltroPorId(id);
    return {
        sql: `AND (${filtro.sql})`,
        params: filtro.params,
    };
}

/**
 * Query 1: Explosão de Faixas
 */
export async function getExplosaoFaixas(
    id: string,
    codEnsaio: string,
    dataInicio: string,
    dataFim: string,
    filialId: number
): Promise<FaixaExplosaoRow[]> {
    const { sql: filtroCtx, params: paramsCtx } = resolverFiltroContexto(id);
    const labs = await resolveFilialLaboratorios(filialId);
    const labFilter = labs.length > 0
        ? `AND dw.cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
        : '';

    return blabQuery(`
    SELECT
      CAST(REPLACE(dw.lie, ',', '.') AS DECIMAL(10,4))   AS lie,
      CAST(REPLACE(dw.lse, ',', '.') AS DECIMAL(10,4))   AS lse,
      COUNT(*)                                            AS n_amostras,
      COUNT(DISTINCT dw.cod_produto)                      AS n_produtos,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1) AS pct_amostras
    FROM DW_FAT_RESULTADO dw
    WHERE dw.D_E_L_E_T IS NULL
      ${filtroCtx}
      ${labFilter}
      AND dw.cod_ensaio = ?
      AND dw.lie IS NOT NULL
      AND dw.lse IS NOT NULL
      AND dw.data_resultado BETWEEN ? AND ?
    GROUP BY
      CAST(REPLACE(dw.lie, ',', '.') AS DECIMAL(10,4)),
      CAST(REPLACE(dw.lse, ',', '.') AS DECIMAL(10,4))
    ORDER BY n_amostras DESC
    LIMIT 10
  `, [...paramsCtx, ...labs, codEnsaio, dataInicio, dataFim]) as Promise<FaixaExplosaoRow[]>;
}

/**
 * Query 2: Produtos por Régua (Faixa)
 */
export async function getProdutosPorFaixa(
    id: string,
    codEnsaio: string,
    lie: number,
    lse: number,
    dataInicio: string,
    dataFim: string,
    filialId: number
): Promise<ProdutoFaixaRow[]> {
    const { sql: filtroCtx, params: paramsCtx } = resolverFiltroContexto(id);
    const labs = await resolveFilialLaboratorios(filialId);
    const labFilter = labs.length > 0
        ? `AND dw.cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
        : '';

    return blabQuery(`
    SELECT
      dw.cod_produto,
      dw.produto,
      COUNT(*)                                                                          AS n_amostras,
      ROUND(SUM(CASE WHEN dw.conformidade = 'CONFORME' THEN 1 ELSE 0 END) * 100.0
        / COUNT(*), 1)                                                                  AS pct_conforme
    FROM DW_FAT_RESULTADO dw
    WHERE dw.D_E_L_E_T IS NULL
      ${filtroCtx}
      ${labFilter}
      AND dw.cod_ensaio = ?
      AND CAST(REPLACE(dw.lie, ',', '.') AS DECIMAL(10,4)) = ?
      AND CAST(REPLACE(dw.lse, ',', '.') AS DECIMAL(10,4)) = ?
      AND dw.data_resultado BETWEEN ? AND ?
    GROUP BY dw.cod_produto, dw.produto
    ORDER BY n_amostras DESC
  `, [...paramsCtx, ...labs, codEnsaio, lie, lse, dataInicio, dataFim]) as Promise<ProdutoFaixaRow[]>;
}

function parseValor(raw: string): number {
    if (!raw) return 0;
    const clean = raw.trim().replace(/,/g, '.');
    if (clean.includes('-')) {
        const parts = clean.split('-').map(p => parseFloat(p.trim()));
        if (parts.length === 2 && !isNaN(parts[0]) && !isNaN(parts[1])) {
            return (parts[0] + parts[1]) / 2;
        }
    }
    const val = parseFloat(clean);
    return isNaN(val) ? 0 : val;
}

/**
 * Query 3: Histórico de Amostras por SKU na Faixa
 */
export async function getHistoricoProdutosFaixa(
    id: string,
    codEnsaio: string,
    lie: number | undefined,
    lse: number | undefined,
    dataInicio: string,
    dataFim: string,
    codProdutos: string[],
    filialId: number
): Promise<any[]> {
    if (codProdutos.length === 0) return [];

    const { sql: filtroCtx, params: paramsCtx } = resolverFiltroContexto(id);
    const labs = await resolveFilialLaboratorios(filialId);
    const labFilter = labs.length > 0
        ? `AND dw.cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
        : '';
    const placeholders = codProdutos.map(() => '?').join(',');

    let lieLseSql = '';
    const lieLseParams: any[] = [];
    if (lie !== undefined && lie !== null) {
        lieLseSql += ` AND CAST(REPLACE(dw.lie, ',', '.') AS DECIMAL(10,4)) = ?`;
        lieLseParams.push(lie);
    }
    if (lse !== undefined && lse !== null) {
        lieLseSql += ` AND CAST(REPLACE(dw.lse, ',', '.') AS DECIMAL(10,4)) = ?`;
        lieLseParams.push(lse);
    }

    const rows = await blabQuery(`
    SELECT
      dw.cod_produto,
      dw.produto,
      dw.cod_amostra,
      dw.numero_de_controle,
      dw.data_resultado,
      COALESCE(dw.hora_resultado, '00:00:00')                              AS hora_resultado,
      CONCAT(dw.data_resultado, ' ', COALESCE(dw.hora_resultado, '00:00:00')) AS timestamp,
      dw.valor                                                            AS valor_raw,
      CAST(REPLACE(dw.lie, ',', '.') AS DECIMAL(10,4))                     AS lie,
      CAST(REPLACE(dw.lse, ',', '.') AS DECIMAL(10,4))                     AS lse
    FROM DW_FAT_RESULTADO dw
    WHERE dw.D_E_L_E_T IS NULL
      ${filtroCtx}
      ${labFilter}
      AND dw.cod_ensaio = ?
      ${lieLseSql}
      AND dw.data_resultado BETWEEN ? AND ?
      AND dw.cod_produto IN (${placeholders})
      AND dw.valor IS NOT NULL
      AND dw.valor REGEXP '^-?[0-9]+([.,][0-9]+)?( *- *-?[0-9]+([.,][0-9]+)?)?$'
    ORDER BY dw.data_resultado ASC, dw.hora_resultado ASC
  `, [...paramsCtx, ...labs, codEnsaio, ...lieLseParams, dataInicio, dataFim, ...codProdutos]) as any[];

  return rows.map(r => ({
      cod_produto: r.cod_produto,
      produto: r.produto,
      cod_amostra: r.cod_amostra,
      numero_de_controle: r.numero_de_controle,
      data_resultado: r.data_resultado,
      hora_resultado: r.hora_resultado,
      timestamp: r.timestamp,
      valor: parseValor(r.valor_raw),
      valor_original: r.valor_raw,
      lie: r.lie !== null ? Number(r.lie) : undefined,
      lse: r.lse !== null ? Number(r.lse) : undefined,
  }));
}

/**
 * Query 4: Produtos para ensaios sem faixa LIE/LSE
 * Usado como fallback quando /faixas retorna [] (ensaios de processo ou produto sem especificação numérica)
 */
export async function getProdutosSemFaixa(
    id: string,
    codEnsaio: string,
    dataInicio: string,
    dataFim: string,
    filialId: number
): Promise<ProdutoFaixaRow[]> {
    const { sql: filtroCtx, params: paramsCtx } = resolverFiltroContexto(id);
    const labs = await resolveFilialLaboratorios(filialId);
    const labFilter = labs.length > 0
        ? `AND dw.cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
        : '';

    return blabQuery(`
    SELECT
      dw.cod_produto,
      dw.produto,
      COUNT(*)                                                                          AS n_amostras,
      ROUND(SUM(CASE WHEN dw.conformidade = 'CONFORME' THEN 1 ELSE 0 END) * 100.0
        / COUNT(*), 1)                                                                  AS pct_conforme
    FROM DW_FAT_RESULTADO dw
    WHERE dw.D_E_L_E_T IS NULL
      ${filtroCtx}
      ${labFilter}
      AND dw.cod_ensaio = ?
      AND dw.data_resultado BETWEEN ? AND ?
    GROUP BY dw.cod_produto, dw.produto
    ORDER BY n_amostras DESC
  `, [...paramsCtx, ...labs, codEnsaio, dataInicio, dataFim]) as Promise<ProdutoFaixaRow[]>;
}

/**
 * Query 5: Histórico cronológico de amostras para ensaios sem faixa LIE/LSE
 * Retorna conformidade textual (CONFORME / NÃO CONFORME) convertida para 1/0 no campo `valor`
 */
export async function getHistoricoProdutosSemFaixa(
    id: string,
    codEnsaio: string,
    dataInicio: string,
    dataFim: string,
    codProdutos: string[],
    filialId: number
): Promise<HistoricoSemFaixaRow[]> {
    if (codProdutos.length === 0) return [];

    const { sql: filtroCtx, params: paramsCtx } = resolverFiltroContexto(id);
    const labs = await resolveFilialLaboratorios(filialId);
    const labFilter = labs.length > 0
        ? `AND dw.cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
        : '';
    const placeholders = codProdutos.map(() => '?').join(',');

    return blabQuery(`
    SELECT
      dw.cod_produto,
      dw.produto,
      dw.cod_amostra,
      dw.numero_de_controle,
      dw.data_resultado,
      COALESCE(dw.hora_resultado, '00:00:00')                              AS hora_resultado,
      CONCAT(dw.data_resultado, ' ', COALESCE(dw.hora_resultado, '00:00:00')) AS timestamp,
      dw.conformidade,
      CASE WHEN dw.conformidade = 'CONFORME' THEN 1 ELSE 0 END            AS valor
    FROM DW_FAT_RESULTADO dw
    WHERE dw.D_E_L_E_T IS NULL
      ${filtroCtx}
      ${labFilter}
      AND dw.cod_ensaio = ?
      AND dw.data_resultado BETWEEN ? AND ?
      AND dw.cod_produto IN (${placeholders})
      AND dw.conformidade IS NOT NULL
    ORDER BY dw.data_resultado ASC, dw.hora_resultado ASC
  `, [...paramsCtx, ...labs, codEnsaio, dataInicio, dataFim, ...codProdutos]) as Promise<HistoricoSemFaixaRow[]>;
}
