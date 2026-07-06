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
        const { dataInicio, dataFim, filialId: filialIdStr } = req.query;
        const filialId = parseInt(filialIdStr as string);

        const tipoNormalizado = TIPO_MAP[tipo];
        if (!tipoNormalizado) {
            return res.status(400).json({ ok: false, error: 'Tipo inválido' });
        }
        if (!filialId || isNaN(filialId)) {
            return res.status(400).json({ ok: false, error: 'filialId é obrigatório.' });
        }

        const data = await DetalheService.getDetalheCompleto({
            tipo: tipoNormalizado,
            id: isNaN(Number(id)) ? id : Number(id),
            filialId,
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
    const { dataInicio, dataFim, filialId: filialIdStr } = req.query;
    const filialId = parseInt(filialIdStr as string);

    const tipoNormalizado = TIPO_MAP[tipo];
    if (!tipoNormalizado) {
      return res.status(400).json({ ok: false, error: 'Tipo inválido' });
    }
    if (!filialId || isNaN(filialId)) {
      return res.status(400).json({ ok: false, error: 'filialId é obrigatório.' });
    }

    const resposta = await getResumoDetalheIA({
      tipo: tipoNormalizado,
      id: isNaN(Number(id)) ? id : Number(id),
      filialId,
      dataInicio: String(dataInicio),
      dataFim: String(dataFim),
    });

    res.json({ ok: true, data: resposta });
  } catch (err) {
    next(err);
  }
}
export async function getListaEnsaiosInformativosController(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim, filialId: filialIdStr } = req.query as Record<string, string>;
    const filialId = parseInt(filialIdStr);
    if (!filialId || isNaN(filialId)) {
      return res.status(400).json({ ok: false, error: 'filialId é obrigatório.' });
    }
    const data = await DetalheService.getListaEnsaiosInformativos({ dataInicio, dataFim, filialId });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getCentrosCustoPorInformativoController(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim, codEnsaio, filialId: filialIdStr } = req.query as Record<string, string>;
    const filialId = parseInt(filialIdStr);
    if (!filialId || isNaN(filialId)) {
      return res.status(400).json({ ok: false, error: 'filialId é obrigatório.' });
    }
    const data = await DetalheService.getCentrosCustoPorInformativo({
      dataInicio,
      dataFim,
      filialId,
      codEnsaio: Number(codEnsaio),
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getProdutosPorInformativoECentroController(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim, codEnsaio, codCentroCusto, filialId: filialIdStr } = req.query as Record<string, string>;
    const filialId = parseInt(filialIdStr);
    if (!filialId || isNaN(filialId)) {
      return res.status(400).json({ ok: false, error: 'filialId é obrigatório.' });
    }
    const data = await DetalheService.getProdutosPorInformativoECentro({
      dataInicio,
      dataFim,
      filialId,
      codEnsaio: Number(codEnsaio),
      codCentroCusto: Number(codCentroCusto),
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}

export async function getAmostrasPorInformativoECentroEProdutoController(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim, codEnsaio, codCentroCusto, codProduto, valor, filialId: filialIdStr } = req.query as Record<string, string>;
    const filialId = parseInt(filialIdStr);
    if (!filialId || isNaN(filialId)) {
      return res.status(400).json({ ok: false, error: 'filialId é obrigatório.' });
    }
    const data = await DetalheService.getAmostrasPorInformativoECentroEProduto({
      dataInicio,
      dataFim,
      filialId,
      codEnsaio: Number(codEnsaio),
      codCentroCusto: Number(codCentroCusto),
      codProduto: Number(codProduto),
      valor: valor || null,
    });
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
