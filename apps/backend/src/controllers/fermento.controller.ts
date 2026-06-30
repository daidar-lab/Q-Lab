import { Request, Response, NextFunction } from 'express';
import * as fermentoService from '../services/fermento/fermento.service';

export const FermentoController = {
  async getFermento(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data_inicial, data_final } = req.body;
      
      if (!data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos data_inicial e data_final são obrigatórios.' });
        return;
      }

      const data = await fermentoService.getFermento({
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });

      res.json(data);
    } catch (err) {
      next(err);
    }
  }
};
