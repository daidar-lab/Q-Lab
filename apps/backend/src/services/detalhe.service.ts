import { blabQuery } from '../db/blab.pool';
import { resolverFiltroPorId } from './analitica.service';
import { resolveFilialLaboratorios } from '../utils/filial.helper';

interface DetalheParams {
  tipo: 'processo' | 'produto' | 'ensaio';
  id: string | number;
  filialId: number;
  dataInicio: string;
  dataFim: string;
  topN?: number; // default 4
}

function buildFiltroDetalhe(
  tipo: 'processo' | 'produto' | 'ensaio',
  id: string | number
): { sql: string; params: unknown[] } {
  if (tipo === 'produto') return { sql: 'cod_produto = ?', params: [id] };
  if (tipo === 'ensaio') return { sql: 'cod_ensaio = ?', params: [Number(id)] };
  return resolverFiltroPorId(id);
}

// 1. Série temporal de conformidade agregada (dinâmica)
export async function getSerieConformidade(params: DetalheParams) {
  const filter = buildFiltroDetalhe(params.tipo, params.id);
  const labs = await resolveFilialLaboratorios(params.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

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
  } else if (diffDays <= 7) {
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
      AND ${filter.sql}
      AND LENGTH(data_resultado) = 10
      AND data_resultado REGEXP '^[0-9]{4}-[0-9]{2}-[0-9]{2}$'
      AND data_resultado BETWEEN ? AND ?
      ${labFilter}
    GROUP BY ${groupBy}
    ORDER BY ${orderBy}
  `, [...filter.params, params.dataInicio, params.dataFim, ...labs]);
  return { granularidade, dados };
}

// 2. Resumo macro (conformidade, NC, lotes afetados)
export async function getResumoMacro(params: DetalheParams) {
  const filter = buildFiltroDetalhe(params.tipo, params.id);
  const labs = await resolveFilialLaboratorios(params.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  const [resumo] = await blabQuery(`
    SELECT
      COUNT(*)                                                        AS total,
      SUM(conformidade != 'CONFORME')                                 AS n_nao_conforme,
      ROUND(SUM(conformidade = 'CONFORME') * 1.0 / COUNT(*) * 100, 1) AS pct_conforme,
COUNT(DISTINCT lote_de_controle_de_qualidade)  AS total_lotes,
COUNT(DISTINCT CASE
  WHEN conformidade != 'CONFORME' THEN lote_de_controle_de_qualidade
END)                                            AS lotes_afetados
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND ${filter.sql}
      AND data_resultado BETWEEN ? AND ?
      ${labFilter}
  `, [...filter.params, params.dataInicio, params.dataFim, ...labs]);

  return resumo;
}

// 3. Top N ensaios por volume (só para processo/produto — ensaio é fixo)
export async function getTopEnsaios(params: DetalheParams) {
  if (params.tipo === 'ensaio') {
    return [{ cod_ensaio: params.id }];
  }

  const filter = buildFiltroDetalhe(params.tipo, params.id);
  const topN = params.topN ?? 100;
  const labs = await resolveFilialLaboratorios(params.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  return blabQuery(`
    SELECT
      cod_ensaio,
      ensaio,
      COUNT(*) AS n_amostras
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND ${filter.sql}
      AND data_resultado BETWEEN ? AND ?
      ${labFilter}
    GROUP BY cod_ensaio, ensaio
    ORDER BY n_amostras DESC
    LIMIT ?
  `, [...filter.params, params.dataInicio, params.dataFim, ...labs, topN]);
}

// 4. Faixas de especificação dos ensaios (com decisão de modo)
export async function getFaixasEspecificacao(
  params: DetalheParams,
  ensaioIds: number[]
) {
  if (ensaioIds.length === 0) {
    return [];
  }

  const filter = buildFiltroDetalhe(params.tipo, params.id);

  const placeholders = ensaioIds.map(() => '?').join(',');

  const columnsToPrefix = [
    'cod_skip_lote', 'cod_produto', 'cod_laboratorio',
    'lote_de_controle_de_qualidade', 'operacao', 'cod_centro_de_custo',
    'cod_amostra_interunidade', 'cod_cabecalho_de_especificacao', 'cod_ensaio'
  ];
  let filterDwSql = filter.sql;
  for (const col of columnsToPrefix) {
    const regex = new RegExp(`(?<!\\.)\\b${col}\\b`, 'g');
    filterDwSql = filterDwSql.replace(regex, `dw.${col}`);
  }

  const rows = await blabQuery(`
    WITH contexto_produtos AS (
      SELECT
        cod_ensaio,
        COUNT(DISTINCT cod_produto) AS qtd_produtos
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND conformidade != 'NÃO AVALIADO'
        AND ${filter.sql}
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
      AND ${filterDwSql}
      AND dw.cod_ensaio IN (${placeholders})
      AND dw.data_resultado BETWEEN ? AND ?
    GROUP BY dw.cod_ensaio, dw.ensaio, cp.qtd_produtos
  `, [
    ...filter.params, ...ensaioIds, params.dataInicio, params.dataFim,
    ...filter.params, ...ensaioIds, params.dataInicio, params.dataFim,
  ]);

  // Decide o modo de exibição para cada linha
  // Decide o modo de exibição, calcula a não-conformidade e ordena
  const linhasProcessadas = rows.map((row: any) => {
    const modo: 'percentual' = 'percentual';
    const motivo: null = null;

    // Calcula a porcentagem de NÃO CONFORME (100% - pct_conforme)
    const pct_nao_conforme = Number((100 - row.pct_conforme).toFixed(1));

    return {
      ...row,
      modo,
      motivo,
      pct_nao_conforme // Enviando a nova métrica para o front
    };
  });

  // Ordena o array: Os ensaios com MAIOR % de não conformidade aparecem primeiro (no topo)
  return linhasProcessadas.sort((a, b) => b.pct_nao_conforme - a.pct_nao_conforme);
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
  filialId: number;
}

// Nível 1: Lista todos os ensaios informativos (Disparado ao expandir o card)
export async function getListaEnsaiosInformativos(params: FiltroInformativos) {
  const labs = await resolveFilialLaboratorios(params.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  return blabQuery(`
    SELECT
      cod_ensaio,
      ensaio,
      COUNT(*) AS total_realizado
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade = 'NÃO AVALIADO'
      ${labFilter}
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_ensaio, ensaio
    ORDER BY total_realizado DESC
  `, [...labs, params.dataInicio, params.dataFim]);
}

// Nível 2: Ao clicar no Ensaio Informativo, descobre os Centros de Custo dele
export async function getCentrosCustoPorInformativo(params: FiltroInformativos & { codEnsaio: number }) {
  const labs = await resolveFilialLaboratorios(params.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  return blabQuery(`
    SELECT
      cod_centro_de_custo,
      centro_de_custo,
      COUNT(*) AS total_realizado
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade = 'NÃO AVALIADO'
      AND cod_ensaio = ?
      ${labFilter}
      AND cod_centro_de_custo IS NOT NULL
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_centro_de_custo, centro_de_custo
    ORDER BY total_realizado DESC
  `, [params.codEnsaio, ...labs, params.dataInicio, params.dataFim]);
}

// Nível 3: Ao clicar no Centro de Custo, abre os Produtos e seus respectivos valores qualitativos
export async function getProdutosPorInformativoECentro(
  params: FiltroInformativos & { codEnsaio: number; codCentroCusto: number }
) {
  const labs = await resolveFilialLaboratorios(params.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

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
      ${labFilter}
      AND data_resultado BETWEEN ? AND ?
    GROUP BY cod_produto, produto, valor
    ORDER BY total_realizado DESC
  `, [params.codEnsaio, params.codCentroCusto, ...labs, params.dataInicio, params.dataFim]);
}

// Nível 4: Ao clicar no Produto/Resultado, abre a lista de Amostras
export async function getAmostrasPorInformativoECentroEProduto(
  params: FiltroInformativos & { codEnsaio: number; codCentroCusto: number; codProduto: number; valor: string | null }
) {
  const labs = await resolveFilialLaboratorios(params.filialId);
  const labFilter = labs.length > 0
    ? `AND cod_laboratorio IN (${labs.map(() => '?').join(', ')})`
    : '';

  const valorCondition = params.valor ? 'AND valor = ?' : 'AND valor IS NULL';
  const queryParams = params.valor
    ? [params.codEnsaio, params.codCentroCusto, params.codProduto, params.valor, ...labs, params.dataInicio, params.dataFim]
    : [params.codEnsaio, params.codCentroCusto, params.codProduto, ...labs, params.dataInicio, params.dataFim];

  return blabQuery(`
    SELECT
      cod_amostra,
      numero_de_controle,
      data_resultado,
      hora_resultado,
      valor AS ultimo_resultado_texto
    FROM DW_FAT_RESULTADO
    WHERE D_E_L_E_T IS NULL
      AND conformidade = 'NÃO AVALIADO'
      AND cod_ensaio = ?
      AND cod_centro_de_custo = ?
      AND cod_produto = ?
      ${valorCondition}
      ${labFilter}
      AND data_resultado BETWEEN ? AND ?
    ORDER BY data_resultado DESC, hora_resultado DESC
  `, queryParams);
}