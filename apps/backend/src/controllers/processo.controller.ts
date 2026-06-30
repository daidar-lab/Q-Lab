import { Request, Response, NextFunction } from 'express';
import * as fermentacaoService from '../services/processo/processo-fermentacao.service';
import * as filtracaoService from '../services/processo/processo-filtracao.service';
import * as brassagemService from '../services/processo/processo-brassagem.service';
import * as maturacaoService from '../services/processo/processo-maturacao.service';
import * as desalcoolizacaoService from '../services/processo/processo-desalcoolizacao.service';
import * as captacaoService from '../services/processo/processo-captacao.service';
import * as residuosService from '../services/processo/processo-residuos.service';
import * as tratamentoEfluentesService from '../services/processo/processo-tratamento-efluentes.service';
import * as co2Service from '../services/processo/processo-co2.service';

export const ProcessoController = {
  async getFermentacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final, fermentadores } = req.body;
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await fermentacaoService.getFermentacao({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
        fermentadores: Array.isArray(fermentadores) ? fermentadores.map(Number) : undefined,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getFiltracao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await filtracaoService.getFiltracao({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getBrassagem(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await brassagemService.getBrassagem({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getMaturacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final, maturadores } = req.body;
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await maturacaoService.getMaturacao({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
        maturadores: Array.isArray(maturadores) ? maturadores.map(Number) : undefined,
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getDesalcoolizacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await desalcoolizacaoService.getDesalcoolizacao({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getCaptacao(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await captacaoService.getCaptacao({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getResiduos(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data_inicial, data_final } = req.body;
      if (!data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await residuosService.getResiduos({
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getTratamentoEfluentes(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { cod_filial, data_inicial, data_final } = req.body;
      if (cod_filial === undefined || cod_filial === null || !data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos cod_filial, data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await tratamentoEfluentesService.getTratamentoEfluentes({
        cod_filial: Number(cod_filial),
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  },

  async getArCo2(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { data_inicial, data_final } = req.body;
      if (!data_inicial || !data_final) {
        res.status(400).json({ erro: 'Os campos data_inicial e data_final são obrigatórios.' });
        return;
      }
      const data = await co2Service.getArCo2({
        data_inicial: String(data_inicial),
        data_final: String(data_final),
      });
      res.json(data);
    } catch (err) {
      next(err);
    }
  }
};
