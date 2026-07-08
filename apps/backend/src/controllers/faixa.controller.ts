import type { Request, Response, NextFunction } from 'express';
import { getExplosaoFaixas, getProdutosPorFaixa, getHistoricoProdutosFaixa, getProdutosSemFaixa, getHistoricoProdutosSemFaixa } from '../services/faixa.service';

/**
 * Validates date string in YYYY-MM-DD format
 */
function isValidDate(dateStr: string): boolean {
    return /^\d{4}-\d{2}-\d{2}$/.test(dateStr) && !isNaN(Date.parse(dateStr));
}

/**
 * GET /api/analitica/detalhe/faixas
 */
export async function handleGetFaixas(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id, codEnsaio, dataInicio, dataFim, filialId: filialIdStr, operacao: operacaoStr } = req.query;
        const filialId = parseInt(filialIdStr as string);
        const operacao = operacaoStr ? String(operacaoStr) : undefined;

        if (!id || typeof id !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "id" (código do centro de custo) é obrigatório.' });
            return;
        }

        if (!codEnsaio || typeof codEnsaio !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "codEnsaio" é obrigatório.' });
            return;
        }

        if (!dataInicio || typeof dataInicio !== 'string' || !isValidDate(dataInicio)) {
            res.status(400).json({ erro: 'O parâmetro "dataInicio" deve estar no formato YYYY-MM-DD.' });
            return;
        }

        if (!dataFim || typeof dataFim !== 'string' || !isValidDate(dataFim)) {
            res.status(400).json({ erro: 'O parâmetro "dataFim" deve estar no formato YYYY-MM-DD.' });
            return;
        }

        if (!filialId || isNaN(filialId)) {
            res.status(400).json({ erro: 'filialId é obrigatório.' });
            return;
        }

        const result = await getExplosaoFaixas(id, codEnsaio, dataInicio, dataFim, filialId, operacao);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/analitica/detalhe/faixas/produtos
 */
export async function handleGetProdutosPorFaixa(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id, codEnsaio, lie, lse, dataInicio, dataFim, filialId: filialIdStr, operacao: operacaoStr } = req.query;
        const filialId = parseInt(filialIdStr as string);
        const operacao = operacaoStr ? String(operacaoStr) : undefined;

        if (id === undefined || id === null || typeof id !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "id" é obrigatório e deve ser texto.' });
            return;
        }

        if (!codEnsaio || typeof codEnsaio !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "codEnsaio" é obrigatório.' });
            return;
        }

        if (lie === undefined || lie === null || typeof lie !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "lie" é obrigatório.' });
            return;
        }

        if (lse === undefined || lse === null || typeof lse !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "lse" é obrigatório.' });
            return;
        }

        const parsedLie = Number(lie.replace(',', '.'));
        const parsedLse = Number(lse.replace(',', '.'));

        if (isNaN(parsedLie)) {
            res.status(400).json({ erro: 'O parâmetro "lie" deve ser um valor numérico válido.' });
            return;
        }

        if (isNaN(parsedLse)) {
            res.status(400).json({ erro: 'O parâmetro "lse" deve ser um valor numérico válido.' });
            return;
        }

        if (!dataInicio || typeof dataInicio !== 'string' || !isValidDate(dataInicio)) {
            res.status(400).json({ erro: 'O parâmetro "dataInicio" deve estar no formato YYYY-MM-DD.' });
            return;
        }

        if (!dataFim || typeof dataFim !== 'string' || !isValidDate(dataFim)) {
            res.status(400).json({ erro: 'O parâmetro "dataFim" deve estar no formato YYYY-MM-DD.' });
            return;
        }

        if (!filialId || isNaN(filialId)) {
            res.status(400).json({ erro: 'filialId é obrigatório.' });
            return;
        }

        const result = await getProdutosPorFaixa(id, codEnsaio, parsedLie, parsedLse, dataInicio, dataFim, filialId, operacao);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/analitica/detalhe/faixas/produtos/historico
 */
