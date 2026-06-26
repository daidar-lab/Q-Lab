import { blabQuery } from './db/blab.pool';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function run() {
  try {
    const prefixo = 'LCQE';
    const dataInicio = '2025-12-31';
    const dataFim = '2026-01-04';

    console.log('Querying distinct assays and their counts...');
    const result = await blabQuery<any>(`
      SELECT 
        ensaio,
        COUNT(*) as total_rows,
        SUM(case when lie is not null then 1 else 0 end) as count_lie,
        SUM(case when lse is not null then 1 else 0 end) as count_lse,
        SUM(case when valor REGEXP '^-?[0-9]+([.,][0-9]+)?$' then 1 else 0 end) as count_numeric_valor,
        MIN(lie) as min_lie,
        MAX(lie) as max_lie,
        MIN(lse) as min_lse,
        MAX(lse) as max_lse,
        MIN(valor) as min_valor,
        MAX(valor) as max_valor
      FROM DW_FAT_RESULTADO
      WHERE D_E_L_E_T IS NULL
        AND lote_de_controle_de_qualidade LIKE ?
        AND data_resultado BETWEEN ? AND ?
      GROUP BY ensaio
    `, [`${prefixo}%`, dataInicio, dataFim]);

    console.table(result);
  } catch (error) {
    console.error('Error:', error);
  } finally {
    process.exit(0);
  }
}

run();
