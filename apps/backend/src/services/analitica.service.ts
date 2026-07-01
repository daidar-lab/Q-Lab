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
        AND conformidade != 'NÃO AVALIADO'
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
        AND conformidade != 'NÃO AVALIADO'
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
        AND conformidade != 'NÃO AVALIADO'
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
  dataFim: string;
}

// 1. KPIs globais — Otimizados: removido o período anterior para economizar processamento
export async function getKpisDashboard(periodo: FiltroPeriodo) {
  // Executa uma query direta e linear (Sem GROUP BY e sem varrer o passado)
  const rows = await blabQuery<{
    amostras: number;
    ensaios: number;
    informativos: number;
    nao_conformidades: number;
    pct_conformidade: number;
  }>(`
    SELECT
      COUNT(DISTINCT cod_amostra)                                         AS amostras,
      COUNT(*)                                                            AS ensaios,
      SUM(conformidade = 'NÃO AVALIADO')                                  AS informativos,
      SUM(conformidade = 'NÃO CONFORME')                                  AS nao_conformidades,
      ROUND(
        SUM(conformidade = 'CONFORME') * 100.0 / 
        NULLIF(COUNT(*) - SUM(conformidade = 'NÃO AVALIADO'), 0), 
        1
      )                                                                   AS pct_conformidade
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL 
      AND data_resultado BETWEEN ? AND ?
  `, [periodo.dataInicio, periodo.dataFim]);

  const atual = rows[0]; // Como não tem GROUP BY, sempre retorna exatamente 1 linha

  return {
    amostras: { valor: Number(atual?.amostras ?? 0), deltaPct: null },
    ensaios: { valor: Number(atual?.ensaios ?? 0), deltaPct: null },
    informativos: { valor: Number(atual?.informativos ?? 0), deltaPct: null },
    naoConformidades: { valor: Number(atual?.nao_conformidades ?? 0), deltaPct: null },
    conformidade: { valor: Number(atual?.pct_conformidade ?? 0), meta: 95.0 },
  };
}
/**
 * Traduz um id (numérico ou slug de sub-processo) para o fragmento WHERE
 * correto no DW_FAT_RESULTADO.
 *
 * Retorna { sql, params } prontos para interpolação segura via prepared statements.
 *
 * Ordem de resolução:
 *   1. Slugs Grupo A — filtro direto por coluna do DW (skip_lote, produto, etc.)
 *   2. Slugs Grupo B — filtro por prefixo de lote_de_controle_de_qualidade
 *   3. Fallback numérico — cod_centro_de_custo = ? (comportamento original)
 */
