import { Request, Response, NextFunction } from 'express';
import { redisClient } from '../db/redis';

/**
 * Middleware para cachear rotas baseado na URL e Query Parameters
 * @param ttl Segundos que o cache ficará ativo (padrão: 5 minutos)
 */
export function cacheMiddleware(ttl: number = 300) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        // Não cacheamos métodos que alteram dados (POST, PUT, DELETE)
        if (req.method !== 'GET') {
            return next();
        }

        // Cria uma chave única baseada na rota + parâmetros de filtro (ex: dataInicio, dataFim)
        const cacheKey = `api-cache:${req.originalUrl || req.url}`;

        try {
            // 1. Tenta buscar do Redis
            const cachedResponse = await redisClient.get(cacheKey);

            if (cachedResponse) {
                // Cache Hit! Retorna direto pro usuário sem passar pelos controllers/services
                res.setHeader('X-Cache', 'HIT'); // Header opcional para debug no Insomnia/Postman
                res.setHeader('Content-Type', 'application/json');
                res.send(cachedResponse);
                return;
            }

            // 2. Cache Miss: Intercepta o método res.json para guardar a resposta no banco
            res.setHeader('X-Cache', 'MISS');
            const originalJson = res.json;

            res.json = function (body: any): Response {
                // Restaura a função original para enviar a resposta pro cliente
                res.json = originalJson;

                // Salva o resultado no Redis em segundo plano (sem travar a resposta)
                redisClient.set(cacheKey, JSON.stringify(body), { EX: ttl })
                    .catch(err => console.error('⚠️ Erro ao salvar cache no middleware:', err));

                return res.json(body);
            };

            next();
        } catch (error) {
            console.error('⚠️ Erro no middleware de cache, seguindo direto para o banco:', error);
            next();
        }
    };
}