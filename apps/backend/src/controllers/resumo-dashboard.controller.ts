// apps/backend/src/controllers/resumo-dashboard.controller.ts

import { Request, Response, NextFunction } from 'express';
import { getResumoDashboard } from '../services/resumo-dashboard.service';

export async function getResumo(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim, filialId: filialIdStr } = req.query as { dataInicio: string; dataFim: string; filialId: string };
    const filialId = parseInt(filialIdStr);

    if (!dataInicio || !dataFim) {
      res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
      return;
    }
    if (!filialId || isNaN(filialId)) {
      res.status(400).json({ erro: 'filialId é obrigatório.' });
      return;
    }

    const data = await getResumoDashboard({
      dataInicio,
      dataFim,
      filialId,
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