export function resolverFiltroPorId(id: string | number): { sql: string; params: unknown[] } {
  const idStr = String(id);

  // ── Grupo A: filtro direto no DW ──────────────────────────────────────────
  const slugDireto: Record<string, { sql: string; params: unknown[] }> = {
    'fermento': {
      sql: `cod_skip_lote IN ('68', '69')`,
      params: [],
    },
    'residuos': {
      sql: `cod_produto IN (303, 304)`,
      params: [],
    },
    'ar-co2': {
      sql: `cod_produto IN (153, 160) AND cod_laboratorio NOT IN (5, 17, 6, 20)`,
      params: [],
    },
    'co2-beneficiado': {
      // CO2 beneficiado é ancorado em FAT_LAUDO — sem filtro direto no DW por produto.
      // Usar lote prefixo LCQCO2 se existir, caso contrário tratar como sem filtro específico.
      // ATENÇÃO: validar prefixo real no banco antes de usar em produção.
      sql: `lote_de_controle_de_qualidade LIKE 'LCQCO2%'`,
      params: [],
    },
    'microbiologia-estabilidade-micro': {
      sql: `(cod_skip_lote NOT IN ('36', '54') OR cod_skip_lote IS NULL)
            AND lote_de_controle_de_qualidade LIKE 'LCQMB%'`,
      params: [],
    },
    'microbiologia-estabilidade-envase': {
      sql: `cod_skip_lote IN ('36', '54')
            AND lote_de_controle_de_qualidade LIKE 'LCQMB%'`,
      params: [],
    },
    'microbiologia-agua-enxague': {
      sql: `cod_produto = 15`,
      params: [],
    },
    'microbiologia-swab': {
      sql: `cod_produto = 14`,
      params: [],
    },
    // Envase auxiliares — ancorados via cod_atributo_da_amostra = 36.
    // No DW, identificados pelo campo operacao (vindo do ponto de coleta).
    'envase-arrolhamento': {
      sql: `operacao LIKE '%ARROLHAMENTO%'`,
      params: [],
    },
    'envase-assoprador': {
      sql: `operacao LIKE '%ASSOPRADOR%'`,
      params: [],
    },
    'envase-lubrificante': {
      sql: `operacao LIKE '%LUBRIFICANTE%'`,
      params: [],
    },
    'envase-recravacao': {
      sql: `operacao LIKE '%RECRAVAÇÃO%'`,
      params: [],
    },
    'envase-pasteurizador': {
      sql: `operacao LIKE '%PASTEURIZ%'`,
      params: [],
    },
    'envase-chopp': {
      sql: `cod_centro_de_custo = 450050`,
      params: [],
    },
    // CIP — amostras realizadas nos laboratórios de CIP (não âncora via lote)
    'cip': {
      sql: `cod_laboratorio IN (1, 4, 15, 16, 25)`,
      params: [],
    },
  };

  if (slugDireto[idStr]) return slugDireto[idStr];

  // ── Grupo B: prefixo de lote_de_controle_de_qualidade ────────────────────
  // Atenção à ordem: mais específico primeiro (LCQFI antes de LCQF, LCQCP antes de LCQC)
  const prefixMap: Record<string, string> = {
    'filtracao': 'LCQFI',   // deve vir antes de fermentacao
    'fermentacao': 'LCQF',
    'brassagem': 'LCQB',
    'maturacao': 'LCQM',
    'desalcoolizacao': 'LCQD',
    'captacao': 'LCQCP',   // deve vir antes de cip
    'tratamento-efluentes': 'LCQTE',
    // 'cip' foi movido para slugDireto (cod_laboratorio) — sem âncora via lote
    'envase-produto-acabado': 'LCQE',
    'microbiologia-resultados': 'LCQMB',
    'envase-interunidades': 'LCQE',    // mesma âncora do produto acabado, skip_lote diferencia
  };

  if (prefixMap[idStr]) {
    return {
      sql: `lote_de_controle_de_qualidade LIKE ?`,
      params: [`${prefixMap[idStr]}%`],
    };
  }

  // ── Fallback numérico — comportamento original (cod_centro_de_custo) ──────
  return {
    sql: `cod_centro_de_custo = ?`,
    params: [Number(id)],
  };
}

// 2. Ranking por processo — 3 queries: âncoras → amostras → DW agregado
// ─── Labels legíveis por categoria ───────────────────────────────────────────
const LABELS_CATEGORIA: Record<string, string> = {
  // Fermento
  'fermento': 'Fermento',

  // Microbiologia
  'microbiologia-estabilidade-micro': 'Estabilidade Biológica Micro',
  'microbiologia-estabilidade-envase': 'Estabilidade Biológica Envase',
  'microbiologia-resultados': 'Resultados Microbiológicos',
  'microbiologia-agua-enxague': 'Água de Enxague',
  'microbiologia-swab': 'SWAB',

  // Envase
  'envase-produto-acabado': 'Produto Acabado',
  'envase-chopp': 'Chopp',
  'envase-arrolhamento': 'Arrolhamento',
  'envase-assoprador': 'Assoprador',
  'envase-lubrificante': 'Lubrificante de Esteira',
  'envase-recravacao': 'Recravação',
  'envase-pasteurizador': 'Pasteurizador',
  'envase-interunidades': 'Produto Interunidades',

  // Processo
  'fermentacao': 'Fermentação',
  'filtracao': 'Filtração',
  'brassagem': 'Brassagem',
  'maturacao': 'Maturação',
  'desalcoolizacao': 'Desalcoolização',
  'captacao': 'Captação',
  'tratamento-efluentes': 'Tratamento de Efluentes',
  'residuos': 'Resíduos',
  'ar-co2': 'Ar Comprimido e CO2',
  'co2-beneficiado': 'CO2 Beneficiado',

  // CIP
  'cip': 'CIP',
  'cip-envasamento': 'CIP — Envasamento',
  'cip-processo': 'CIP — Processo',

  // Físico
  'fisico-embalagem': 'Físico — Embalagem',
  'fisico-materia-prima': 'Físico — Matéria-Prima',
  'fisico-quimicos': 'Físico — Químicos',
};



