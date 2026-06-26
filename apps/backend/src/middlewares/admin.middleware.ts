// · verifica role admin
// apps/backend/src/middlewares/admin.middleware.ts
// Usar sempre DEPOIS do authMiddleware — depende de req.usuario

import type { Request, Response, NextFunction } from 'express';

export function adminMiddleware(
    req: Request,
    res: Response,
    next: NextFunction,
): void {
    if (req.usuario?.role !== 'admin') {
        res.status(403).json({ erro: 'Acesso restrito a administradores.' });
        return;
    }
    next();
}