import { Request, Response, NextFunction } from 'express';
import * as DetalheService from '../services/detalhe.service';
import { getResumoDetalheIA } from '../services/resumo-detalhe.service';

const TIPO_MAP: Record<string, 'processo' | 'produto' | 'ensaio'> = {
    processo: 'processo',
    processos: 'processo',
    produto: 'produto',
    produtos: 'produto',
    ensaio: 'ensaio',
    ensaios: 'ensaio',
};

export async function getDetalhe(req: Request, res: Response, next: NextFunction) {
    try {
        const { tipo, id } = req.params;
        const { dataInicio, dataFim } = req.query;

        const tipoNormalizado = TIPO_MAP[tipo];
        if (!tipoNormalizado) {
            return res.status(400).json({ ok: false, error: 'Tipo inválido' });
        }

        const data = await DetalheService.getDetalheCompleto({
            tipo: tipoNormalizado,
            id: isNaN(Number(id)) ? id : Number(id),
            dataInicio: String(dataInicio),
            dataFim: String(dataFim),
        });

        res.json({ ok: true, data });
    } catch (err) {
        next(err);
    }
}

export async function getCentrosCustoPorEnsaio(req: Request, res: Response, next: NextFunction) {
  try {
    const { codEnsaio } = req.params;
    const { dataInicio, dataFim } = req.query;

    const data = await DetalheService.getCentrosCustoPorEnsaio({
      codEnsaio: Number(codEnsaio),
      dataInicio: String(dataInicio),
      dataFim: String(dataFim),
    });

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCentrosCustoPorProdutoEEnsaio(req: Request, res: Response, next: NextFunction) {
  try {
    const { codProduto, codEnsaio } = req.params;
    const { dataInicio, dataFim } = req.query;

    const data = await DetalheService.getCentrosCustoPorProdutoEEnsaio({
      codProduto: String(codProduto),
      codEnsaio: Number(codEnsaio),
      dataInicio: String(dataInicio),
      dataFim: String(dataFim),
    });

    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getResumoDetalheIAController(req: Request, res: Response, next: NextFunction) {
  try {
    const { tipo, id } = req.params;
    const { dataInicio, dataFim } = req.query;

    const tipoNormalizado = TIPO_MAP[tipo];
    if (!tipoNormalizado) {
      return res.status(400).json({ ok: false, error: 'Tipo inválido' });
    }

    const resposta = await getResumoDetalheIA({
      tipo: tipoNormalizado,
      id: isNaN(Number(id)) ? id : Number(id),
      dataInicio: String(dataInicio),
      dataFim: String(dataFim),
    });

    res.json({ ok: true, data: resposta });
  } catch (err) {
    next(err);
  }
}