function ph(arr: string[]): string {
  return arr.map(() => '?').join(', ');
}

export async function getRankingProcessos(
  periodo: FiltroPeriodo,
): Promise<{ id: string; nome: string; amostras: number; nc: number }[]> {

  const { dataInicio: di, dataFim: df } = periodo;

  // ─── QUERY 1 — Obter lotes ativos no período diretamente do DW ───────────
  // Para evitar locks, fazemos uma leitura rápida indexada por data.
  // Isso resolve problemas de lotes iniciados antes do período filtrado.
  const q1Rows = await blabQuery<{ categoria: string; chave: string }>(`
    SELECT DISTINCT
      CASE
        WHEN lote_de_controle_de_qualidade LIKE 'LCQFI%' THEN 'filtracao'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQF%'  THEN 'fermentacao'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQB%'  THEN 'brassagem'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQM%'  THEN 'maturacao'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQD%'  THEN 'desalcoolizacao'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQCP%' THEN 'captacao'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQTE%' THEN 'tratamento-efluentes'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQC%'  THEN 'cip'
      END AS categoria,
      CAST(lote_de_controle_de_qualidade AS CHAR) AS chave
    FROM DW_FAT_RESULTADO
    WHERE data_resultado BETWEEN ? AND ?
      AND D_E_L_E_T IS NULL
      AND lote_de_controle_de_qualidade LIKE 'LCQ%'
  `, [di, df]);



  // Agrupar lotes por categoria
  const lotesPorCat: Record<string, string[]> = {};
  for (const row of q1Rows) {
    if (!lotesPorCat[row.categoria]) lotesPorCat[row.categoria] = [];
    lotesPorCat[row.categoria].push(row.chave);
  }
  // Dedup por categoria
  for (const cat of Object.keys(lotesPorCat)) {
    lotesPorCat[cat] = [...new Set(lotesPorCat[cat])];
  }

  const lotesCip = lotesPorCat['cip'] ?? [];

  // ─── QUERY 1b — Âncora Físico: resolve cod_cabecalho_de_especificacao ──────
  const q1bRows = await blabQuery<{ categoria: string; chave: string }>(`
    SELECT
        CASE
            WHEN PL.evento LIKE '%embalagem%'     THEN 'fisico-embalagem'
            WHEN PL.evento LIKE '%matéria prima%' THEN 'fisico-materia-prima'
            WHEN PL.evento LIKE '%Químicos%'      THEN 'fisico-quimicos'
        END AS categoria,
        CAST(ESPC.cod_cabecalho_de_especificacao AS CHAR) AS chave
    FROM DIM_PLANEJAMENTO_DE_CRIACAO PL
    INNER JOIN DIM_PLANEJAMENTO_DE_CRIACAO_X_CABECALHO_DE_ESPECIFICACAO ESPC
        ON ESPC.cod_planejamento_de_criacao = PL.cod_planejamento_de_criacao
    WHERE PL.D_E_L_E_T IS NULL
    AND ESPC.D_E_L_E_T IS NULL
    AND (
        PL.evento LIKE '%embalagem%'
        OR PL.evento LIKE '%matéria prima%'
        OR PL.evento LIKE '%Químicos%'
    )
  `, []);

  const cabecalhosPorCat: Record<string, string[]> = {};
  for (const row of q1bRows) {
    if (!row.categoria) continue;
    if (!cabecalhosPorCat[row.categoria]) cabecalhosPorCat[row.categoria] = [];
    cabecalhosPorCat[row.categoria].push(row.chave);
  }
  for (const cat of Object.keys(cabecalhosPorCat)) {
    cabecalhosPorCat[cat] = [...new Set(cabecalhosPorCat[cat])];
  }

  // ─── QUERY 2 — Resolução de cod_amostra para CIP e Físico ────────────────
  const amostrasPorCat: Record<string, string[]> = {};

  // CIP — identificado por laboratório CIP (cod_laboratorio IN 1,4,15,16,25) + período.
  // Não depende de lotes da Query 1: roda sempre que o período for válido.
  {
    const cipRows = await blabQuery<{ cod_amostra: string }>(`
      SELECT DISTINCT CAST(A.cod_amostra AS CHAR) AS cod_amostra
      FROM FAT_AMOSTRA A
      WHERE A.cod_laboratorio IN (1, 4, 15, 16, 25)
      AND A.data_da_coleta BETWEEN ? AND ?
      AND A.D_E_L_E_T IS NULL
    `, [di, df]);
    amostrasPorCat['cip'] = cipRows.map(r => String(r.cod_amostra)).filter(Boolean);
  }

  // Físico — via FAT_AMOSTRA com cod_cabecalho_de_especificacao por sub-categoria
  for (const catFisico of ['fisico-embalagem', 'fisico-materia-prima', 'fisico-quimicos'] as const) {
    const cabs = cabecalhosPorCat[catFisico] ?? [];
    if (cabs.length === 0) continue;
    const fisicoRows = await blabQuery<{ cod_amostra: string }>(`
      SELECT DISTINCT CAST(A.cod_amostra AS CHAR) AS cod_amostra
      FROM FAT_AMOSTRA A
      WHERE A.cod_cabecalho_de_especificacao IN (${ph(cabs)})
      AND A.data_da_coleta BETWEEN ? AND ?
      AND A.D_E_L_E_T IS NULL
    `, [...cabs, di, df]);
    amostrasPorCat[catFisico] = fisicoRows.map(r => String(r.cod_amostra)).filter(Boolean);
  }

  // ─── QUERY 3 — Agregação final no DW_FAT_RESULTADO ───────────────────────
  // Monta os fragmentos condicionais do CASE WHEN dinamicamente para evitar
  // cláusulas IN () vazias que causariam erro de sintaxe SQL.

  type CasePart = { sql: string; params: string[] };
  const caseParts: CasePart[] = [];

  // Grupo A — filtro direto (sem dependência de âncora)
  caseParts.push({ sql: `WHEN cod_skip_lote IN ('68', '69') THEN 'fermento'`, params: [] });
  caseParts.push({
    sql: `WHEN (cod_skip_lote NOT IN ('36', '54') OR cod_skip_lote IS NULL) AND lote_de_controle_de_qualidade LIKE 'LCQMB%' THEN 'microbiologia-estabilidade-micro'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN cod_skip_lote IN ('36', '54') AND lote_de_controle_de_qualidade LIKE 'LCQMB%' THEN 'microbiologia-estabilidade-envase'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN lote_de_controle_de_qualidade LIKE 'LCQE%' AND cod_skip_lote = '33' THEN 'envase-produto-acabado'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN cod_centro_de_custo = 450050 THEN 'envase-chopp'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN operacao LIKE '%ARROLHAMENTO%' THEN 'envase-arrolhamento'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN operacao LIKE '%ASSOPRADOR%' THEN 'envase-assoprador'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN operacao LIKE '%LUBRIFICANTE%' THEN 'envase-lubrificante'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN operacao LIKE '%RECRAVAÇÃO%' THEN 'envase-recravacao'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN operacao LIKE '%PASTEURIZ%' THEN 'envase-pasteurizador'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN cod_amostra_interunidade IS NOT NULL THEN 'envase-interunidades'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN cod_produto IN (303, 304) THEN 'residuos'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN cod_produto IN (153, 160) AND cod_laboratorio NOT IN (5, 17, 6, 20) THEN 'ar-co2'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN cod_produto = 15 THEN 'microbiologia-agua-enxague'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN cod_produto = 14 THEN 'microbiologia-swab'`,
    params: [],
  });
  caseParts.push({
    sql: `WHEN lote_de_controle_de_qualidade LIKE 'LCQMB%' THEN 'microbiologia-resultados'`,
    params: [],
  });

  // Grupo B simples — lotes resolvidos na Query 1
  const gruposB: [string, string][] = [
    ['fermentacao', 'fermentacao'],
    ['filtracao', 'filtracao'],
    ['brassagem', 'brassagem'],
    ['maturacao', 'maturacao'],
    ['desalcoolizacao', 'desalcoolizacao'],
    ['captacao', 'captacao'],
    ['tratamento-efluentes', 'tratamento-efluentes'],
  ];
  for (const [cat, label] of gruposB) {
    const lotes = lotesPorCat[cat] ?? [];
    if (lotes.length === 0) continue;
    caseParts.push({
      sql: `WHEN lote_de_controle_de_qualidade IN (${ph(lotes)}) THEN '${label}'`,
      params: lotes,
    });
  }

  // CIP e Físico — amostras resolvidas na Query 2
  for (const [cat] of [
    ['cip'],
    ['fisico-embalagem'],
    ['fisico-materia-prima'],
    ['fisico-quimicos'],
  ] as [string][]) {
    const amostras = amostrasPorCat[cat] ?? [];
    if (amostras.length === 0) continue;
    caseParts.push({
      sql: `WHEN cod_amostra IN (${ph(amostras)}) THEN '${cat}'`,
      params: amostras,
    });
  }

  if (caseParts.length === 0) return [];

  const caseWhenSql = caseParts.map(p => p.sql).join('\n            ');
  const caseParams = caseParts.flatMap(p => p.params);

  const q3Rows = await blabQuery<{ categoria: string; amostras: number; nc: number }>(`
    SELECT
        categoria,
        COUNT(DISTINCT cod_amostra) AS amostras,
        SUM(CASE WHEN conformidade = 'NÃO CONFORME' THEN 1 ELSE 0 END) AS nc
    FROM (
        SELECT
            cod_amostra,
            conformidade,
            CASE
                ${caseWhenSql}
            END AS categoria
        FROM DW_FAT_RESULTADO
        WHERE data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
        AND valor IS NOT NULL AND valor != ''
        AND (conformidade = 'CONFORME' OR conformidade = 'NÃO CONFORME')
    ) X
    WHERE categoria IS NOT NULL
    GROUP BY categoria
  `, [...caseParams, di, df]);

  return q3Rows
    .map(r => ({
      id: r.categoria,
      nome: LABELS_CATEGORIA[r.categoria] ?? r.categoria,
      amostras: Number(r.amostras),
      nc: Number(r.nc),
    }))
    .sort((a, b) => b.nc - a.nc);
}

