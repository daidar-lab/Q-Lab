import { blabQuery } from '../db/blab.pool';

interface DetalheParams {
  tipo: 'processo' | 'produto' | 'ensaio';
  id: number;
  dataInicio: string;
  dataFim: string;
  topN?: number; // default 4
}

const COLUNA_FILTRO = {
  processo: 'cod_centro_de_custo',
  produto: 'cod_produto',
  ensaio: 'cod_ensaio',
} as const;

// 1. Série temporal de conformidade agregada (dinâmica)
export async function getSerieConformidade(params: DetalheParams) {
  const coluna = COLUNA_FILTRO[params.tipo];

  const inicio = new Date(params.dataInicio);
  const fim = new Date(params.dataFim);
  const diffTime = Math.abs(fim.getTime() - inicio.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  let granularidade: 'hour' | 'day' | 'week' | 'month' = 'month';
  let selectPeriodo = "DATE_FORMAT(data_resultado, '%Y-%m')";
  let groupBy = "periodo";
  let orderBy = "periodo ASC";

  if (diffDays <= 1) {
    granularidade = 'hour';
    selectPeriodo = `CONCAT(data_resultado, ' ', CASE 
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 6 THEN '00-06h'
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 12 THEN '06-12h'
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 18 THEN '12-18h'
          ELSE '18-24h'
        END)`;
    groupBy = `data_resultado, CASE 
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 6 THEN '00-06h'
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 12 THEN '06-12h'
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 18 THEN '12-18h'
          ELSE '18-24h'
        END`;
    orderBy = `data_resultado ASC, CASE 
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 6 THEN 0
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 12 THEN 1
          WHEN CAST(SUBSTRING(COALESCE(hora_resultado, '00:00:00'), 1, 2) AS SIGNED) < 18 THEN 2
          ELSE 3
        END ASC`;
  } else if (diffDays < 7) {
    granularidade = 'day';
    selectPeriodo = "DATE_FORMAT(data_resultado, '%Y-%m-%d')";
    groupBy = "periodo";
    orderBy = "periodo ASC";
  } else if (diffDays <= 90) {
    granularidade = 'week';
    selectPeriodo = "DATE_FORMAT(data_resultado, '%Y-%u')";
    groupBy = "periodo";
    orderBy = "periodo ASC";
  } else {
    granularidade = 'month';
    selectPeriodo = "DATE_FORMAT(data_resultado, '%Y-%m')";
    groupBy = "periodo";
    orderBy = "periodo ASC";
  }

  const dados = await blabQuery(`
    SELECT
      ${selectPeriodo}                                                AS periodo,
      COUNT(*)                                                        AS total,
      SUM(conformidade = 'CONFORME')                                  AS n_conforme,
      ROUND(SUM(conformidade = 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_conforme
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND ${coluna} = ?
      AND LENGTH(data_resultado) = 10
      AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND data_resultado BETWEEN ? AND ?
    GROUP BY ${groupBy}
    ORDER BY ${orderBy}
  `, [params.id, params.dataInicio, params.dataFim]);
  return { granularidade, dados };
}

// 2. Resumo macro (conformidade, NC, lotes afetados)
export async function getResumoMacro(params: DetalheParams) {
  const coluna = COLUNA_FILTRO[params.tipo];

  const [resumo] = await blabQuery(`
    SELECT
      COUNT(*)                                                        AS total,
      SUM(conformidade != 'CONFORME')                                 AS n_nao_conforme,
      ROUND(SUM(conformidade = 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_conforme,
      COUNT(DISTINCT numero_de_controle)                              AS total_lotes,
      COUNT(DISTINCT CASE
        WHEN conformidade != 'CONFORME' THEN numero_de_controle
      END)                                                             AS lotes_afetados
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND ${coluna} = ?
      AND data_resultado BETWEEN ? AND ?
  `, [params.id, params.dataInicio, params.dataFim]);

  return resumo;
}

// 3. Top N ensaios por volume (só para processo/produto — ensaio é fixo)
export async function getTopEnsaios(params: DetalheParams) {
  if (params.tipo === 'ensaio') {
    return [{ cod_ensaio: params.id }];
  }

  const coluna = COLUNA_FILTRO[params.tipo];
  const topN = params.topN ?? 4;

  return blabQuery(`
    SELECT
      cod_ensaio,
      ensaio,
      COUNT(*) AS n_amostras
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND ${coluna} = ?
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_ensaio, ensaio
    ORDER BY n_amostras DESC
    LIMIT ?
  `, [params.id, params.dataInicio, params.dataFim, topN]);
}

// 4. Faixas de especificação dos ensaios (com decisão de modo)
export async function getFaixasEspecificacao(
  params: DetalheParams,
  ensaioIds: number[]
) {
  const coluna = COLUNA_FILTRO[params.tipo];

  const placeholders = ensaioIds.map(() => '?').join(',');

  const rows = await blabQuery(`
    WITH contexto_produtos AS (
      SELECT
        cod_ensaio,
        COUNT(DISTINCT cod_produto) AS qtd_produtos
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND conformidade != 'NÃO AVALIADO'
        AND ${coluna} = ?
        AND cod_ensaio IN (${placeholders})
        AND data_resultado BETWEEN ? AND ?
      GROUP BY cod_ensaio
    )
    SELECT
      dw.cod_ensaio,
      dw.ensaio,
      cp.qtd_produtos,
      COUNT(*)                                                           AS n,
      ROUND(SUM(dw.conformidade = 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_conforme,
      ROUND(AVG(CASE
        WHEN dw.valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        THEN CAST(REPLACE(dw.valor, ',', '.') AS DECIMAL(10,4))
      END), 4)                                                           AS media,
      MIN(CASE
        WHEN dw.lie REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        THEN CAST(REPLACE(dw.lie, ',', '.') AS DECIMAL(10,4))
      END)                                                                AS lie,
      MIN(CASE
        WHEN dw.lse REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        THEN CAST(REPLACE(dw.lse, ',', '.') AS DECIMAL(10,4))
      END)                                                                AS lse
    FROM DW_FAT_RESULTADO dw
    JOIN contexto_produtos cp ON cp.cod_ensaio = dw.cod_ensaio
    WHERE dw.D_E_L_E_T IS NULL
      AND dw.conformidade != 'NÃO AVALIADO'
      AND dw.${coluna} = ?
      AND dw.cod_ensaio IN (${placeholders})
      AND dw.data_resultado BETWEEN ? AND ?
    GROUP BY dw.cod_ensaio, dw.ensaio, cp.qtd_produtos
  `, [
    params.id, ...ensaioIds, params.dataInicio, params.dataFim,
    params.id, ...ensaioIds, params.dataInicio, params.dataFim,
  ]);

  // Decide o modo de exibição para cada linha
  return rows.map((row: any) => {
    const temLimitesNumericos = row.lie !== null && row.lse !== null;
    const contextoUnivoco = row.qtd_produtos === 1;

    let modo: 'regua' | 'percentual';
    let motivo: 'multiplos_produtos' | 'sem_especificacao' | null = null;

    if (temLimitesNumericos && contextoUnivoco) {
      modo = 'regua';
    } else {
      modo = 'percentual';
      motivo = !contextoUnivoco ? 'multiplos_produtos' : 'sem_especificacao';
    }

    return { ...row, modo, motivo };
  });
}

// Função orquestradora — chamada pelo controller
export async function getDetalheCompleto(params: DetalheParams) {
  const [serie, resumo, topEnsaios] = await Promise.all([
    getSerieConformidade(params),
    getResumoMacro(params),
    getTopEnsaios(params),
  ]);

  const ensaioIds = topEnsaios.map((e: any) => e.cod_ensaio);
  const faixas = await getFaixasEspecificacao(params, ensaioIds);

  return { serie, resumo, topEnsaios, faixas };
}

// Top 4 centros de custo com mais NC para um ensaio fixo
export async function getCentrosCustoPorEnsaio(params: {
  codEnsaio: number;
  dataInicio: string;
  dataFim: string;
}) {
  return blabQuery(`
    SELECT
      cod_centro_de_custo,
      centro_de_custo,
      COUNT(*)                          AS n_amostras,
      SUM(conformidade != 'CONFORME')   AS n_nao_conforme,
      ROUND(SUM(conformidade != 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_nao_conforme
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND cod_ensaio = ?
      AND cod_centro_de_custo IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_centro_de_custo, centro_de_custo
    ORDER BY n_nao_conforme DESC
    LIMIT 4
  `, [params.codEnsaio, params.dataInicio, params.dataFim]);
}

// Obter centros de custo para um produto e ensaio específicos
export async function getCentrosCustoPorProdutoEEnsaio(params: {
  codProduto: string | number;
  codEnsaio: number;
  dataInicio: string;
  dataFim: string;
}) {
  return blabQuery(`
    SELECT
      cod_centro_de_custo,
      centro_de_custo,
      COUNT(*)                          AS n_amostras,
      SUM(conformidade != 'CONFORME')   AS n_nao_conforme,
      ROUND(SUM(conformidade != 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_nao_conforme
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND cod_produto = ?
      AND cod_ensaio = ?
      AND cod_centro_de_custo IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_centro_de_custo, centro_de_custo
    ORDER BY n_amostras DESC
  `, [params.codProduto, params.codEnsaio, params.dataInicio, params.dataFim]);
}

// =========================================================================
// FLUXO DE DRILL-DOWN EXCLUSIVO PARA ENSAIOS INFORMATIVOS
// =========================================================================

interface FiltroInformativos {
  dataInicio: string;
  dataFim: string;
}

// Nível 1: Lista todos os ensaios informativos (Disparado ao expandir o card)
export async function getListaEnsaiosInformativos(params: FiltroInformativos) {
  return blabQuery(`
    SELECT
      cod_ensaio,
      ensaio,
      COUNT(*) AS total_realizado
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade = 'NÃO AVALIADO'
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_ensaio, ensaio
    ORDER BY total_realizado DESC
  `, [params.dataInicio, params.dataFim]);
}

// Nível 2: Ao clicar no Ensaio Informativo, descobre os Centros de Custo dele
export async function getCentrosCustoPorInformativo(params: FiltroInformativos & { codEnsaio: number }) {
  return blabQuery(`
    SELECT
      cod_centro_de_custo,
      centro_de_custo,
      COUNT(*) AS total_realizado
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade = 'NÃO AVALIADO'
      AND cod_ensaio = ?
      AND cod_centro_de_custo IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_centro_de_custo, centro_de_custo
    ORDER BY total_realizado DESC
  `, [params.codEnsaio, params.dataInicio, params.dataFim]);
}

// Nível 3: Ao clicar no Centro de Custo, abre os Produtos e seus respectivos valores qualitativos
export async function getProdutosPorInformativoECentro(
  params: FiltroInformativos & { codEnsaio: number; codCentroCusto: number }
) {
  return blabQuery(`
    SELECT
      cod_produto,
      produto,
      valor AS ultimo_resultado_texto, -- 'CONFORME', 'AUSENTE', etc.
      COUNT(*) AS total_realizado
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade = 'NÃO AVALIADO'
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_produto, produto, valor
    ORDER BY total_realizado DESC
  `, [params.codEnsaio, params.codCentroCusto, params.dataInicio, params.dataFim]);
}