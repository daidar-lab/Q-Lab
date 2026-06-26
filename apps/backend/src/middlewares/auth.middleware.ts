// verifica JWT
// apps/backend/src/middlewares/auth.middleware.ts

import type { Request, Response, NextFunction } from 'express';
import { verificarToken, ErroAuth } from '../services/auth.service';
import type { JwtPayload } from '@qlab/types';

// Extende o Request do Express para carregar o usuário autenticado
declare global {
    namespace Express {
        interface Request {
            usuario?: JwtPayload;
        }
    }
}

export function authMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    const header = req.headers.authorization;

    if (!header?.startsWith('Bearer ')) {
        res.status(401).json({ erro: 'Token não fornecido.' });
        return;
    }

    const token = header.slice(7);

    try {
        req.usuario = verificarToken(token);
        next();
    } catch (err) {
        if (err instanceof ErroAuth) {
            res.status(401).json({ erro: err.message });
        } else {
            next(err);
        }
    }
}