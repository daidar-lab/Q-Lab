// apps/backend/src/controllers/inspecao.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { inspecionarEnsaio } from '../services/inspecao.service';
import type { ContextoAnalise } from '@qlab/types';
import { contextoCompleto } from '@qlab/types';
export async function handleInspecao(
    req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const ctx = req.body as Partial<ContextoAnalise>;

        if (!contextoCompleto(ctx)) {
            res.status(400).json({
                erro: 'Contexto incompleto. Obrigatórios: codProduto, codCentroCusto, codEnsaio, dataInicio, dataFim.',
            });
            return;
        }

        const resultado = await inspecionarEnsaio(ctx as ContextoAnalise);
        res.json(resultado);
    } catch (err) {
        next(err);
    }
}