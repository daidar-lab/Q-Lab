import { blabQuery, TABELA_FATO_PRINCIPAL } from '../db/blab.pool';
import { prefixoPorMacroProcesso, LISTA_MACRO_PROCESSOS } from '../configs/macro-processo';
import { ENSAIOS_DE_PROCESSO, NaturezaEnsaio } from '../configs/classificacao-ensaios';

interface DetalheMacroProcessoParams {
  origem: string;
  natureza: NaturezaEnsaio;
  dataInicio: string;
  dataFim: string;
}

// 1. Lista os macro processos disponíveis com contagem de NC (para o card do dashboard)
export async function getListaMacroProcessos(params: { dataInicio: string; dataFim: string }) {
  // Otimizado: Filtro inicial amplo com LIKE 'LCQ%' e correção cirúrgica para ignorar 'NÃO AVALIADO'
  const rows = await blabQuery<any>(`
    SELECT 
      CASE 
        WHEN lote_de_controle_de_qualidade LIKE 'LCQCP%' THEN 'CAPTACAO'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQMB%' THEN 'MICROBIOLOGIA'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQCA%' THEN 'COLETA DE AGUA'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQTE%' THEN 'ETDI'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQD%'  THEN 'DESALCOOLIZACAO'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQR%'  THEN 'FISICO'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQC%'  THEN 'CIP'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQE%'  THEN 'ENVASAMENTO'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQP%'  THEN 'PROPAGACAO'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQM%'  THEN 'MATURACAO'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQF%'  THEN 'FERMENTACAO'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQB%'  THEN 'BRASSAGEM'
        WHEN lote_de_controle_de_qualidade LIKE 'LCQFI%' THEN 'FILTRACAO'
        ELSE NULL
      END AS macro_processo,
      ensaio,
      COUNT(*) AS n_amostras,
      -- Corrigido: Apenas 'NÃO CONFORME' deve somar como quebra de qualidade real
      SUM(CASE WHEN conformidade = 'NÃO CONFORME' THEN 1 ELSE 0 END) AS n_nao_conforme
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO' -- Garante consistência com os detalhes da analítica
      AND data_resultado BETWEEN ? AND ?
      AND lote_de_controle_de_qualidade LIKE 'LCQ%'
    GROUP BY macro_processo, ensaio
    HAVING macro_processo IS NOT NULL
  `, [params.dataInicio, params.dataFim]);

  // Mapeia o resultado e garante que mesmo macro processos sem registros no período apareçam com 0
  const resultados = LISTA_MACRO_PROCESSOS.map((origem) => {
    const correspondenteRows = rows.filter((r) => r.macro_processo === origem);

    let n_amostras = 0;
    let n_nao_conforme = 0;
    let tem_produto = false;
    let tem_processo = false;

    const listaProcesso = ENSAIOS_DE_PROCESSO[origem] ?? [];

    for (const r of correspondenteRows) {
      n_amostras += Number(r.n_amostras);
      n_nao_conforme += Number(r.n_nao_conforme);

      const isProcesso = listaProcesso.includes(r.ensaio);
      if (isProcesso) {
        tem_processo = true;
      } else {
        tem_produto = true;
      }
    }

    if (n_amostras === 0) {
      tem_produto = true;
    }

    return {
      origem,
      n_amostras,
      n_nao_conforme,
      tem_produto,
      tem_processo,
    };
  });

  return resultados.sort((a, b) => b.n_nao_conforme - a.n_nao_conforme);
}

