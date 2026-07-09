// apps/backend/src/services/analitica.service.ts

import { blabQuery } from '../db/blab.pool';
import { resolverGranularidade } from './inspecao.service';
import type { ContextoAnalise } from '@qlab/types';
import { resolveFilialLaboratorios } from '../utils/filial.helper';



const DATE_FORMAT: Record<string, string> = {
  DAY: '%Y-%m-%d',
  WEEK: '%Y-%u',
  MONTH: '%Y-%m',
};

// ─── Envelope base ────────────────────────────────────────────────────────────

async function buildEnvelope(ctx: ContextoAnalise): Promise<{ where: string; params: unknown[] }> {
  // Resolve cod_laboratorio[] da filial (cacheado em Redis 30min)
  const labs = await resolveFilialLaboratorios(ctx.filialId);

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

  // Filtro de filial via cod_laboratorio (array pré-resolvido)
  if (labs.length > 0) {
    const placeholders = labs.map(() => '?').join(', ');
    conditions.push(`cod_laboratorio IN (${placeholders})`);
    params.push(...labs);
  }

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
  const { where, params } = await buildEnvelope(ctx);
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
  const { where, params } = await buildEnvelope(ctx);

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
  const { where, params } = await buildEnvelope(ctx);

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
  const { where, params } = await buildEnvelope(ctx);

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
  const { where, params } = await buildEnvelope(ctx);

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
  const { where, params } = await buildEnvelope(ctx);
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
  const { where, params } = await buildEnvelope(ctx);

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
  const { where, params } = await buildEnvelope(ctx);
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
  const { where, params } = await buildEnvelope(ctx);

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
  filialId: number;
  dataInicio: string;
  dataFim: string;
}

