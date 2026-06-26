// apps/backend/src/middlewares/error.middleware.ts
// Deve ser registrado DEPOIS de todas as rotas no app.ts

import type { Request, Response, NextFunction } from 'express';
import { ErroAuth } from '../services/auth.service';

export function errorMiddleware(
    err: Error,
    _req: Request,
    res: Response,
    _next: NextFunction,
): void {
    console.error(`[${new Date().toISOString()}]`, err.message);

    if (err instanceof ErroAuth) {
        res.status(401).json({ erro: err.message });
        return;
    }

    // Query timeout do B/LAB
    if (err.message === 'Query timeout — B/LAB') {
        res.status(504).json({ erro: 'O banco demorou demais para responder. Tente um período menor.' });
        return;
    }

    // Erro genérico — não expõe detalhes em produção
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({
        erro: 'Erro interno do servidor.',
        detalhe: isProd ? undefined : err.message,
    });
}