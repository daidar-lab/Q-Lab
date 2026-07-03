import { Request, Response, NextFunction } from 'express';
import * as cipService from '../services/cip/cip.service';

export const CipController = {
  // POST /qlab/cip/envasamento
  async getCipEnvasamento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;
      
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }

      const data = await cipService.getCip({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
        tipo: 'envasamento'
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // POST /qlab/cip/processo
  async getCipProcesso(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;

      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }

      const data = await cipService.getCip({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
        tipo: 'processo'
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  // POST /qlab/cip/envasamento-antigo
  async getCipEnvasamentoAntigo(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_laboratorio, data_inicial, data_final } = req.body;

      if (cod_laboratorio === undefined || cod_laboratorio === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_laboratorio, data_inicial e data_final são obrigatórios.' });
        return;
      }

      const data = await cipService.getCipEnvasamentoAntigo({
        cod_laboratorio: Number(cod_laboratorio),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
};