// 2. Detalhe de um macro processo, filtrado por natureza (produto/processo)
export async function getDetalheMacroProcesso(params: DetalheMacroProcessoParams) {
  const prefixo = prefixoPorMacroProcesso(params.origem);
  if (!prefixo) throw new Error(`Macro processo desconhecido: ${params.origem}`);

  const listaEnsaiosProcesso = ENSAIOS_DE_PROCESSO[params.origem] ?? [];

  let filtroEnsaio = '';
  let paramsEnsaio: string[] = [];

  if (params.natureza === 'processo' && listaEnsaiosProcesso.length > 0) {
    filtroEnsaio = `AND ensaio IN (${listaEnsaiosProcesso.map(() => '?').join(',')})`;
    paramsEnsaio = listaEnsaiosProcesso;
  } else if (params.natureza === 'produto' && listaEnsaiosProcesso.length > 0) {
    filtroEnsaio = `AND ensaio NOT IN (${listaEnsaiosProcesso.map(() => '?').join(',')})`;
    paramsEnsaio = listaEnsaiosProcesso;
  }

  const baseParams = [`${prefixo}%`, params.dataInicio, params.dataFim, ...paramsEnsaio];

  // ── Resumo ──────────────────────────────────────────────────────────────────
  const [resumoRow] = await blabQuery<any>(`
    SELECT
      ROUND(SUM(conformidade = 'CONFORME') * 100.0 / COUNT(*), 1)      AS pct_conforme,
      SUM(conformidade = 'NÃO CONFORME')                               AS n_nao_conforme,
      COUNT(DISTINCT CASE WHEN conformidade = 'NÃO CONFORME'
        THEN lote_de_controle_de_qualidade END)                          AS lotes_afetados,
      COUNT(DISTINCT lote_de_controle_de_qualidade)                      AS total_lotes
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND lote_de_controle_de_qualidade LIKE ?
      AND data_resultado BETWEEN ? AND ?
      ${filtroEnsaio}
  `, baseParams);

  // ── Série mensal de conformidade ─────────────────────────────────────────────
  const serie = await blabQuery<any>(`
    SELECT
      DATE_FORMAT(data_resultado, '%Y-%m')                               AS periodo,
      ROUND(SUM(conformidade = 'CONFORME') * 100.0 / COUNT(*), 1)        AS pct_conforme,
      COUNT(*)                                                           AS total,
      SUM(conformidade = 'CONFORME')                                     AS n_conforme
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND lote_de_controle_de_qualidade LIKE ?
      AND data_resultado BETWEEN ? AND ?
      ${filtroEnsaio}
    GROUP BY periodo
    ORDER BY periodo ASC
  `, baseParams);

  // ── Faixas de especificação por ensaio ───────────────────────────────────────
  const faixasRaw = await blabQuery<any>(`
    SELECT
      cod_ensaio,
      ensaio,
      ROUND(AVG(CASE
        WHEN valor REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        THEN CAST(REPLACE(valor, ',', '.') AS DECIMAL(10,4))
      END), 4)                                                           AS media,
      MIN(CASE
        WHEN lie REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        THEN CAST(REPLACE(lie, ',', '.') AS DECIMAL(10,4))
      END)                                                               AS lie,
      MIN(CASE
        WHEN lse REGEXP '^-?[0-9]+([.,][0-9]+)?$'
        THEN CAST(REPLACE(lse, ',', '.') AS DECIMAL(10,4))
      END)                                                               AS lse,
      COUNT(*)                                                           AS n_amostras,
      ROUND(SUM(conformidade = 'CONFORME') * 100.0 / COUNT(*), 1)        AS pct_conforme
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE D_E_L_E_T IS NULL
      AND conformidade != 'NÃO AVALIADO'
      AND lote_de_controle_de_qualidade LIKE ?
      AND data_resultado BETWEEN ? AND ?
      ${filtroEnsaio}
    GROUP BY cod_ensaio, ensaio
    ORDER BY n_amostras DESC
    LIMIT 20
  `, baseParams);

  const faixas = faixasRaw.map((f: any) => {
    const temLimites = f.lie !== null && f.lse !== null;
    return {
      ...f,
      modo: temLimites ? 'regua' : 'percentual',
      motivo: temLimites ? null : 'sem_especificacao',
    };
  });

  return {
    prefixo,
    resumo: {
      pct_conforme: Number(resumoRow?.pct_conforme ?? 0),
      n_nao_conforme: Number(resumoRow?.n_nao_conforme ?? 0),
      lotes_afetados: Number(resumoRow?.lotes_afetados ?? 0),
      total_lotes: Number(resumoRow?.total_lotes ?? 0),
    },
    serie: {
      granularidade: 'month',
      dados: serie
    },
    faixas,
  };
}