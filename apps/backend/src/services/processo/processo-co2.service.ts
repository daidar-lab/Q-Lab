import { blabQuery } from '../../db/blab.pool';

interface ArCo2Params {
  data_inicial: string;
  data_final: string;
}

export async function getArCo2(params: ArCo2Params) {
  const { data_inicial, data_final } = params;

  return blabQuery<any>(
    `SELECT
        cod_amostra, data_resultado, hora_resultado, cod_ensaio, ensaio,
        valor, lie, lse, conformidade, cod_laboratorio, laboratorio,
        cod_produto, produto, lote_de_controle_de_qualidade
    FROM DW_FAT_RESULTADO
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_produto IN (153, 160)
    AND cod_laboratorio NOT IN (5, 17, 6, 20)
    AND (conformidade = 'CONFORME' OR conformidade = 'NÃO CONFORME')
    ORDER BY cod_amostra, cod_ensaio`,
    [data_inicial, data_final]
  );
}