// 1. KPIs globais — Otimizados: removido o período anterior para economizar processamento
export async function getKpisDashboard(periodo: FiltroPeriodo) {
  const labs = await resolveFilialLaboratorios(periodo.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

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
      ${labFilter}
  `, [periodo.dataInicio, periodo.dataFim, ...labs]);

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
 * 
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
    'envase-provas-horarias': {
      sql: `cod_skip_lote IN ('29', '36', '31', '54') AND cod_laboratorio IN (16, 18, 20, 4, 6, 8, 5)`,
      params: [],
    },
    'envase-assoprador': {
      sql: `cod_operacao = 96`,
      params: [],
    },
    'envase-lubrificante': {
      sql: `produto LIKE '%LUBRIFICANTE%'`,
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
    'envase-produto-acabado': {
      sql: `lote_de_controle_de_qualidade LIKE 'LCQE%'
            AND (cod_skip_lote IN ('33') OR (cod_skip_lote IS NULL AND operacao IN ('EMBALAGEM', 'ENCHIMENTO')))`,
      params: [],
    },
    // CIP — amostras realizadas nos laboratórios de CIP (não âncora via lote)
    'cip-processo': {
      sql: `cod_laboratorio IN (1, 15, 25) AND cod_centro_de_custo IN (450050, 450070, 460000, 430000, 430010, 430020, 410010, 470020)`,
      params: [],
    },
    'cip-envasamento-novo': {
      sql: `cod_laboratorio IN (4, 16, 25) AND cod_centro_de_custo IN (450010, 450060, 450030, 450040, 450020)`,
      params: [],
    },
    'cip-envasamento-antigo': {
      sql: `cod_laboratorio IN (4, 16, 25) AND cod_operacao IN (31, 55, 68, 27)`,
      params: [],
    },
    // Microbiologia — análise laboratorial direta
    'microbiologia-analise-microbiologia': {
      sql: `cod_laboratorio IN (5, 17) AND cod_area IN (73, 75)
            AND lote_de_controle_de_qualidade NOT LIKE 'LCQMB%'`,
      params: [],
    },
    // Físico
    'fisico-embalagem': {
      sql: `cod_cabecalho_de_especificacao IN (
        SELECT ESPC.cod_cabecalho_de_especificacao
        FROM DIM_PLANEJAMENTO_DE_CRIACAO PL
        INNER JOIN DIM_PLANEJAMENTO_DE_CRIACAO_X_CABECALHO_DE_ESPECIFICACAO ESPC
            ON ESPC.cod_planejamento_de_criacao = PL.cod_planejamento_de_criacao
        WHERE PL.D_E_L_E_T IS NULL AND ESPC.D_E_L_E_T IS NULL
          AND PL.evento LIKE '%embalagem%'
      )`,
      params: [],
    },
    'fisico-materia-prima': {
      sql: `cod_cabecalho_de_especificacao IN (
        SELECT ESPC.cod_cabecalho_de_especificacao
        FROM DIM_PLANEJAMENTO_DE_CRIACAO PL
        INNER JOIN DIM_PLANEJAMENTO_DE_CRIACAO_X_CABECALHO_DE_ESPECIFICACAO ESPC
            ON ESPC.cod_planejamento_de_criacao = PL.cod_planejamento_de_criacao
        WHERE PL.D_E_L_E_T IS NULL AND ESPC.D_E_L_E_T IS NULL
          AND PL.evento LIKE '%matéria prima%'
      )`,
      params: [],
    },
    'fisico-quimicos': {
      sql: `cod_cabecalho_de_especificacao IN (
        SELECT ESPC.cod_cabecalho_de_especificacao
        FROM DIM_PLANEJAMENTO_DE_CRIACAO PL
        INNER JOIN DIM_PLANEJAMENTO_DE_CRIACAO_X_CABECALHO_DE_ESPECIFICACAO ESPC
            ON ESPC.cod_planejamento_de_criacao = PL.cod_planejamento_de_criacao
        WHERE PL.D_E_L_E_T IS NULL AND ESPC.D_E_L_E_T IS NULL
          AND PL.evento LIKE '%Químicos%'
      )`,
      params: [],
    },

    'desalcoolizacao': {
      sql: `lote_de_controle_de_qualidade COLLATE utf8mb4_unicode_ci IN (
    SELECT L.lote_de_controle_de_qualidade COLLATE utf8mb4_unicode_ci
    FROM FAT_ATRIBUTOS_DA_AMOSTRA ATR
    INNER JOIN FAT_LOTE_DE_CONTROLE_DE_QUALIDADE L
        ON CAST(ATR.valor AS UNSIGNED) = L.cod_lote_de_controle_de_qualidade
    WHERE ATR.cod_atributo_da_amostra = 53
      AND ATR.D_E_L_E_T IS NULL
      AND L.D_E_L_E_T IS NULL
  )`,
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
    'captacao': 'LCQCA',
    'tratamento-efluentes': 'LCQTE',
    'envase-produto-acabado': 'LCQE',

    'envase-interunidades': 'LCQE',
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

  'microbiologia-agua-enxague': 'Água de Enxague',
  'microbiologia-swab': 'SWAB',
  'microbiologia-analise-microbiologia': 'Análise Microbiológica',

  // Envase
  'envase-produto-acabado': 'Produto Acabado',
  'envase-chopp': 'Chopp',
  'envase-arrolhamento': 'Arrolhamento',
  'envase-provas-horarias': 'Provas Horárias',
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
  'cip-processo': 'CIP — Processo',
  'cip-envasamento-novo': 'CIP — Envasamento Novo',
  'cip-envasamento-antigo': 'CIP — Envasamento Antigo',

  // Físico
  'fisico-embalagem': 'Físico — Embalagem',
  'fisico-materia-prima': 'Físico — Matéria-Prima',
  'fisico-quimicos': 'Físico — Químicos',

};


export async function getRankingProcessos(
  periodo: FiltroPeriodo,
): Promise<{ id: string; nome: string; amostras: number; ensaios: number; nc: number }[]> {
  const { dataInicio: di, dataFim: df } = periodo;
  const diInt = Number(di.substring(0, 10).replace(/-/g, ''));
  const dfInt = Number(df.substring(0, 10).replace(/-/g, ''));

  // Resolve labs da filial para filtro na CTE
  const labs = await resolveFilialLaboratorios(periodo.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  // Antes de montar o SQL, resolve os lotes pesados em paralelo
  const [lotesDesalcoolizacao, lotesCip] = await Promise.all([
    // desalcoolizacao — atributo 53
    blabQuery<{ lote: string }>(`
      SELECT L.lote_de_controle_de_qualidade AS lote
      FROM FAT_ATRIBUTOS_DA_AMOSTRA ATR
      INNER JOIN FAT_LOTE_DE_CONTROLE_DE_QUALIDADE L
          ON CAST(ATR.valor AS UNSIGNED) = L.cod_lote_de_controle_de_qualidade
      WHERE ATR.cod_atributo_da_amostra = 53
        AND ATR.D_E_L_E_T IS NULL
        AND L.D_E_L_E_T IS NULL
    `, []).then(rows => rows.map(r => r.lote)),

    // cip
    blabQuery<{ lote: string }>(`
      SELECT L.lote_de_controle_de_qualidade AS lote
      FROM FAT_CIP C
      INNER JOIN FAT_LOTE_DE_CONTROLE_DE_QUALIDADE L
          ON L.cod_lote_de_controle_de_qualidade = C.cod_lote_de_controle_de_qualidade
      WHERE C.tipo_cip IN ('CIP COMPLETO','CIP CAUSTICO','CIP COMPLETO ALCALINO CLORADO',
          'ASSEPSIA ALCALINO CLORADO','ASSEPSIA ALCALINO','CIP COMPLETO (BRASSAGEM)',
          'CIP PASSIVAÇÃO','CIP SANITIZAÇÃO')
        AND C.data BETWEEN ? AND ?
        AND C.D_E_L_E_T IS NULL
        AND L.D_E_L_E_T IS NULL
    `, [diInt, dfInt]).then(rows => rows.map(r => r.lote)),
  ]);

  const placeholdersDesalc = lotesDesalcoolizacao.length > 0
    ? lotesDesalcoolizacao.map(() => '?').join(',')
    : 'NULL';

  const placeholdersCip = lotesCip.length > 0
    ? lotesCip.map(() => '?').join(',')
    : 'NULL';

  // Subquery reutilizável para Físico — resolve cod_cabecalho_de_especificacao
  // via tabela de dimensão (pequena, resolvida 1x pelo otimizador MySQL)
  const FISICO_IN = `
    cod_cabecalho_de_especificacao IN (
      SELECT ESPC.cod_cabecalho_de_especificacao
      FROM DIM_PLANEJAMENTO_DE_CRIACAO PL
      INNER JOIN DIM_PLANEJAMENTO_DE_CRIACAO_X_CABECALHO_DE_ESPECIFICACAO ESPC
          ON ESPC.cod_planejamento_de_criacao = PL.cod_planejamento_de_criacao
      WHERE PL.D_E_L_E_T IS NULL AND ESPC.D_E_L_E_T IS NULL
        AND PL.evento LIKE ?
    )`;

  // Cada ramo: [id_categoria, sql_where_extra, params_extra_após_di_df]
  // Os params de cada ramo são consumidos na ordem: [id_do_SELECT_?_AS_categoria, ...params_extra_no_WHERE]
  const ramos: [string, string, unknown[]][] = [
    // Fermento
    ['fermento', `cod_skip_lote IN ('68', '69')`, []],

    // Microbiologia
    ['microbiologia-estabilidade-micro', `(cod_skip_lote NOT IN ('36', '54') OR cod_skip_lote IS NULL) AND lote_de_controle_de_qualidade LIKE 'LCQMB%'`, []],
    ['microbiologia-estabilidade-envase', `cod_skip_lote IN ('36', '54') AND lote_de_controle_de_qualidade LIKE 'LCQMB%'`, []],

    ['microbiologia-agua-enxague', `cod_produto = 15`, []],
    ['microbiologia-swab', `cod_produto = 14`, []],
    ['microbiologia-analise-microbiologia', `cod_laboratorio IN (5, 17) AND cod_area IN (73, 75) AND lote_de_controle_de_qualidade NOT LIKE 'LCQMB%'`, []],

    // Envase
    ['envase-produto-acabado', `lote_de_controle_de_qualidade LIKE 'LCQE%' AND (cod_skip_lote IN ('33') OR (cod_skip_lote IS NULL AND operacao IN ('EMBALAGEM', 'ENCHIMENTO')))`, []],
    ['envase-chopp', `cod_centro_de_custo = 450050`, []],
    ['envase-arrolhamento', `operacao LIKE '%ARROLHAMENTO%'`, []],
    ['envase-provas-horarias', `cod_skip_lote IN ('29', '36', '31', '54') AND cod_laboratorio IN (16, 18, 20, 4, 6, 8, 5)`, []],
    ['envase-assoprador', `cod_operacao = 96`, []],
    ['envase-lubrificante', `produto LIKE '%LUBRIFICANTE%'`, []],
    ['envase-recravacao', `operacao LIKE '%RECRAVAÇÃO%'`, []],
    ['envase-pasteurizador', `operacao LIKE '%PASTEURIZ%'`, []],
    ['envase-interunidades', `cod_amostra_interunidade IS NOT NULL`, []],

    // Processo produtivo — mais específico antes para evitar sobreposição de prefixos
    ['filtracao', `lote_de_controle_de_qualidade LIKE 'LCQFI%'`, []],
    ['fermentacao', `lote_de_controle_de_qualidade LIKE 'LCQF%' AND lote_de_controle_de_qualidade NOT LIKE 'LCQFI%'`, []],
    ['brassagem', `lote_de_controle_de_qualidade LIKE 'LCQB%'`, []],
    ['maturacao', `lote_de_controle_de_qualidade LIKE 'LCQM%' AND lote_de_controle_de_qualidade NOT LIKE 'LCQMB%'`, []],
    [
      'desalcoolizacao',
      lotesDesalcoolizacao.length > 0
        ? `lote_de_controle_de_qualidade COLLATE utf8mb4_unicode_ci IN (${placeholdersDesalc})`
        : `1=0`,
      lotesDesalcoolizacao
    ],
    ['captacao', `lote_de_controle_de_qualidade LIKE 'LCQCA%'`, []],
    ['tratamento-efluentes', `lote_de_controle_de_qualidade LIKE 'LCQTE%'`, []],
    ['residuos', `cod_produto IN (303, 304)`, []],
    ['ar-co2', `cod_produto IN (153, 160) AND cod_laboratorio NOT IN (5, 17, 6, 20)`, []],

    // CIP — três sub-tipos independentes
    [
      'cip-processo',
      lotesCip.length > 0
        ? `cod_laboratorio IN (1, 15, 25) AND cod_centro_de_custo IN (450050, 450070, 460000, 430000, 430010, 430020, 410010, 470020) AND lote_de_controle_de_qualidade COLLATE utf8mb4_unicode_ci IN (${placeholdersCip})`
        : `1=0`,
      lotesCip
    ],
    [
      'cip-envasamento-novo',
      lotesCip.length > 0
        ? `cod_laboratorio IN (4, 16, 25) AND cod_centro_de_custo IN (450010, 450060,450030, 450040, 450020) AND lote_de_controle_de_qualidade COLLATE utf8mb4_unicode_ci IN (${placeholdersCip})`
        : `1=0`,
      lotesCip
    ],
    ['cip-envasamento-antigo', `cod_laboratorio IN (4, 16, 25) AND cod_operacao IN (31, 55, 68, 27)`, []],

    // Físico — subquery inline sobre tabelas de dimensão (estáticas, pequenas)
    ['fisico-embalagem', FISICO_IN, ['%embalagem%']],
    ['fisico-materia-prima', FISICO_IN, ['%matéria prima%']],
    ['fisico-quimicos', FISICO_IN, ['%Químicos%']],

  ];

  // ── SQL único: CTE materializa o período UMA vez; UNION ALL agrega por categoria ──
  const AGG = `
      COUNT(DISTINCT cod_amostra)                                       AS amostras,
      COUNT(1)                                                          AS ensaios,
      SUM(CASE WHEN conformidade = 'NÃO CONFORME' THEN 1 ELSE 0 END)  AS nc`;

  const unionParts = ramos.map(([, where]) => `
  SELECT ? AS categoria, ${AGG}
  FROM dados d
  WHERE (${where})`);

  // Params: [di, df, ...labs] do CTE, depois para cada ramo: [id, ...extra_where_params]
  const allParams: unknown[] = [di, df, ...labs];
  for (const [id, , extra] of ramos) {
    allParams.push(id, ...extra);
  }

  const sql = `
  WITH dados AS (
    SELECT
      cod_amostra,
      conformidade,
      cod_skip_lote,
      lote_de_controle_de_qualidade,
      operacao,
      cod_centro_de_custo,
      cod_laboratorio,
      cod_area,
      cod_produto,
      cod_amostra_interunidade,
      cod_cabecalho_de_especificacao,
      cod_operacao,
      produto
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND valor IS NOT NULL AND valor != ''
      AND data_resultado BETWEEN ? AND ?
      ${labFilter}
  )
  ${unionParts.join('\n  UNION ALL')}`;

  // Timeout maior para esta query composta (padrão 15s pode ser insuficiente)
  const rows = await blabQuery<{ categoria: string; amostras: number; ensaios: number; nc: number }>(
    sql, allParams, 600_000,
  );

  return rows
    .filter(r => Number(r.amostras) > 0)
    .map(r => ({
      id: r.categoria,
      nome: LABELS_CATEGORIA[r.categoria] ?? r.categoria,
      amostras: Number(r.amostras),
      ensaios: Number(r.ensaios),
      nc: Number(r.nc),
    }))
    .sort((a, b) => b.nc - a.nc);
}


// 3. Ranking por produto
export async function getRankingProdutos(periodo: FiltroPeriodo, limit = 20) {
  const labs = await resolveFilialLaboratorios(periodo.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  const rows = await blabQuery<any>(`
    SELECT
      cod_produto                                                          AS id,
      produto                                                              AS nome,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      COUNT(1)                                                             AS ensaios,
      SUM(CASE WHEN conformidade = 'NÃO CONFORME' THEN 1 ELSE 0 END)       AS nc
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND cod_produto IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
      ${labFilter}
    GROUP BY cod_produto, produto
    ORDER BY nc DESC
    LIMIT ?
  `, [periodo.dataInicio, periodo.dataFim, ...labs, limit]);

  return rows.map(r => ({
    id: Number(r.id),
    nome: r.nome,
    amostras: Number(r.amostras),
    ensaios: Number(r.ensaios),
    nc: Number(r.nc),
  }));
}

// 4. Ranking por ensaio
export async function getRankingEnsaios(periodo: FiltroPeriodo, limit = 20) {
  const labs = await resolveFilialLaboratorios(periodo.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  const rows = await blabQuery<any>(`
    SELECT
      cod_ensaio                                                           AS id,
      ensaio                                                               AS nome,
      COUNT(DISTINCT cod_amostra)                                          AS amostras,
      COUNT(1)                                                             AS ensaios,
      SUM(CASE WHEN conformidade = 'NÃO CONFORME' THEN 1 ELSE 0 END)       AS nc
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND cod_ensaio IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
      ${labFilter}
    GROUP BY cod_ensaio, ensaio
    ORDER BY nc DESC
    LIMIT ?
  `, [periodo.dataInicio, periodo.dataFim, ...labs, limit]);

  return rows.map(r => ({
    id: Number(r.id),
    nome: r.nome,
    amostras: Number(r.amostras),
    ensaios: Number(r.ensaios),
    nc: Number(r.nc),
  }));
}
