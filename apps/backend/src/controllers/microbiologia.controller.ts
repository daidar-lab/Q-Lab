// apps/backend/src/controllers/microbiologia.controller.ts

import { Request, Response, NextFunction } from 'express';
import {
  getEstabilidadeBiologicaMicro,
  getEstabilidadeBiologicaEnvase,
  getResultadosMicrobiologicos,
  getAguaDeEnxague,
  getSwab,
} from '../services/microbiologia/microbiologia.service';

export const MicrobiologiaController = {

  async getEstabilidadeBiologicaMicro(req: Request, res: Response, next: NextFunction) {
    try {
      const { data_inicial, data_final } = req.body;
      const data = await getEstabilidadeBiologicaMicro({
        data_inicial: String(data_inicial),
        data_final:   String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getEstabilidadeBiologicaEnvase(req: Request, res: Response, next: NextFunction) {
    try {
      const { data_inicial, data_final } = req.body;
      const data = await getEstabilidadeBiologicaEnvase({
        data_inicial: String(data_inicial),
        data_final:   String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getResultadosMicrobiologicos(req: Request, res: Response, next: NextFunction) {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;
      const data = await getResultadosMicrobiologicos({
        cod_filial:   Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final:   String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getAguaDeEnxague(req: Request, res: Response, next: NextFunction) {
    try {
      const { data_inicial, data_final } = req.body;
      const data = await getAguaDeEnxague({
        data_inicial: String(data_inicial),
        data_final:   String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },

  async getSwab(req: Request, res: Response, next: NextFunction) {
    try {
      const { data_inicial, data_final } = req.body;
      const data = await getSwab({
        data_inicial: String(data_inicial),
        data_final:   String(data_final),
      });
      res.json({ ok: true, data });
    } catch (err) {
      next(err);
    }
  },
};
