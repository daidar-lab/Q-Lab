// apps/backend/src/services/analitica.service.ts

import { blabQuery } from '../db/blab.pool';
import { resolverGranularidade } from './inspecao.service';
import type { ContextoAnalise } from '@qlab/types';



const DATE_FORMAT: Record<string, string> = {
  DAY: '%Y-%m-%d',
  WEEK: '%Y-%u',
  MONTH: '%Y-%m',
};

// ─── Envelope base ────────────────────────────────────────────────────────────

function buildEnvelope(ctx: ContextoAnalise): { where: string; params: unknown[] } {
  const conditions: string[] = [
    'D_E_L_E_T IS NULL',
    'cod_produto         = ?',
    'cod_centro_de_custo = ?',
    'cod_ensaio          = ?',
    'data_resultado BETWEEN ? AND ?',
    '(? IS NULL OR cod_bem = ?)',
    'valor IS NOT NULL',
    "valor != ''",
  ];
  const params: unknown[] = [
    ctx.codProduto,
    ctx.codCentroCusto,
    ctx.codEnsaio,
    ctx.dataInicio,
    ctx.dataFim,
    ctx.codBem ?? null, ctx.codBem ?? null,
  ];

  // skip lote: IN para múltiplos, = para único, omitido se null
  if (ctx.codSkipLote != null) {
    const valores = Array.isArray(ctx.codSkipLote) ? ctx.codSkipLote : [ctx.codSkipLote];
    const placeholders = valores.map(() => '?').join(', ');
    conditions.push(`cod_skip_lote IN (${placeholders})`);
    params.push(...valores.map(String));
  }

  return { where: conditions.join('\n    AND '), params };
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMÍLIA NUMÉRICA
// ─────────────────────────────────────────────────────────────────────────────

export async function numericoSerieTemporal(ctx: ContextoAnalise) {
  const { where, params } = buildEnvelope(ctx);
  const gran = resolverGranularidade(ctx.dataInicio, ctx.dataFim);
  const fmt = DATE_FORMAT[gran];

  return blabQuery(`
    SELECT
      DATE_FORMAT(data_resultado, '${fmt}')                                       AS periodo,
      MAX(cod_amostra)                                                            AS cod_amostra,
      MAX(numero_de_controle)                                                     AS numero_de_controle,
      ROUND(AVG(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))), 4)              AS media,
      ROUND(MIN(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))), 4)              AS minimo,
      ROUND(MAX(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))), 4)              AS maximo,
      COUNT(*)                                                                    AS n,
      CAST(REPLACE(MAX(lie), ',', '.') AS DECIMAL(10,4))                         AS lie,
      CAST(REPLACE(MAX(lse), ',', '.') AS DECIMAL(10,4))                         AS lse
    FROM DW_FAT_RESULTADO
    WHERE ${where}
      AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
    GROUP BY periodo
    ORDER BY periodo ASC
  `, params);
}

export async function numericoEstatisticas(ctx: ContextoAnalise) {
  const { where, params } = buildEnvelope(ctx);

  return blabQuery(`
    SELECT
      COUNT(*)                                                                    AS n,
      ROUND(AVG(CAST(REPLACE(valor,    ',', '.') AS DECIMAL(10,4))), 4)          AS media,
      ROUND(STDDEV(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))), 4)          AS desvio,
      ROUND(MIN(CAST(REPLACE(valor,    ',', '.') AS DECIMAL(10,4))), 4)          AS minimo,
      ROUND(MAX(CAST(REPLACE(valor,    ',', '.') AS DECIMAL(10,4))), 4)          AS maximo,
      ROUND(CAST(REPLACE(MAX(lie), ',', '.') AS DECIMAL(10,4)), 4)               AS lie,
      ROUND(CAST(REPLACE(MAX(lse), ',', '.') AS DECIMAL(10,4)), 4)               AS lse,
      ROUND(
        (CAST(REPLACE(MAX(lse), ',', '.') AS DECIMAL(10,4)) -
         CAST(REPLACE(MAX(lie), ',', '.') AS DECIMAL(10,4)))
        / NULLIF(6 * STDDEV(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))), 0)
      , 4) AS cp,
      ROUND(
        LEAST(
          (CAST(REPLACE(MAX(lse), ',', '.') AS DECIMAL(10,4)) -
            AVG(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))))
          / NULLIF(3 * STDDEV(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))), 0),
          (AVG(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))) -
            CAST(REPLACE(MAX(lie), ',', '.') AS DECIMAL(10,4)))
          / NULLIF(3 * STDDEV(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))), 0)
        )
      , 4) AS cpk
    FROM DW_FAT_RESULTADO
    WHERE ${where}
      AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
      AND lie IS NOT NULL
      AND lse IS NOT NULL
  `, params);
}

export async function numericoHistograma(ctx: ContextoAnalise, numBins = 10) {
  const { where, params } = buildEnvelope(ctx);

  return blabQuery(`
    WITH bounds AS (
      SELECT
        MIN(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))) AS vmin,
        MAX(CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))) AS vmax,
        CAST(REPLACE(MAX(lie), ',', '.') AS DECIMAL(10,4))   AS lie,
        CAST(REPLACE(MAX(lse), ',', '.') AS DECIMAL(10,4))   AS lse
      FROM DW_FAT_RESULTADO
      WHERE ${where}
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
    ),
    bins AS (
      SELECT
        LEAST(
          FLOOR(
            (CAST(REPLACE(dw.valor, ',', '.') AS DECIMAL(10,4)) - b.vmin)
            / IF(b.vmax - b.vmin = 0, 1, (b.vmax - b.vmin) / ${numBins})
          ),
          ${numBins} - 1
        ) AS bin_idx,
        b.vmin,
        b.vmax,
        b.lie,
        b.lse,
        IF(b.vmax - b.vmin = 0, 1, (b.vmax - b.vmin) / ${numBins}) AS bin_width
      FROM DW_FAT_RESULTADO dw, bounds b
      WHERE ${where}
        AND dw.valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
    )
    SELECT
      bin_idx,
      COUNT(*)                                   AS frequencia,
      ROUND(vmin + bin_idx * bin_width, 4)        AS bin_inicio,
      ROUND(vmin + (bin_idx + 1) * bin_width, 4)  AS bin_fim,
      MAX(lie)                                   AS lie,
      MAX(lse)                                   AS lse
    FROM bins
    GROUP BY bin_idx, vmin, vmax, bin_width
    ORDER BY bin_idx ASC
  `, [...params, ...params]);  // params usados em bounds + bins
}

export async function numericoShewhart(ctx: ContextoAnalise) {
  const { where, params } = buildEnvelope(ctx);

  const rows = await blabQuery(`
    WITH dados AS (
      SELECT
        cod_amostra,
        numero_de_controle,
        CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))              AS valor_num,
        conformidade,
        DATE_FORMAT(data_resultado, '%Y-%m-%d')                      AS data_resultado,
        LEFT(hora_resultado, 5)                                      AS hora_resultado,
        -- Filtra sentinel de LSE (>= 100000 significa "sem limite definido")
        IF(
          CAST(REPLACE(lse, ',', '.') AS DECIMAL(10,4)) < 100000,
          CAST(REPLACE(lse, ',', '.') AS DECIMAL(10,4)),
          NULL
        )                                                              AS lse_val,
        ROW_NUMBER() OVER (ORDER BY data_resultado ASC, hora_resultado ASC) AS seq
      FROM DW_FAT_RESULTADO
      WHERE ${where}
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
    ),
    limites AS (
      SELECT
        ROUND(AVG(valor_num), 4)                                     AS lm,
        ROUND(AVG(valor_num) + 3 * STDDEV(valor_num), 4)             AS lsc,
        ROUND(AVG(valor_num) - 3 * STDDEV(valor_num), 4)             AS lic,
        -- lse: retorna NULL se todos os valores forem sentinel
        ROUND(MAX(lse_val), 4)                                       AS lse
      FROM dados
    )
    SELECT
      d.seq,
      d.cod_amostra,
      d.numero_de_controle,
      d.valor_num,
      d.conformidade,
      d.data_resultado,
      d.hora_resultado,
      IF(d.valor_num > l.lsc OR d.valor_num < l.lic, 1, 0)           AS fora_de_controle,
      l.lm,
      l.lsc,
      l.lic,
      l.lse
    FROM dados d, limites l
    ORDER BY d.seq ASC
    LIMIT 500
  `, params) as any[];

  if (rows.length === 0) return { pontos: [], limites: null };

  const pontos = rows.map(({ lm: _lm, lsc: _lsc, lic: _lic, lse: _lse, lse_val: _lse_val, ...rest }) => rest);
  const { lm, lsc, lic, lse } = rows[0];

  return { pontos, limites: { lm, lsc, lic, lse } };
}

export async function getDetalheAmostra(codAmostra: string, codEnsaioAtual?: string) {
  return blabQuery(`
    SELECT
      dw.cod_ensaio,
      dw.ensaio,
      dw.valor,
      dw.lie,
      dw.lse,
      dw.conformidade,
      dw.data_resultado,
      dw.hora_resultado,
      dw.laboratorio,
      dw.equipamento,
      dw.numero_de_controle,
      dw.lote_de_controle_de_qualidade,
      CASE WHEN dw.cod_ensaio = ? THEN 1 ELSE 0 END AS destaque
    FROM DW_FAT_RESULTADO dw
    WHERE dw.D_E_L_E_T IS NULL
      AND dw.cod_amostra = ?
    ORDER BY destaque DESC, dw.ensaio ASC
  `, [codEnsaioAtual ?? null, codAmostra]);
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMÍLIA FAIXA
// ─────────────────────────────────────────────────────────────────────────────

export async function faixaDistribuicao(ctx: ContextoAnalise) {
  const { where, params } = buildEnvelope(ctx);

  return blabQuery(`
    SELECT
      valor                                                         AS faixa,
      COUNT(*)                                                      AS frequencia,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1)           AS pct
    FROM DW_FAT_RESULTADO
    WHERE ${where}
      AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?\\\\s*[-\\/]\\\\s*-?[0-9]+([.,][0-9]+)?$'
    GROUP BY valor
    ORDER BY frequencia DESC
    LIMIT 100
  `, params);
}

export async function faixaSerieTemporal(ctx: ContextoAnalise) {
  const { where, params } = buildEnvelope(ctx);
  const gran = resolverGranularidade(ctx.dataInicio, ctx.dataFim);
  const fmt = DATE_FORMAT[gran];

  return blabQuery(`
    SELECT
      DATE_FORMAT(data_resultado, '${fmt}') AS periodo,
      valor                                 AS faixa_modal,
      COUNT(*)                              AS n
    FROM DW_FAT_RESULTADO
    WHERE ${where}
      AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?\\\\s*[-\\/]\\\\s*-?[0-9]+([.,][0-9]+)?$'
    GROUP BY periodo, valor
    ORDER BY periodo ASC, n DESC
  `, params);
}

// ─────────────────────────────────────────────────────────────────────────────
// FAMÍLIA CATEGÓRICA
// ─────────────────────────────────────────────────────────────────────────────

export async function categoricoFrequencia(ctx: ContextoAnalise) {
  const { where, params } = buildEnvelope(ctx);

  return blabQuery(`
    SELECT
      valor                                                         AS categoria,
      COUNT(*)                                                      AS frequencia,
      ROUND(COUNT(*) * 100.0 / SUM(COUNT(*)) OVER (), 1)           AS pct
    FROM DW_FAT_RESULTADO
    WHERE ${where}
    GROUP BY valor
    ORDER BY frequencia DESC
    LIMIT 50
  `, params);
}

export async function categoricoSerieTemporal(ctx: ContextoAnalise) {
  const { where, params } = buildEnvelope(ctx);
  const gran = resolverGranularidade(ctx.dataInicio, ctx.dataFim);
  const fmt = DATE_FORMAT[gran];

  return blabQuery(`
    SELECT
      DATE_FORMAT(data_resultado, '${fmt}') AS periodo,
      valor                                 AS categoria,
      COUNT(*)                              AS n
    FROM DW_FAT_RESULTADO
    WHERE ${where}
    GROUP BY periodo, valor
    ORDER BY periodo ASC, n DESC
  `, params);
}

function resolveSkipLote(codSkipLote?: string | string[]) {
  const skipLotes = Array.isArray(codSkipLote)
    ? codSkipLote
    : codSkipLote ? [codSkipLote] : null;

  if (!skipLotes || skipLotes.length === 0) {
    return { sql: '(? IS NULL OR FALSE)', params: [null] };
  }
  const placeholders = skipLotes.map(() => '?').join(', ');
  return { sql: `(? IS NULL OR cod_skip_lote IN (${placeholders}))`, params: [null, ...skipLotes] };
}

export async function numericoComparacao(params: any) {
  if (params.modo === 'ranges') {
    const { periodo1, periodo2, codProduto, codEnsaio, codCentroCusto, codBem, codSkipLote, numBins = 10 } = params;

    const skipLoteResult = resolveSkipLote(codSkipLote);
    const commonSql = `
      AND cod_produto = ?
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND (? IS NULL OR cod_bem = ?)
      AND ${skipLoteResult.sql}
    `;
    const commonParams = [
      codProduto,
      codEnsaio,
      codCentroCusto,
      codBem,
      codBem,
      ...skipLoteResult.params,
    ];

    // Query 1: Serie 1
    const sqlSerie1 = `
      SELECT
        DATE_FORMAT(data_resultado, '%Y-%m-%d')          AS data,
        CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))  AS valor_num,
        lie,
        lse
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND data_resultado BETWEEN ? AND ?
      ORDER BY data_resultado ASC
    `;
    const paramsSerie1 = [...commonParams, periodo1.inicio, periodo1.fim];

    // Query 2: Serie 2
    const sqlSerie2 = `
      SELECT
        DATE_FORMAT(data_resultado, '%Y-%m-%d')          AS data,
        CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))  AS valor_num,
        lie,
        lse
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND data_resultado BETWEEN ? AND ?
      ORDER BY data_resultado ASC
    `;
    const paramsSerie2 = [...commonParams, periodo2.inicio, periodo2.fim];

    // Query 3: Estatisticas
    const sqlStats = `
      SELECT
        CASE
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_1'
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_2'
        END                                                             AS periodo,
        COUNT(*)                                                        AS n,
        ROUND(AVG(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4)   AS media,
        ROUND(STDDEV(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4) AS desvio,
        ROUND(MIN(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4)   AS minimo,
        ROUND(MAX(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4)   AS maximo,
        ROUND(SUM(conformidade = 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_conforme,
        MIN(CAST(REPLACE(lie,',','.') AS DECIMAL(10,4)))               AS lie,
        MIN(CAST(REPLACE(lse,',','.') AS DECIMAL(10,4)))               AS lse
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND (
          data_resultado BETWEEN ? AND ?
          OR
          data_resultado BETWEEN ? AND ?
        )
      GROUP BY periodo
    `;
    const paramsStats = [
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      ...commonParams,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
    ];

    // Query 4: Histograma (using IF for zero division protection)
    const sqlHistogram = `
      WITH bounds AS (
        SELECT
          MIN(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))) AS vmin,
          MAX(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))) AS vmax
        FROM DW_FAT_RESULTADO
        WHERE D_E_L_E_T IS NULL
          AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
          ${commonSql}
          AND (
            data_resultado BETWEEN ? AND ?
            OR data_resultado BETWEEN ? AND ?
          )
      )
      SELECT
        CASE
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_1'
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_2'
        END AS periodo,
        LEAST(
          FLOOR((CAST(REPLACE(dw.valor,',','.') AS DECIMAL(10,4)) - b.vmin)
            / IF(b.vmax - b.vmin = 0, 1, (b.vmax - b.vmin) / ?)),
          ? - 1
        )                                                              AS bin_idx,
        ROUND(b.vmin + FLOOR((CAST(REPLACE(dw.valor,',','.') AS DECIMAL(10,4)) - b.vmin)
          / IF(b.vmax - b.vmin = 0, 1, (b.vmax - b.vmin) / ?))
          * ((b.vmax - b.vmin) / ?), 4)                        AS bin_inicio,
        COUNT(*)                                                       AS frequencia
      FROM DW_FAT_RESULTADO dw, bounds b
      WHERE D_E_L_E_T IS NULL
        AND dw.valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        ${commonSql}
        AND (
          data_resultado BETWEEN ? AND ?
          OR data_resultado BETWEEN ? AND ?
        )
      GROUP BY periodo, bin_idx, bin_inicio
      ORDER BY periodo, bin_idx
    `;
    const paramsHistogram = [
      ...commonParams,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      numBins, numBins, numBins, numBins,
      ...commonParams,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
    ];

    const [serie1, serie2, estatisticas, histograma] = await Promise.all([
      blabQuery(sqlSerie1, paramsSerie1),
      blabQuery(sqlSerie2, paramsSerie2),
      blabQuery(sqlStats, paramsStats),
      blabQuery(sqlHistogram, paramsHistogram),
    ]);

    return { serie1, serie2, estatisticas, histograma };

  } else {
    // granularidade
    const { dataInicio, dataFim, granularidade, codProduto, codEnsaio, codCentroCusto, codBem, codSkipLote } = params;

    const formatoMap: Record<string, string> = {
      dia: '%Y-%m-%d',
      semana: '%x-W%v',
      mes: '%Y-%m',
      ano: '%Y',
    };

    const selectPeriodo = granularidade === 'trimestre'
      ? `CONCAT(YEAR(data_resultado), '-Q', QUARTER(data_resultado))`
      : `DATE_FORMAT(data_resultado, '${formatoMap[granularidade]}')`;

    const skipLoteResult = resolveSkipLote(codSkipLote);
    const commonSql = `
      AND cod_produto = ?
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND (? IS NULL OR cod_bem = ?)
      AND ${skipLoteResult.sql}
    `;
    const commonParams = [
      codProduto,
      codEnsaio,
      codCentroCusto,
      codBem,
      codBem,
      ...skipLoteResult.params,
    ];

    const sql = `
      SELECT
        ${selectPeriodo}                                                AS periodo,
        COUNT(*)                                                        AS n,
        ROUND(AVG(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4)   AS media,
        ROUND(STDDEV(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4) AS desvio,
        ROUND(MIN(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4)   AS minimo,
        ROUND(MAX(CAST(REPLACE(valor,',','.') AS DECIMAL(10,4))), 4)   AS maximo,
        ROUND(SUM(conformidade = 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_conforme,
        MIN(CAST(REPLACE(lie,',','.') AS DECIMAL(10,4)))               AS lie,
        MIN(CAST(REPLACE(lse,',','.') AS DECIMAL(10,4)))               AS lse
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND data_resultado BETWEEN ? AND ?
      GROUP BY periodo
      ORDER BY periodo ASC
    `;
    const dbParams = [...commonParams, dataInicio, dataFim];

    return blabQuery(sql, dbParams);
  }
}

export async function faixaComparacao(params: any) {
  if (params.modo === 'ranges') {
    const { periodo1, periodo2, codProduto, codEnsaio, codCentroCusto, codBem, codSkipLote } = params;

    const skipLoteResult = resolveSkipLote(codSkipLote);
    const commonSql = `
      AND cod_produto = ?
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND (? IS NULL OR cod_bem = ?)
      AND ${skipLoteResult.sql}
    `;
    const commonParams = [
      codProduto,
      codEnsaio,
      codCentroCusto,
      codBem,
      codBem,
      ...skipLoteResult.params,
    ];

    const sql = `
      SELECT
        CASE
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_1'
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_2'
        END                  AS periodo,
        valor                AS faixa,
        COUNT(*)             AS frequencia,
        ROUND(COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (
          PARTITION BY CASE
            WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_1'
            WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_2'
          END
        ) * 100, 1)          AS pct
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?\\\\s*[-/]\\\\s*-?[0-9]+([.,][0-9]+)?$'
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND (
          data_resultado BETWEEN ? AND ?
          OR data_resultado BETWEEN ? AND ?
        )
      GROUP BY periodo, faixa
      ORDER BY periodo, frequencia DESC
    `;
    const dbParams = [
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      ...commonParams,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
    ];

    return blabQuery(sql, dbParams);

  } else {
    // granularidade
    const { dataInicio, dataFim, granularidade, codProduto, codEnsaio, codCentroCusto, codBem, codSkipLote } = params;

    const formatoMap: Record<string, string> = {
      dia: '%Y-%m-%d',
      semana: '%x-W%v',
      mes: '%Y-%m',
      ano: '%Y',
    };

    const selectPeriodo = granularidade === 'trimestre'
      ? `CONCAT(YEAR(data_resultado), '-Q', QUARTER(data_resultado))`
      : `DATE_FORMAT(data_resultado, '${formatoMap[granularidade]}')`;

    const skipLoteResult = resolveSkipLote(codSkipLote);
    const commonSql = `
      AND cod_produto = ?
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND (? IS NULL OR cod_bem = ?)
      AND ${skipLoteResult.sql}
    `;
    const commonParams = [
      codProduto,
      codEnsaio,
      codCentroCusto,
      codBem,
      codBem,
      ...skipLoteResult.params,
    ];

    const sql = `
      SELECT
        ${selectPeriodo} AS periodo,
        valor                                     AS faixa,
        COUNT(*)                                  AS frequencia,
        ROUND(COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (
          PARTITION BY ${selectPeriodo}
        ) * 100, 1)                               AS pct_no_periodo
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?\\\\s*[-/]\\\\s*-?[0-9]+([.,][0-9]+)?$'
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND data_resultado BETWEEN ? AND ?
      GROUP BY periodo, faixa
      ORDER BY periodo ASC, frequencia DESC
    `;
    const dbParams = [...commonParams, dataInicio, dataFim];

    return blabQuery(sql, dbParams);
  }
}

export async function categoricoComparacao(params: any) {
  if (params.modo === 'ranges') {
    const { periodo1, periodo2, codProduto, codEnsaio, codCentroCusto, codBem, codSkipLote } = params;

    const skipLoteResult = resolveSkipLote(codSkipLote);
    const commonSql = `
      AND cod_produto = ?
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND (? IS NULL OR cod_bem = ?)
      AND ${skipLoteResult.sql}
    `;
    const commonParams = [
      codProduto,
      codEnsaio,
      codCentroCusto,
      codBem ?? null,
      codBem,
      ...skipLoteResult.params,
    ];

    // Query 1: Frequência por categoria nos dois períodos
    const sqlFreq = `
      SELECT
        CASE
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_1'
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_2'
        END                  AS periodo,
        valor                AS categoria,
        COUNT(*)             AS frequencia,
        ROUND(COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (
          PARTITION BY CASE
            WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_1'
            WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_2'
          END
        ) * 100, 1)          AS pct
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND (
          data_resultado BETWEEN ? AND ?
          OR data_resultado BETWEEN ? AND ?
        )
      GROUP BY periodo, categoria
      ORDER BY periodo, frequencia DESC
    `;
    const paramsFreq = [
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      ...commonParams,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
    ];

    // Query 2: Estatísticas de conformidade por período
    const sqlConf = `
      SELECT
        CASE
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_1'
          WHEN data_resultado BETWEEN ? AND ? THEN 'periodo_2'
        END                                                             AS periodo,
        COUNT(*)                                                        AS total,
        SUM(conformidade = 'CONFORME')                                  AS n_conforme,
        SUM(conformidade != 'CONFORME')                                 AS n_nao_conforme,
        ROUND(SUM(conformidade = 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_conforme
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND (
          data_resultado BETWEEN ? AND ?
          OR data_resultado BETWEEN ? AND ?
        )
      GROUP BY periodo
    `;
    const paramsConf = [
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
      ...commonParams,
      periodo1.inicio, periodo1.fim,
      periodo2.inicio, periodo2.fim,
    ];

    const [frequencia, conformidade] = await Promise.all([
      blabQuery(sqlFreq, paramsFreq),
      blabQuery(sqlConf, paramsConf),
    ]);

    return { frequencia, conformidade };

  } else {
    // granularidade
    const { dataInicio, dataFim, granularidade, codProduto, codEnsaio, codCentroCusto, codBem, codSkipLote } = params;

    const formatoMap: Record<string, string> = {
      dia: '%Y-%m-%d',
      semana: '%x-W%v',
      mes: '%Y-%m',
      ano: '%Y',
    };

    const selectPeriodo = granularidade === 'trimestre'
      ? `CONCAT(YEAR(data_resultado), '-Q', QUARTER(data_resultado))`
      : `DATE_FORMAT(data_resultado, '${formatoMap[granularidade]}')`;

    const skipLoteResult = resolveSkipLote(codSkipLote);
    const commonSql = `
      AND cod_produto = ?
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND (? IS NULL OR cod_bem = ?)
      AND ${skipLoteResult.sql}
    `;
    const commonParams = [
      codProduto,
      codEnsaio,
      codCentroCusto,
      codBem,
      codBem,
      ...skipLoteResult.params,
    ];

    const sql = `
      SELECT
        ${selectPeriodo}                                                AS periodo,
        valor                                                           AS categoria,
        COUNT(*)                                                        AS frequencia,
        ROUND(COUNT(*) * 1.0 / SUM(COUNT(*)) OVER (
          PARTITION BY ${selectPeriodo}
        ) * 100, 1)                                                     AS pct_no_periodo
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND LENGTH(data_resultado) = 10
        AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
        ${commonSql}
        AND data_resultado BETWEEN ? AND ?
      GROUP BY periodo, categoria
      ORDER BY periodo ASC, frequencia DESC
    `;
    const dbParams = [...commonParams, dataInicio, dataFim];

    return blabQuery(sql, dbParams);
  }
}

export async function getAmostrasPorBin(ctx: ContextoAnalise, binInicio: number, binFim: number) {
  const { where, params } = buildEnvelope(ctx);

  return blabQuery(`
    SELECT
      cod_amostra,
      numero_de_controle,
      lote_de_controle_de_qualidade,
      valor,
      lie,
      lse,
      conformidade,
      data_resultado,
      hora_resultado
    FROM DW_FAT_RESULTADO
    WHERE ${where}
      AND valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
      AND CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4)) >= ?
      AND CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4)) <= ?
    ORDER BY data_resultado ASC, hora_resultado ASC
    LIMIT 200
  `, [...params, binInicio, binFim]);
}

// ─────────────────────────────────────────────────────────────────────────────
// DASHBOARD — KPIs e rankings por categoria
// ─────────────────────────────────────────────────────────────────────────────

export interface FiltroPeriodo {
  dataInicio: string;
  dataFim:    string;
}

// 1. KPIs globais — amostras, ensaios, NCs, conformidade do período + comparação com período anterior
export async function getKpisDashboard(periodo: FiltroPeriodo) {
  const inicio = new Date(periodo.dataInicio);
  const fim    = new Date(periodo.dataFim);
  const dias   = Math.ceil((fim.getTime() - inicio.getTime()) / 86400000);

  const fimAnterior    = new Date(inicio.getTime() - 86400000);
  const inicioAnterior = new Date(fimAnterior.getTime() - dias * 86400000);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const rows = await blabQuery<{
    periodo: 'atual' | 'anterior';
    amostras: number;
    ensaios: number;
    nao_conformidades: number;
    pct_conformidade: number;
  }>(`
    SELECT
      CASE
        WHEN data_resultado BETWEEN ? AND ? THEN 'atual'
        ELSE 'anterior'
      END                                                                   AS periodo,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      COUNT(*)                                                             AS ensaios,
      SUM(conformidade != 'CONFORME')                                      AS nao_conformidades,
      ROUND(SUM(conformidade = 'CONFORME') * 100.0 / COUNT(*), 1)         AS pct_conformidade
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND (
        data_resultado BETWEEN ? AND ?
        OR data_resultado BETWEEN ? AND ?
      )
    GROUP BY periodo
  `, [
    periodo.dataInicio, periodo.dataFim,        // CASE
    periodo.dataInicio, periodo.dataFim,        // WHERE atual
    fmt(inicioAnterior), fmt(fimAnterior),      // WHERE anterior
  ]);

  const atual    = rows.find(r => r.periodo === 'atual');
  const anterior = rows.find(r => r.periodo === 'anterior');

  function delta(a: number | undefined, b: number | undefined) {
    if (!a || !b) return null;
    return Number((((a - b) / b) * 100).toFixed(1));
  }

  return {
    amostras:          { valor: atual?.amostras ?? 0,          deltaPct: delta(atual?.amostras, anterior?.amostras) },
    ensaios:           { valor: atual?.ensaios ?? 0,           deltaPct: delta(atual?.ensaios, anterior?.ensaios) },
    naoConformidades:  { valor: atual?.nao_conformidades ?? 0, deltaPct: delta(atual?.nao_conformidades, anterior?.nao_conformidades) },
    conformidade:      { valor: atual?.pct_conformidade ?? 0,  meta: 98.0 },
  };
}

// 2. Ranking por processo (centro de custo)
export async function getRankingProcessos(periodo: FiltroPeriodo, limit = 10) {
  const rows = await blabQuery<any>(`
    SELECT
      cod_centro_de_custo                                                  AS id,
      centro_de_custo                                                      AS nome,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      SUM(CASE WHEN conformidade != 'CONFORME' THEN 1 ELSE 0 END)         AS nc
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND cod_centro_de_custo IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_centro_de_custo, centro_de_custo
    ORDER BY nc DESC
    LIMIT ?
  `, [periodo.dataInicio, periodo.dataFim, limit]);

  return rows.map(r => ({
    id:       Number(r.id),
    nome:     r.nome,
    amostras: Number(r.amostras),
    nc:       Number(r.nc),
  }));
}

// 3. Ranking por produto
export async function getRankingProdutos(periodo: FiltroPeriodo, limit = 10) {
  const rows = await blabQuery<any>(`
    SELECT
      cod_produto                                                          AS id,
      produto                                                              AS nome,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      SUM(CASE WHEN conformidade != 'CONFORME' THEN 1 ELSE 0 END)         AS nc
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND cod_produto IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_produto, produto
    ORDER BY nc DESC
    LIMIT ?
  `, [periodo.dataInicio, periodo.dataFim, limit]);

  return rows.map(r => ({
    id:       Number(r.id),
    nome:     r.nome,
    amostras: Number(r.amostras),
    nc:       Number(r.nc),
  }));
}

// 4. Ranking por ensaio
export async function getRankingEnsaios(periodo: FiltroPeriodo, limit = 10) {
  const rows = await blabQuery<any>(`
    SELECT
      cod_ensaio                                                           AS id,
      ensaio                                                               AS nome,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      SUM(CASE WHEN conformidade != 'CONFORME' THEN 1 ELSE 0 END)         AS nc
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND cod_ensaio IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_ensaio, ensaio
    ORDER BY nc DESC
    LIMIT ?
  `, [periodo.dataInicio, periodo.dataFim, limit]);

  return rows.map(r => ({
    id:       Number(r.id),
    nome:     r.nome,
    amostras: Number(r.amostras),
    nc:       Number(r.nc),
  }));
}
