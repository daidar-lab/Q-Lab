// apps/backend/src/controllers/auth.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { login, ErroAuth } from '../services/auth.service';

export async function handleLogin(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const { login: loginStr, senha } = req.body as { login?: string; senha?: string };

        if (!loginStr || !senha) {
            res.status(400).json({ erro: 'login e senha são obrigatórios.' });
            return;
        }

        const resultado = await login(loginStr, senha);
        res.json(resultado);
    } catch (err) {
        if (err instanceof ErroAuth) {
            res.status(401).json({ erro: err.message });
        } else {
            next(err);
        }
    }
}

// GET /api/auth/me — valida token e devolve payload
// Usado pelo frontend ao recarregar a página
export function handleMe(req: Request, res: Response): void {
    res.json(req.usuario);
}