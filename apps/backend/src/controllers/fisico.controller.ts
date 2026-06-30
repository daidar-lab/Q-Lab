import { Request, Response, NextFunction } from 'express';
import * as fisicoService from '../services/fisico/fisico.service';

export const FisicoController = {
  async getEmbalagem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data_inicial, data_final } = req.body;
      if (!data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await fisicoService.getFisico({
        data_inicial: String(data_inicial),
        data_final: String(data_final),
        tipo: 'embalagem',
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getMateriaPrima(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data_inicial, data_final } = req.body;
      if (!data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await fisicoService.getFisico({
        data_inicial: String(data_inicial),
        data_final: String(data_final),
        tipo: 'materia-prima',
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getQuimicos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data_inicial, data_final } = req.body;
      if (!data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await fisicoService.getFisico({
        data_inicial: String(data_inicial),
        data_final: String(data_final),
        tipo: 'quimicos',
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
};
