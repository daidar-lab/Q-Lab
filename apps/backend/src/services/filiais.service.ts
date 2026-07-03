// apps/backend/src/services/filiais.service.ts
//
// Consulta DIM_FILIAL e retorna filiais ativas.
// Cache Redis 10h — cadastro de filiais muda raramente.

import { blabQuery } from '../db/blab.pool';
import { redisClient } from '../db/redis';

export interface FilialDTO {
    cod_filial: number;
    filial: string;
    abreviatura: string;
}

const CACHE_KEY = 'filiais:all';
const CACHE_TTL = 36_000; // 10 horas

export async function getFiliais(): Promise<FilialDTO[]> {
    try {
        const cached = await redisClient.get(CACHE_KEY);
        if (cached) {
            return JSON.parse(cached) as FilialDTO[];
        }
    } catch {
        // Redis indisponível — continua sem cache
    }

    const rows = await blabQuery<FilialDTO>(
        `SELECT cod_filial, filial, abreviatura
         FROM DIM_FILIAL
         WHERE D_E_L_E_T IS NULL
         ORDER BY filial`,
        [],
    );

    try {
        await redisClient.set(CACHE_KEY, JSON.stringify(rows), { EX: CACHE_TTL });
    } catch {
        // Redis indisponível — segue sem cache
    }

    return rows;
}
