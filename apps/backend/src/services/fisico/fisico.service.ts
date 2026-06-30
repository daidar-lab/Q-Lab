import { blabQuery } from '../../db/blab.pool';

export type TipoFisico = 'embalagem' | 'materia-prima' | 'quimicos';

const eventoMap: Record<TipoFisico, string> = {
  'embalagem': 'embalagem',
  'materia-prima': 'matéria prima',
  'quimicos': 'Químicos',
};

interface FisicoParams {
  data_inicial: string;
  data_final: string;
  tipo: TipoFisico;
}

export async function getFisico(params: FisicoParams) {
  const { data_inicial, data_final, tipo } = params;
  const eventoVal = eventoMap[tipo];

  // QUERY 1 — Âncora: resolve cod_cabecalho_de_especificacao[] válidos para o evento
  const cabecalhos = await blabQuery<{ cod_cabecalho_de_especificacao: number }>(
    `SELECT DISTINCT
        ESPC.cod_cabecalho_de_especificacao
    FROM DIM_PLANEJAMENTO_DE_CRIACAO PL
    INNER JOIN DIM_PLANEJAMENTO_DE_CRIACAO_X_CABECALHO_DE_ESPECIFICACAO ESPC
        ON ESPC.cod_planejamento_de_criacao = PL.cod_planejamento_de_criacao
    WHERE PL.evento LIKE CONCAT('%', ?, '%')
    AND PL.D_E_L_E_T IS NULL
    AND ESPC.D_E_L_E_T IS NULL`,
    [eventoVal]
  );

  const codCabecalhos = cabecalhos.map((c) => c.cod_cabecalho_de_especificacao);
  if (codCabecalhos.length === 0) {
    return [];
  }

  // QUERY 2 — Intermediária: resolve cod_amostra[] no período
  const cabecalhosPlaceholders = codCabecalhos.map(() => '?').join(', ');
  const amostras = await blabQuery<{ cod_amostra: number }>(
    `SELECT DISTINCT
        A.cod_amostra
    FROM FAT_AMOSTRA A
    WHERE A.cod_cabecalho_de_especificacao IN (${cabecalhosPlaceholders})
    AND A.data_da_coleta BETWEEN ? AND ?
    AND A.D_E_L_E_T IS NULL`,
    [...codCabecalhos, data_inicial, data_final]
  );

  const codAmostras = amostras.map((a) => a.cod_amostra);
  if (codAmostras.length === 0) {
    return [];
  }

  // QUERY 3 — Final: filtra o DW por cod_amostra IN (...)
  const amostrasPlaceholders = codAmostras.map(() => '?').join(', ');
  const resultados = await blabQuery<any>(
    `SELECT
        cod_amostra,
        cod_amostra_reanalise,
        data_da_coleta,
        hora_da_coleta,
        data_resultado,
        hora_resultado,
        cod_ensaio,
        ensaio,
        valor,
        lie,
        lse,
        conformidade,
        cod_laboratorio,
        laboratorio,
        cod_fornecedor,
        fornecedor,
        cod_produto,
        produto,
        cod_cabecalho_de_especificacao,
        cod_skip_lote,
        skip_lote,
        numero_de_controle,
        lote_de_controle_de_qualidade
    FROM DW_FAT_RESULTADO
    WHERE cod_amostra IN (${amostrasPlaceholders})
    AND data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND (conformidade = 'CONFORME' OR conformidade = 'NÃO CONFORME')
    ORDER BY cod_amostra, cod_ensaio`,
    [...codAmostras, data_inicial, data_final]
  );

  // Group by amostra
  const porAmostra = new Map<number, any[]>();
  for (const r of resultados) {
    if (!porAmostra.has(r.cod_amostra)) {
      porAmostra.set(r.cod_amostra, []);
    }
    porAmostra.get(r.cod_amostra)!.push(r);
  }

  return Array.from(porAmostra.entries()).map(([cod_amostra, res]) => ({
    cod_amostra,
    resultados: res,
  }));
}
