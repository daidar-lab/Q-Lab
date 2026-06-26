// apps/backend/src/controllers/opcoes.controller.ts
//
// Responsabilidade: receber a requisição, extrair e validar os parâmetros,
// chamar o service correto e devolver a resposta.
//
// Todos os endpoints exigem período (dataInicio + dataFim) — sem eles a query
// não roda. Os demais parâmetros são opcionais e restringem as opções retornadas.

import type { Request, Response, NextFunction } from 'express';
import {
    getProdutos,
    getCentros,
    getBens,
    getSkipLotes,
    getEnsaios,
    buscarEnsaios,
    buscarProdutos,
} from '../services/opcoes.service';
import { periodoPreenchido } from '@qlab/types';

// ─── Guard de período ────────────────────────────────────────────────────────

function extrairFiltros(query: Request['query']) {
    const { dataInicio, dataFim, codProduto, codCentroCusto, codEnsaio, codBem, codSkipLote } = query;

    return {
        dataInicio: dataInicio as string | undefined,
        dataFim: dataFim as string | undefined,
        codProduto: codProduto ? Number(codProduto) : null,
        codCentroCusto: codCentroCusto ? parseFloat(String(codCentroCusto)) : null,  // float no banco
        codEnsaio: codEnsaio ? Number(codEnsaio) : null,
        codBem: codBem ? Number(codBem) : null,
        codSkipLote: codSkipLote ? String(codSkipLote) : null,  // varchar(255) — sempre string
    };
}

function validarPeriodo(res: Response, dataInicio?: string, dataFim?: string): boolean {
    if (!dataInicio || !dataFim) {
        res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
        return false;
    }
    // Validação básica de formato YYYY-MM-DD
    const re = /^\d{4}-\d{2}-\d{2}$/;
    if (!re.test(dataInicio) || !re.test(dataFim)) {
        res.status(400).json({ erro: 'Formato de data inválido. Use YYYY-MM-DD.' });
        return false;
    }
    if (dataInicio > dataFim) {
        res.status(400).json({ erro: 'dataInicio não pode ser maior que dataFim.' });
        return false;
    }
    return true;
}

// ─── GET /api/opcoes/produtos ────────────────────────────────────────────────
// Filtros ativos: período + qualquer combinação de centro/ensaio/bem/skipLote
// Entrada direta: se usuário começou pelo ensaio, produtos são filtrados por ele

export async function handleGetProdutos(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const f = extrairFiltros(req.query);
        if (!validarPeriodo(res, f.dataInicio, f.dataFim)) return;
        const dados = await getProdutos(f as any);
        res.json(dados);
    } catch (err) { next(err); }
}

// ─── GET /api/opcoes/centros ─────────────────────────────────────────────────

export async function handleGetCentros(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const f = extrairFiltros(req.query);
        if (!validarPeriodo(res, f.dataInicio, f.dataFim)) return;
        const dados = await getCentros(f as any);
        res.json(dados);
    } catch (err) { next(err); }
}

// ─── GET /api/opcoes/bens ────────────────────────────────────────────────────
// Resposta inclui `skip: true` quando lista vazia — frontend pula o nível automaticamente

export async function handleGetBens(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const f = extrairFiltros(req.query);
        if (!validarPeriodo(res, f.dataInicio, f.dataFim)) return;
        const dados = await getBens(f as any);
        res.json({ bens: dados, skip: dados.length === 0 });
    } catch (err) { next(err); }
}

// ─── GET /api/opcoes/skip-lotes ──────────────────────────────────────────────

export async function handleGetSkipLotes(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const f = extrairFiltros(req.query);
        if (!validarPeriodo(res, f.dataInicio, f.dataFim)) return;
        const dados = await getSkipLotes(f as any);
        res.json(dados);
    } catch (err) { next(err); }
}

// ─── GET /api/opcoes/ensaios ─────────────────────────────────────────────────
// Retorna DNA do ensaio (tipo) — elimina necessidade de query de descoberta separada

export async function handleGetEnsaios(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const f = extrairFiltros(req.query);
        if (!validarPeriodo(res, f.dataInicio, f.dataFim)) return;
        const dados = await getEnsaios(f as any);
        res.json(dados);
    } catch (err) { next(err); }
}

// ─── GET /api/opcoes/buscar/ensaios?termo=...  ───────────────────────────────
// Entrada direta — key user digita nome/código do ensaio

export async function handleBuscarEnsaios(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const f = extrairFiltros(req.query);
        if (!validarPeriodo(res, f.dataInicio, f.dataFim)) return;
        const termo = String(req.query.termo ?? '').trim();
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;
        const dados = await buscarEnsaios(termo, f as any, { limit, offset });
        res.json(dados);
    } catch (err) { next(err); }
}

// ─── GET /api/opcoes/buscar/produtos?termo=... ───────────────────────────────

export async function handleBuscarProdutos(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const f = extrairFiltros(req.query);
        if (!validarPeriodo(res, f.dataInicio, f.dataFim)) return;
        const termo = String(req.query.termo ?? '').trim();
        const limit = Number(req.query.limit) || 20;
        const offset = Number(req.query.offset) || 0;
        const dados = await buscarProdutos(termo, f as any, { limit, offset });
        res.json(dados);
    } catch (err) { next(err); }
}