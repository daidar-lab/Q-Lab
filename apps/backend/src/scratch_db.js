// apps/backend/src/scratch_db.js
const mysql = require('mysql2/promise');
require('dotenv').config();

const pool = mysql.createPool({
  host:               process.env.BLAB_DB_HOST,
  port:               Number(process.env.BLAB_DB_PORT ?? 3306),
  user:               process.env.BLAB_DB_USER,
  password:           process.env.BLAB_DB_PASS,
  database:           process.env.BLAB_DB_NAME,
  waitForConnections: true,
  connectionLimit:    5,
  connectTimeout:     10_000,
});

async function run() {
  try {
    const di = '2026-06-01';
    const df = '2026-06-30';
    console.log(`Checking period: ${di} to ${df}`);

    const [r1] = await pool.query(`
      SELECT count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
    `, [di, df]);
    console.log('Total LCQMB% records in range:', r1[0]?.count);

    const [r2] = await pool.query(`
      SELECT count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
        AND valor IS NOT NULL AND valor != ''
    `, [di, df]);
    console.log('LCQMB% with non-empty valor:', r2[0]?.count);

    const [r3] = await pool.query(`
      SELECT conformidade, count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
        AND valor IS NOT NULL AND valor != ''
      GROUP BY conformidade
    `, [di, df]);
    console.log('LCQMB% by conformidade:', r3);

    const [r4] = await pool.query(`
      SELECT cod_skip_lote, lote_de_controle_de_qualidade, conformidade, valor, data_resultado
      FROM DW_FAT_RESULTADO
      WHERE lote_de_controle_de_qualidade LIKE 'LCQMB%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
      LIMIT 10
    `, [di, df]);
    console.log('LCQMB% sample:', r4);

    // Let's also check if there are records for skip lotes that don't match LCQMB% but match microbiologia
    const [r5] = await pool.query(`
      SELECT LEFT(lote_de_controle_de_qualidade, 8) as prefix, count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE cod_skip_lote IN ('36', '54')
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
      GROUP BY prefix
    `, [di, df]);
    console.log('Skip lote 36/54 prefixes:', r5);

    const [r6] = await pool.query(`
      SELECT LEFT(lote_de_controle_de_qualidade, 8) as prefix, count(*) as count
      FROM DW_FAT_RESULTADO
      WHERE (cod_skip_lote IS NOT NULL AND cod_skip_lote NOT IN ('36', '54', '68', '69'))
        AND lote_de_controle_de_qualidade LIKE 'LCQ%'
        AND data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
      GROUP BY prefix
    `, [di, df]);
    console.log('Other skip lotes with LCQ prefixes:', r6);

  } catch (error) {
    console.error('Error running scratch script:', error);
  } finally {
    await pool.end();
    process.exit(0);
  }
}

run();
