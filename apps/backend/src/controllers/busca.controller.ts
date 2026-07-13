// apps/backend/src/controllers/busca.controller.ts

import { Request, Response, NextFunction } from 'express';
import { getCatalogo, executarBusca } from '../services/busca.service';
import type { SearchTokens } from '../services/busca.service';

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

// GET /api/busca/resultados?filialId=X&dataInicio=...&dataFim=...
//   &processos[]=fermentacao&processos[]=cip-processo
//   &produtos[]=7&produtos[]=12
//   &ensaios[]=42
//
// O frontend parseia o query string livre e envia apenas os tokens classificados.
// Isso mantém zero queries no banco enquanto o usuário digita.
export async function handleBuscaResultados(req: Request, res: Response, next: NextFunction) {
  try {
    const filialId = parseInt(req.query.filialId as string);
    if (!filialId || isNaN(filialId)) {
      return res.status(400).json({ erro: 'filialId é obrigatório.' });
    }

    const dataInicio = req.query.dataInicio as string;
    const dataFim    = req.query.dataFim    as string;
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
    }

    // Arrays repetidos no querystring: processos[]=a&processos[]=b
    const toArray = (v: unknown): string[] => {
      if (!v) return [];
      return Array.isArray(v) ? (v as string[]).filter(Boolean) : [String(v)];
    };
    const toNumArray = (v: unknown): number[] =>
      toArray(v).map(Number).filter(n => !isNaN(n));

    const tokens: SearchTokens = {
      processos: toArray(req.query['processos[]'] ?? req.query.processos),
      produtos:  toNumArray(req.query['produtos[]'] ?? req.query.produtos),
      ensaios:   toNumArray(req.query['ensaios[]'] ?? req.query.ensaios),
      periodo:   { dataInicio, dataFim },
    };

    // Sem nenhum filtro classificado — retorna vazio imediatamente, não consulta o banco
    const semFiltros =
      tokens.processos.length === 0 &&
      tokens.produtos.length === 0 &&
      tokens.ensaios.length === 0;

    if (semFiltros) {
      return res.json({ ok: true, data: [] });
    }

    const data = await executarBusca(tokens, filialId);
    res.json({ ok: true, data });
  } catch (err) {
    next(err);
  }
}
