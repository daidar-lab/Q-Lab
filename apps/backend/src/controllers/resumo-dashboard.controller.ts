// apps/backend/src/controllers/resumo-dashboard.controller.ts

import { Request, Response, NextFunction } from 'express';
import { getResumoDashboard } from '../services/resumo-dashboard.service';

export async function getResumo(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim, filialId: filialIdStr, kpis, processos, ensaios, produtos, metaConformidade } = req.body;
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
      kpis,
      processos,
      ensaios,
      produtos,
      metaConformidade
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
