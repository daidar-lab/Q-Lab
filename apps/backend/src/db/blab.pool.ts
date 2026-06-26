// apps/backend/src/db/blab.pool.ts
// Pool somente leitura no banco do B/LAB
// Timeouts conservadores — LightSail tem recursos limitados

import mysql from 'mysql2/promise';

const DEFAULT_BLAB_QUERY_TIMEOUT_MS = Number(process.env.BLAB_QUERY_TIMEOUT_MS ?? 15_000) || 15_000;

export const blabPool = mysql.createPool({
  host:               process.env.BLAB_DB_HOST,
  port:               Number(process.env.BLAB_DB_PORT ?? 3306),
  user:               process.env.BLAB_DB_USER,
  password:           process.env.BLAB_DB_PASS,
  database:           process.env.BLAB_DB_NAME,
  waitForConnections: true,
  connectionLimit:    5,       // conservador — LightSail 1-2 vCPUs
  queueLimit:         10,
  connectTimeout:     10_000,  // 10s para estabelecer conexão
  dateStrings:        true,    // garante que DATE/DATETIME cheguem como string 'YYYY-MM-DD'
  // mysql2 não expõe queryTimeout no pool — implementado via Promise.race no service
});


// Nome da tabela de fato principal — configurável via env para facilitar testes/staging
export const TABELA_FATO_PRINCIPAL = process.env.TABELA_FATO_PRINCIPAL ?? 'DW_FAT_RESULTADO';

// Wrapper com timeout por query — protege contra queries lentas na DW
export async function blabQuery<T>(
  sql: string,
  params: unknown[],
  timeoutMs = DEFAULT_BLAB_QUERY_TIMEOUT_MS,
): Promise<T[]> {
  const conn = await blabPool.getConnection();
  try {
    const query = conn.query<mysql.RowDataPacket[]>(sql, params);
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error('Query timeout — B/LAB')), timeoutMs),
    );
    const [rows] = await Promise.race([query, timeout]);
    return rows as T[];
  } finally {
    conn.release();
  }
}