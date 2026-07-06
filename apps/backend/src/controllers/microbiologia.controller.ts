// apps/backend/src/controllers/microbiologia.controller.ts

import { Request, Response, NextFunction } from 'express';
import {
  getEstabilidadeBiologicaMicro,
  getEstabilidadeBiologicaEnvase,
  getResultadosMicrobiologicos,
  getAguaDeEnxague,
  getSwab,
  getAnaliseMicrobiologia,
} from '../services/microbiologia/microbiologia.service';

export const MicrobiologiaController = {

  async getEstabilidadeBiologicaMicro(req: Request, res: Response, next: NextFunction) {
    try {
      const { filialId, data_inicial, data_final } = req.body;
      if (!filialId) { res.status(400).json({ erro: 'filialId é obrigatório.' }); return; }
      const data = await getEstabilidadeBiologicaMicro({
        filialId: Number(filialId),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getEstabilidadeBiologicaEnvase(req: Request, res: Response, next: NextFunction) {
    try {
      const { filialId, data_inicial, data_final } = req.body;
      if (!filialId) { res.status(400).json({ erro: 'filialId é obrigatório.' }); return; }
      const data = await getEstabilidadeBiologicaEnvase({
        filialId: Number(filialId),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getResultadosMicrobiologicos(req: Request, res: Response, next: NextFunction) {
    try {
      // cod_filial já era obrigatório neste endpoint — sem mudança de assinatura
      const { cod_filial, data_inicial, data_final } = req.body;
      const data = await getResultadosMicrobiologicos({
        filialId: Number(cod_filial),
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getAguaDeEnxague(req: Request, res: Response, next: NextFunction) {
    try {
      const { filialId, data_inicial, data_final } = req.body;
      if (!filialId) { res.status(400).json({ erro: 'filialId é obrigatório.' }); return; }
      const data = await getAguaDeEnxague({
        filialId: Number(filialId),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getSwab(req: Request, res: Response, next: NextFunction) {
    try {
      const { filialId, data_inicial, data_final } = req.body;
      if (!filialId) { res.status(400).json({ erro: 'filialId é obrigatório.' }); return; }
      const data = await getSwab({
        filialId: Number(filialId),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getAnaliseMicrobiologia(req: Request, res: Response, next: NextFunction) {
    try {
      const { filialId, data_inicial, data_final } = req.body;
      if (!filialId) { res.status(400).json({ erro: 'filialId é obrigatório.' }); return; }
      const data = await getAnaliseMicrobiologia({
        filialId: Number(filialId),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};
