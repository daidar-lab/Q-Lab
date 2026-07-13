// apps/backend/src/controllers/busca.controller.ts

import { Request, Response, NextFunction } from 'express';
import { getCatalogo, executarBusca, executarAgregacoesBusca } from '../services/busca.service';
import type { SearchTokens } from '../services/busca.service';

const parseTokens = (req: Request) => {
  const dataInicio = req.query.dataInicio as string;
  const dataFim    = req.query.dataFim    as string;

  const toArray = (v: unknown): string[] => {
    if (!v) return [];
    return Array.isArray(v) ? (v as string[]).filter(Boolean) : [String(v)];
  };
  const toNumArray = (v: unknown): number[] => toArray(v).map(Number).filter(n => !isNaN(n));

  return {
    processos: toArray(req.query['processos[]'] ?? req.query.processos),
    produtos:  toNumArray(req.query['produtos[]'] ?? req.query.produtos),
    ensaios:   toNumArray(req.query['ensaios[]'] ?? req.query.ensaios),
    periodo:   { dataInicio, dataFim },
  };
};

const hasFiltros = (t: SearchTokens) => t.processos.length > 0 || t.produtos.length > 0 || t.ensaios.length > 0;

// GET /api/busca/catalogo?filialId=X
export async function handleGetCatalogo(req: Request, res: Response, next: NextFunction) {
  try {
    const filialId = parseInt(req.query.filialId as string);
    if (!filialId || isNaN(filialId)) {
      return res.status(400).json({ erro: 'filialId é obrigatório.' });
    }
    const catalogo = await getCatalogo(filialId);
    res.json(catalogo);
  } catch (err) {
    next(err);
  }
}

// GET /api/busca/agregacoes?filialId=X&dataInicio=...&dataFim=...
export async function handleBuscaAgregacoes(req: Request, res: Response, next: NextFunction) {
  try {
    const filialId = parseInt(req.query.filialId as string);
    if (!filialId || isNaN(filialId)) return res.status(400).json({ erro: 'filialId é obrigatório.' });
    if (!req.query.dataInicio || !req.query.dataFim) return res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });

    const tokens = parseTokens(req);
    if (!hasFiltros(tokens)) {
      return res.json({
        ok: true,
        data: {
          kpis: { totalResultados: 0, naoConformes: 0, taxaConformidade: 0, ensaiosDistintos: 0, produtosDistintos: 0 },
          graficoConformidade: [],
          pontosEspecificacao: []
        }
      });
    }

    const agregacoes = await executarAgregacoesBusca(tokens, filialId);
    res.json({ ok: true, data: agregacoes });
  } catch (err) {
    next(err);
  }
}

// GET /api/busca/resultados?filialId=X&limit=Y&offset=Z&...
export async function handleBuscaResultados(req: Request, res: Response, next: NextFunction) {
  try {
    const filialId = parseInt(req.query.filialId as string);
    if (!filialId || isNaN(filialId)) return res.status(400).json({ erro: 'filialId é obrigatório.' });
    if (!req.query.dataInicio || !req.query.dataFim) return res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });

    const limit = parseInt(req.query.limit as string) || 500;
    const offset = parseInt(req.query.offset as string) || 0;

    const tokens = parseTokens(req);
    if (!hasFiltros(tokens)) return res.json({ ok: true, data: [] });

    const resultados = await executarBusca(tokens, filialId, limit, offset);
    res.json({ ok: true, data: resultados });
  } catch (err) {
    next(err);
  }
}