export async function handleGetHistoricoProdutosFaixa(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id, codEnsaio, lie, lse, dataInicio, dataFim, produtos, filialId: filialIdStr, operacao: operacaoStr } = req.query;
        const filialId = parseInt(filialIdStr as string);
        const operacao = operacaoStr ? String(operacaoStr) : undefined;

        if (!id || typeof id !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "id" (código do centro de custo) é obrigatório.' });
            return;
        }

        if (!codEnsaio || typeof codEnsaio !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "codEnsaio" é obrigatório.' });
            return;
        }

        let parsedLie: number | undefined;
        let parsedLse: number | undefined;

        if (lie !== undefined && lie !== null && typeof lie === 'string' && lie !== '') {
            parsedLie = Number(lie.replace(',', '.'));
            if (isNaN(parsedLie)) {
                res.status(400).json({ erro: 'O parâmetro "lie" deve ser um valor numérico válido.' });
                return;
            }
        }

        if (lse !== undefined && lse !== null && typeof lse === 'string' && lse !== '') {
            parsedLse = Number(lse.replace(',', '.'));
            if (isNaN(parsedLse)) {
                res.status(400).json({ erro: 'O parâmetro "lse" deve ser um valor numérico válido.' });
                return;
            }
        }

        if (!dataInicio || typeof dataInicio !== 'string' || !isValidDate(dataInicio)) {
            res.status(400).json({ erro: 'O parâmetro "dataInicio" deve estar no formato YYYY-MM-DD.' });
            return;
        }

        if (!dataFim || typeof dataFim !== 'string' || !isValidDate(dataFim)) {
            res.status(400).json({ erro: 'O parâmetro "dataFim" deve estar no formato YYYY-MM-DD.' });
            return;
        }

        if (!filialId || isNaN(filialId)) {
            res.status(400).json({ erro: 'filialId é obrigatório.' });
            return;
        }

        let parsedProdutos: string[] = [];
        if (typeof produtos === 'string') {
            parsedProdutos = produtos.split(',').filter(Boolean);
        } else if (Array.isArray(produtos)) {
            parsedProdutos = produtos.map(p => String(p));
        }

        if (parsedProdutos.length === 0) {
            res.json([]);
            return;
        }

        const result = await getHistoricoProdutosFaixa(id, codEnsaio, parsedLie, parsedLse, dataInicio, dataFim, parsedProdutos, filialId, operacao);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/analitica/detalhe/faixas/sem-faixa/produtos
 */
export async function handleGetProdutosSemFaixa(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id, codEnsaio, dataInicio, dataFim, filialId: filialIdStr, operacao: operacaoStr } = req.query;
        const filialId = parseInt(filialIdStr as string);
        const operacao = operacaoStr ? String(operacaoStr) : undefined;

        if (!id || typeof id !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "id" é obrigatório.' });
            return;
        }
        if (!codEnsaio || typeof codEnsaio !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "codEnsaio" é obrigatório.' });
            return;
        }
        if (!dataInicio || typeof dataInicio !== 'string' || !isValidDate(dataInicio)) {
            res.status(400).json({ erro: 'O parâmetro "dataInicio" deve estar no formato YYYY-MM-DD.' });
            return;
        }
        if (!dataFim || typeof dataFim !== 'string' || !isValidDate(dataFim)) {
            res.status(400).json({ erro: 'O parâmetro "dataFim" deve estar no formato YYYY-MM-DD.' });
            return;
        }
        if (!filialId || isNaN(filialId)) {
            res.status(400).json({ erro: 'filialId é obrigatório.' });
            return;
        }

        const result = await getProdutosSemFaixa(id, codEnsaio, dataInicio, dataFim, filialId, operacao);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

/**
 * GET /api/analitica/detalhe/faixas/sem-faixa/historico
 */
export async function handleGetHistoricoProdutosSemFaixa(
    req: Request,
    res: Response,
    next: NextFunction
): Promise<void> {
    try {
        const { id, codEnsaio, dataInicio, dataFim, produtos, filialId: filialIdStr, operacao: operacaoStr } = req.query;
        const filialId = parseInt(filialIdStr as string);
        const operacao = operacaoStr ? String(operacaoStr) : undefined;

        if (!id || typeof id !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "id" é obrigatório.' });
            return;
        }
        if (!codEnsaio || typeof codEnsaio !== 'string') {
            res.status(400).json({ erro: 'O parâmetro "codEnsaio" é obrigatório.' });
            return;
        }
        if (!dataInicio || typeof dataInicio !== 'string' || !isValidDate(dataInicio)) {
            res.status(400).json({ erro: 'O parâmetro "dataInicio" deve estar no formato YYYY-MM-DD.' });
            return;
        }
        if (!dataFim || typeof dataFim !== 'string' || !isValidDate(dataFim)) {
            res.status(400).json({ erro: 'O parâmetro "dataFim" deve estar no formato YYYY-MM-DD.' });
            return;
        }
        if (!filialId || isNaN(filialId)) {
            res.status(400).json({ erro: 'filialId é obrigatório.' });
            return;
        }

        let parsedProdutos: string[] = [];
        if (typeof produtos === 'string') {
            parsedProdutos = produtos.split(',').filter(Boolean);
        } else if (Array.isArray(produtos)) {
            parsedProdutos = produtos.map(p => String(p));
        }

        if (parsedProdutos.length === 0) {
            res.json([]);
            return;
        }

        const result = await getHistoricoProdutosSemFaixa(id, codEnsaio, dataInicio, dataFim, parsedProdutos, filialId, operacao);
        res.json(result);
    } catch (err) {
        next(err);
    }
}

