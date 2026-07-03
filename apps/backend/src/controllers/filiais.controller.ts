// apps/backend/src/controllers/filiais.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { getFiliais } from '../services/filiais.service';

export async function handleGetFiliais(
    _req: Request,
    res: Response,
    next: NextFunction,
): Promise<void> {
    try {
        const filiais = await getFiliais();
        res.json(filiais);
    } catch (err) {
        next(err);
    }
}
