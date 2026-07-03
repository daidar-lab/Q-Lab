// apps/backend/src/utils/filial.helper.ts
//
// Helper que resolve o array de cod_laboratorio para uma filial.
// Resultado cacheado em Redis por 30 minutos — evita subquery repetida em cada
// chamada DW. Mesma filosofia dos lookups de cod_amostra no padrão Grupo B.

import { blabQuery } from '../db/blab.pool';
import { redisClient } from '../db/redis';

const CACHE_TTL = 1800; // 30 minutos

/**
 * Resolve os cod_laboratorio associados a uma filial.
 * Cache Redis chave: filial:labs:{filialId}
 * Retorna [] se a filial não tiver laboratórios ativos.
 */
export async function resolveFilialLaboratorios(filialId: number): Promise<number[]> {
    const cacheKey = `filial:labs:${filialId}`;

    try {
        const cached = await redisClient.get(cacheKey);
        if (cached) {
            return JSON.parse(cached) as number[];
        }
    } catch {
        // Redis indisponível — continua sem cache
    }

    const rows = await blabQuery<{ cod_laboratorio: number }>(
        `SELECT cod_laboratorio
         FROM DIM_LABORATORIO
         WHERE cod_filial = ?
           AND D_E_L_E_T IS NULL`,
        [filialId],
    );

    const labs = rows.map(r => Number(r.cod_laboratorio));

    try {
        await redisClient.set(cacheKey, JSON.stringify(labs), { EX: CACHE_TTL });
    } catch {
        // Redis indisponível — segue sem cache
    }

    return labs;
}
