// apps/backend/src/controllers/usuarios.controller.ts

import type { Request, Response, NextFunction } from 'express';
import {
    listarUsuarios,
    buscarUsuarioPorId,
    criarUsuario,
    atualizarUsuario,
    desativarUsuario,
} from '../services/usuarios.service';

// GET /api/usuarios
export async function handleListar(
    _req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        res.json(await listarUsuarios());
    } catch (err) { next(err); }
}

// GET /api/usuarios/:id
export async function handleBuscar(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const usuario = await buscarUsuarioPorId(Number(req.params.id));
        if (!usuario) { res.status(404).json({ erro: 'Usuário não encontrado.' }); return; }
        res.json(usuario);
    } catch (err) { next(err); }
}

// POST /api/usuarios
export async function handleCriar(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const { nome, login, senha, role } = req.body;
        if (!nome || !login || !senha) {
            res.status(400).json({ erro: 'nome, login e senha são obrigatórios.' });
            return;
        }
        const resultado = await criarUsuario({ nome, login, senha, role });
        res.status(201).json(resultado);
    } catch (err: any) {
        if (err?.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ erro: 'Login já cadastrado.' });
            return;
        }
        next(err);
    }
}

// PATCH /api/usuarios/:id
export async function handleAtualizar(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        await atualizarUsuario(Number(req.params.id), req.body);
        res.json({ ok: true });
    } catch (err: any) {
        if (err?.code === 'ER_DUP_ENTRY') {
            res.status(409).json({ erro: 'Login já cadastrado.' });
            return;
        }
        next(err);
    }
}

// DELETE /api/usuarios/:id
export async function handleDesativar(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        if (Number(req.params.id) === req.usuario?.sub) {
            res.status(400).json({ erro: 'Você não pode desativar sua própria conta.' });
            return;
        }
        await desativarUsuario(Number(req.params.id));
        res.json({ ok: true });
    } catch (err) { next(err); }
}