// 3. Ranking por produto
export async function getRankingProdutos(periodo: FiltroPeriodo, limit = 20) {
  const rows = await blabQuery<any>(`
    SELECT
      cod_produto                                                          AS id,
      produto                                                              AS nome,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      SUM(CASE WHEN conformidade != 'CONFORME' THEN 1 ELSE 0 END)         AS nc
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND (conformidade = 'CONFORME' OR conformidade = 'NÃO CONFORME')
      AND cod_produto IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_produto, produto
    ORDER BY nc DESC
    LIMIT ?
  `, [periodo.dataInicio, periodo.dataFim, limit]);

  return rows.map(r => ({
    id: Number(r.id),
    nome: r.nome,
    amostras: Number(r.amostras),
    nc: Number(r.nc),
  }));
}

// 4. Ranking por ensaio
export async function getRankingEnsaios(periodo: FiltroPeriodo, limit = 20) {
  const rows = await blabQuery<any>(`
    SELECT
      cod_ensaio                                                           AS id,
      ensaio                                                               AS nome,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      SUM(CASE WHEN conformidade != 'CONFORME' THEN 1 ELSE 0 END)         AS nc
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND (conformidade = 'CONFORME' OR conformidade = 'NÃO CONFORME')
      AND cod_ensaio IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_ensaio, ensaio
    ORDER BY nc DESC
    LIMIT ?
  `, [periodo.dataInicio, periodo.dataFim, limit]);

  return rows.map(r => ({
    id: Number(r.id),
    nome: r.nome,
    amostras: Number(r.amostras),
    nc: Number(r.nc),
  }));
}
