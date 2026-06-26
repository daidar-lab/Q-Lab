// apps/backend/src/controllers/macroProcesso.controller.ts

import { Request, Response, NextFunction } from 'express';
import * as MacroProcessoService from '../services/macroProcesso.service';

export async function getLista(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim } = req.query;
    const data = await MacroProcessoService.getListaMacroProcessos({
      dataInicio: String(dataInicio),
      dataFim: String(dataFim),
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getDetalhe(req: Request, res: Response, next: NextFunction) {
  try {
    const { origem, natureza } = req.params;
    const { dataInicio, dataFim } = req.query;

    if (!['produto', 'processo'].includes(natureza)) {
      return res.status(400).json({ ok: false, error: 'Natureza inválida' });
    }

    const data = await MacroProcessoService.getDetalheMacroProcesso({
      origem,
      natureza: natureza as 'produto' | 'processo',
      dataInicio: String(dataInicio),
      dataFim: String(dataFim),
    });

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
