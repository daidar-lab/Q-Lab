import { blabQuery } from '../../db/blab.pool';

interface BrassagemParams {
  cod_filial: number;
  data_inicial: string;
  data_final: string;
}

export async function getBrassagem(params: BrassagemParams) {
  const { cod_filial, data_inicial, data_final } = params;

  // Query 1 — Âncora (FAT_FABRICOS)
  const lotes = await blabQuery<{ cod_lote_de_controle_de_qualidade: string }>(
    `SELECT DISTINCT
        FAB.cod_lote_de_controle_de_qualidade
    FROM FAT_FABRICOS FAB
    WHERE FAB.cod_filial = ?
    AND FAB.data BETWEEN ? AND ?
    AND FAB.D_E_L_E_T IS NULL`,
    [cod_filial, data_inicial, data_final]
  );

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
