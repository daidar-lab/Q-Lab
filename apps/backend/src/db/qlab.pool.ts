// apps/backend/src/db/qlab.pool.ts
// Pool leitura + escrita no banco próprio do Q/Lab
// Usado para: autenticação, cadastro de usuários

import mysql from 'mysql2/promise';

export const qlabPool = mysql.createPool({
    host: process.env.QLAB_DB_HOST,
    port: Number(process.env.QLAB_DB_PORT ?? 3306),
    user: process.env.QLAB_DB_USER,
    password: process.env.QLAB_DB_PASS,
    database: process.env.QLAB_DB_NAME,
    waitForConnections: true,
    connectionLimit: 5,
    queueLimit: 10,
    connectTimeout: 10_000,
});

export async function qlabQuery<T>(
    sql: string,
    params: unknown[],
): Promise<T[]> {
    const [rows] = await qlabPool.execute<mysql.RowDataPacket[]>(sql, params as any);
    return rows as T[];
}