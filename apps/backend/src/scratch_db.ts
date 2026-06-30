// apps/backend/src/scratch_db.ts
import dotenv from 'dotenv';
dotenv.config();

import { blabQuery } from './db/blab.pool';

async function run() {
  try {
    const di = '2026-06-01'; // or similar, let's check what period is actually in context or use some default range
    const df = '2026-06-30';
    console.log(`Checking period: ${di} to ${df}`);

    // Query 1: count all records with LCQMB%
    const r1 = await blabQuery<any>(`
      SELECT count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
    `, [di, df]);
    console.log('Total LCQMB% records in range:', r1[0]?.count);

    // Query 2: check with valor IS NOT NULL AND valor != ''
    const r2 = await blabQuery<any>(`
      SELECT count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
        AND valor IS NOT NULL AND valor != ''
    `, [di, df]);
    console.log('LCQMB% with non-empty valor:', r2[0]?.count);

    // Query 3: check conformidade values
    const r3 = await blabQuery<any>(`
      SELECT conformidade, count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
        AND valor IS NOT NULL AND valor != ''
      GROUP BY conformidade
    `, [di, df]);
    console.log('LCQMB% by conformidade:', r3);

    // Query 4: sample records
    const r4 = await blabQuery<any>(`
      SELECT cod_skip_lote, lote_de_controle_de_qualidade, conformidade, valor, data_resultado
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
      LIMIT 10
    `, [di, df]);
    console.log('LCQMB% sample:', r4);

  } catch (error) {
    console.error('Error running scratch script:', error);
  } finally {
    process.exit(0);
  }
}

run();
