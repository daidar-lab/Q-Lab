// apps/backend/src/controllers/resumo-dashboard.controller.ts

import { Request, Response, NextFunction } from 'express';
import { getResumoDashboard } from '../services/resumo-dashboard.service';

export async function getResumo(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim } = req.query;
    const data = await getResumoDashboard({
      dataInicio: String(dataInicio),
      dataFim:    String(dataFim),
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
