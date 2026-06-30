import { blabQuery } from '../../db/blab.pool';

interface FermentoParams {
  data_inicial: string;
  data_final: string;
}

export async function getFermento(params: FermentoParams) {
  const { data_inicial, data_final } = params;

  return blabQuery<any>(
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
        cod_bem,
        bem,
        cod_produto,
        produto,
        cod_skip_lote,
        skip_lote,
        numero_de_controle,
        lote_de_controle_de_qualidade
    FROM DW_FAT_RESULTADO
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_skip_lote IN ('68', '69')
    ORDER BY cod_amostra, cod_ensaio`,
    [data_inicial, data_final]
  );
}
