// src/middlewares/cache.middleware.ts
import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';

export function cacheMiddleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        if (req.method !== 'GET') return next();

        const cacheKey = `api-cache:${req.originalUrl || req.url}`;

        // ─── LÓGICA DE TEMPO INTELIGENTE ───
        let ttl = 3600; // Padrão: 5 minutos para dados recentes

        // Se a requisição tiver um filtro de dataFim (padrão dos seus dashboards)
        if (req.query.dataFim) {
            const dataFimFiltro = new Date(req.query.dataFim as string);
            const hoje = new Date();

            // Zera as horas para comparar apenas os dias
            hoje.setHours(0, 0, 0, 0);
            dataFimFiltro.setHours(0, 0, 0, 0);

            // Se o período filtrado já acabou (ex: mês passado), o dado NUNCA mais vai mudar
            // Então podemos cachear com segurança por 24 horas (86400) ou até mais!
            if (dataFimFiltro < hoje) {
                ttl = 432000; // 24 horas
            }
        }

        try {
            const cachedResponse = await redisClient.get(cacheKey);

            if (cachedResponse) {
                res.setHeader('X-Cache', 'HIT');
                res.setHeader('Content-Type', 'application/json');
                res.send(cachedResponse);
                return;
            }

            res.setHeader('X-Cache', 'MISS');
            const originalJson = res.json;

            res.json = function (body: any): Response {
                res.json = originalJson;
                redisClient.set(cacheKey, JSON.stringify(body), { EX: ttl })
                    .catch(err => console.error('⚠️ Erro ao salvar cache:', err));
                return res.json(body);
            };

            next();
        } catch (error) {
            console.error('⚠️ Erro no cache:', error);
            next();
        }
    };
}