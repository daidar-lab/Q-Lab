import { blabQuery } from '../../db/blab.pool';

export type TipoCip = 'envasamento' | 'processo';

const labMap: Record<TipoCip, number[]> = {
  envasamento: [4, 16, 25],
  processo:    [1, 15, 25],
};

interface GetCipParams {
  cod_filial: number;
  data_inicial: string;
  data_final: string;
  tipo: TipoCip;
}

export async function getCip(params: GetCipParams) {
  const { cod_filial, data_inicial, data_final, tipo } = params;
  const codLaboratorios = labMap[tipo];

  // QUERY 1 — Âncora (FAT_CIP):
  const cips = await blabQuery<any>(
    `SELECT
        CIP.cod_cip,
        CIP.cod_filial,
        CIP.tipo_cip,
        CIP.cod_bem,
        B.bem,
        B.abreviatura AS bem_abreviatura,
        CIP.cod_centro_de_custo,
        CC.centro_de_custo,
        CIP.cod_lote_de_controle_de_qualidade,
        LCQ.lote_de_controle_de_qualidade,
        CIP.cenario
    FROM FAT_CIP CIP
    INNER JOIN FAT_LOTE_DE_CONTROLE_DE_QUALIDADE LCQ
        ON LCQ.cod_lote_de_controle_de_qualidade = CIP.cod_lote_de_controle_de_qualidade
    INNER JOIN DIM_BEM B ON B.cod_bem = CIP.cod_bem
    LEFT JOIN DIM_CENTRO_DE_CUSTO CC
        ON CC.cod_centro_de_custo = CIP.cod_centro_de_custo
        AND CC.cod_filial = CIP.cod_filial
    WHERE CIP.cod_filial = ?
    AND CIP.data BETWEEN ? AND ?
    AND CIP.D_E_L_E_T IS NULL`,
    [cod_filial, data_inicial, data_final]
  );

  if (!cips || cips.length === 0) {
    return [];
  }

  // Extrair codLotes[] (cod_lote_de_controle_de_qualidade). Se vazio, retornar [].
  const codLotes = cips
    .map(cip => cip.cod_lote_de_controle_de_qualidade)
    .filter((lote): lote is number | string => lote !== null && lote !== undefined)
    .map(lote => String(lote));

  if (codLotes.length === 0) {
    return [];
  }

  // QUERY 2 — Intermediária (FAT_ATRIBUTOS_DA_AMOSTRA):
  const codLotesPlaceholders = codLotes.map(() => '?').join(', ');
  const codLabsPlaceholders = codLaboratorios.map(() => '?').join(', ');

  const amostras = await blabQuery<{ cod_amostra: number }>(
    `SELECT DISTINCT
        FAT.cod_amostra
    FROM FAT_ATRIBUTOS_DA_AMOSTRA FAT
    INNER JOIN FAT_AMOSTRA A ON A.cod_amostra = FAT.cod_amostra
    WHERE FAT.valor IN (${codLotesPlaceholders})
    AND A.cod_laboratorio IN (${codLabsPlaceholders})
    AND FAT.D_E_L_E_T IS NULL
    AND A.D_E_L_E_T IS NULL`,
    [...codLotes, ...codLaboratorios]
  );

  if (!amostras || amostras.length === 0) {
    return [];
  }

  const codAmostras = amostras
    .map(a => a.cod_amostra)
    .filter((cod): cod is number => cod !== null && cod !== undefined);

  if (codAmostras.length === 0) {
    return [];
  }

  // QUERY 3 — DW_FAT_RESULTADO:
  const codAmostrasPlaceholders = codAmostras.map(() => '?').join(', ');

  const resultados = await blabQuery<any>(
    `SELECT
        cod_amostra,
        cod_ensaio,
        ensaio,
        valor,
        lie,
        lse,
        conformidade,
        lote_de_controle_de_qualidade,
        cod_skip_lote,
        skip_lote,
        produto,
        cod_produto,
        data_resultado,
        hora_resultado,
        data_da_coleta,
        cod_centro_de_custo,
        centro_de_custo,
        cod_bem,
        bem,
        abreviatura
    FROM DW_FAT_RESULTADO
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_amostra IN (${codAmostrasPlaceholders})`,
    [data_inicial, data_final, ...codAmostras]
  );

  // MONTAGEM:
  return cips
    .map(cip => ({
      ...cip,
      resultados: resultados.filter(r =>
        r.lote_de_controle_de_qualidade === String(cip.cod_lote_de_controle_de_qualidade)
      )
    }))
    .filter(cip => cip.resultados.length > 0);
}
