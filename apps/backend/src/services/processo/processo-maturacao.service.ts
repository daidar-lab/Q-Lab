import { blabQuery } from '../../db/blab.pool';

interface MaturacaoParams {
  cod_filial: number;
  data_inicial: string;
  data_final: string;
  maturadores?: number[];
}

export async function getMaturacao(params: MaturacaoParams) {
  const { cod_filial, data_inicial, data_final, maturadores } = params;

  // Query 1 — Âncora (FAT_MATURACAO)
  let sql = `SELECT DISTINCT
      MAT.cod_lote_de_controle_de_qualidade
  FROM FAT_MATURACAO MAT
  WHERE MAT.cod_filial = ?
  AND MAT.data BETWEEN ? AND ?
  AND MAT.D_E_L_E_T IS NULL`;

  const queryParams: any[] = [cod_filial, data_inicial, data_final];

  if (maturadores && maturadores.length > 0) {
    const placeholders = maturadores.map(() => '?').join(', ');
    sql += ` AND MAT.cod_bem IN (${placeholders})`;
    queryParams.push(...maturadores);
  }

  const lotes = await blabQuery<{ cod_lote_de_controle_de_qualidade: string }>(sql, queryParams);
  const codLotes = lotes
    .map((l) => l.cod_lote_de_controle_de_qualidade)
    .filter((lote): lote is string => typeof lote === 'string' && lote !== '');

  if (codLotes.length === 0) {
    return [];
  }

  // Query 2 — Final (DW_FAT_RESULTADO)
  const placeholders = codLotes.map(() => '?').join(', ');
  const resultados = await blabQuery<any>(
    `SELECT
        cod_amostra, data_resultado, hora_resultado, cod_ensaio, ensaio,
        valor, lie, lse, conformidade, cod_laboratorio, laboratorio,
        cod_bem, bem, cod_produto, produto, lote_de_controle_de_qualidade
    FROM DW_FAT_RESULTADO
    WHERE lote_de_controle_de_qualidade IN (${placeholders})
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND (conformidade = 'CONFORME' OR conformidade = 'NÃO CONFORME')
    ORDER BY lote_de_controle_de_qualidade, cod_amostra, cod_ensaio`,
    [...codLotes]
  );

  // Group by lote
  const porLote = new Map<string, any[]>();
  for (const r of resultados) {
    if (!porLote.has(r.lote_de_controle_de_qualidade)) {
      porLote.set(r.lote_de_controle_de_qualidade, []);
    }
    porLote.get(r.lote_de_controle_de_qualidade)!.push(r);
  }

  return codLotes
    .map((lote) => ({
      lote_de_controle_de_qualidade: lote,
      resultados: porLote.get(lote) || [],
    }))
    .filter((g) => g.resultados.length > 0);
}
