import { blabQuery } from '../../db/blab.pool';

interface ResiduosParams {
  data_inicial: string;
  data_final: string;
}

export async function getResiduos(params: ResiduosParams) {
  const { data_inicial, data_final } = params;

  // Query 1 — Direct (DW_FAT_RESULTADO)
  const resultados = await blabQuery<any>(
    `SELECT
        cod_amostra, data_resultado, hora_resultado, cod_ensaio, ensaio,
        valor, lie, lse, conformidade, cod_centro_de_custo, centro_de_custo,
        cod_bem, bem, cod_produto, produto, lote_de_controle_de_qualidade
    FROM DW_FAT_RESULTADO
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND (conformidade = 'CONFORME' OR conformidade = 'NÃO CONFORME')
    AND cod_produto IN (303, 304)
    ORDER BY cod_amostra, cod_ensaio`,
    [data_inicial, data_final]
  );

  if (resultados.length === 0) {
    return [];
  }

  // Query 2 — Atributo da Amostra (placa_caminhao)
  const codAmostras = Array.from(new Set(resultados.map((r) => r.cod_amostra)));
  if (codAmostras.length > 0) {
    const placeholders = codAmostras.map(() => '?').join(', ');
    const placas = await blabQuery<{ cod_amostra: number; placa_caminhao: string }>(
      `SELECT cod_amostra, valor AS placa_caminhao
      FROM FAT_ATRIBUTOS_DA_AMOSTRA
      WHERE cod_atributo_da_amostra = 24
      AND cod_amostra IN (${placeholders})
      AND D_E_L_E_T IS NULL`,
      codAmostras
    );

    const placaMap = new Map(placas.map((p) => [p.cod_amostra, p.placa_caminhao]));
    for (const r of resultados) {
      r.placa_caminhao = placaMap.get(r.cod_amostra) || null;
    }
  }

  return resultados;
}
