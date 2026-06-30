// apps/backend/src/controllers/analitica.controller.ts

import type { Request, Response, NextFunction } from 'express';
import { inspecionarEnsaio } from '../services/inspecao.service';
import {
    numericoSerieTemporal,
    numericoEstatisticas,
    numericoHistograma,
    numericoShewhart,
    faixaDistribuicao,
    faixaSerieTemporal,
    categoricoFrequencia,
    categoricoSerieTemporal,
    numericoComparacao,
    faixaComparacao,
    categoricoComparacao,
    getDetalheAmostra,
    getAmostrasPorBin,
    getKpisDashboard,
    getRankingProcessos,
    getRankingProdutos,
    getRankingEnsaios,
} from '../services/analitica.service';
import { contextoCompleto } from '@qlab/types';
import type { ContextoAnalise } from '@qlab/types';

// ─── Helper ───────────────────────────────────────────────────────────────────

function extrairContexto(body: unknown): ContextoAnalise | null {
    const ctx = body as Partial<ContextoAnalise>;
    if (!contextoCompleto(ctx)) return null;
    return ctx;
}

// ─── POST /api/analitica/rodar ────────────────────────────────────────────────
// Endpoint principal — roda inspeção + todas as queries da família em paralelo

export async function handleRotar(
    req: Request, res: Response, next: NextFunction,
): Promise<void> {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) {
            res.status(400).json({ erro: 'Contexto incompleto. Obrigatórios: codProduto, codCentroCusto, codEnsaio, dataInicio, dataFim.' });
            return;
        }

        // 1. Inspeção — determina a família
        const inspecao = await inspecionarEnsaio(ctx);
        const familia = inspecao.familia;

        // 2. Roda todas as queries da família em paralelo
        let dados: Record<string, unknown>;

        if (familia === 'NUMERICO') {
            const [serie, estatisticas, histograma, shewhart] = await Promise.all([
                numericoSerieTemporal(ctx),
                numericoEstatisticas(ctx),
                numericoHistograma(ctx),
                numericoShewhart(ctx),
            ]);
            dados = { serie, estatisticas, histograma, shewhart };

        } else if (familia === 'FAIXA') {
            const [distribuicao, serie] = await Promise.all([
                faixaDistribuicao(ctx),
                faixaSerieTemporal(ctx),
            ]);
            dados = { distribuicao, serie };

        } else {
            // CATEGORICO
            const [frequencia, serie] = await Promise.all([
                categoricoFrequencia(ctx),
                categoricoSerieTemporal(ctx),
            ]);
            dados = { frequencia, serie };
        }

        res.json({ familia, inspecao, dados });

    } catch (err) { next(err); }
}

// ─── Endpoints individuais — usados para lazy load de visualizações ──────────

export async function handleNumericoSerie(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        res.json(await numericoSerieTemporal(ctx));
    } catch (err) { next(err); }
}

export async function handleNumericoEstatisticas(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        res.json(await numericoEstatisticas(ctx));
    } catch (err) { next(err); }
}

export async function handleNumericoHistograma(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        const numBins = Number(req.query.bins ?? 10);
        res.json(await numericoHistograma(ctx, numBins));
    } catch (err) { next(err); }
}

export async function handleNumericoShewhart(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        res.json(await numericoShewhart(ctx));
    } catch (err) { next(err); }
}

export async function handleFaixaDistribuicao(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        res.json(await faixaDistribuicao(ctx));
    } catch (err) { next(err); }
}

export async function handleFaixaSerie(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        res.json(await faixaSerieTemporal(ctx));
    } catch (err) { next(err); }
}

export async function handleCategoricoFrequencia(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        res.json(await categoricoFrequencia(ctx));
    } catch (err) { next(err); }
}

export async function handleCategoricoSerie(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }
        res.json(await categoricoSerieTemporal(ctx));
    } catch (err) { next(err); }
}

const validGranularidades = ['dia', 'semana', 'mes', 'trimestre', 'ano'];

export async function handleNumericoComparacao(req: Request, res: Response, next: NextFunction) {
    try {
        const params = req.body;
        if (!params || !params.modo) {
            res.status(400).json({ erro: 'Modo não especificado.' });
            return;
        }
        if (params.modo === 'granularidade') {
            if (!validGranularidades.includes(params.granularidade)) {
                res.status(400).json({ erro: `Granularidade inválida. Permitidos: ${validGranularidades.join(', ')}` });
                return;
            }
        }
        res.json(await numericoComparacao(params));
    } catch (err) { next(err); }
}
export async function handleDetalheAmostra(req: Request, res: Response, next: NextFunction) {
    try {
        const codAmostra = req.params.codAmostra;
        const codEnsaioAtual = typeof req.query.ensaio === 'string' ? req.query.ensaio : undefined;

        if (!codAmostra) {
            res.status(400).json({ erro: 'codAmostra é obrigatório.' });
            return;
        }

        res.json(await getDetalheAmostra(codAmostra, codEnsaioAtual));
    } catch (err) { next(err); }
}

export async function handleAmostrasPorBin(req: Request, res: Response, next: NextFunction) {
    try {
        const ctx = extrairContexto(req.body);
        if (!ctx) { res.status(400).json({ erro: 'Contexto incompleto.' }); return; }

        const binInicio = Number(req.body.binInicio);
        const binFim = Number(req.body.binFim);

        if (isNaN(binInicio) || isNaN(binFim)) {
            res.status(400).json({ erro: 'binInicio e binFim devem ser números.' });
            return;
        }

        res.json(await getAmostrasPorBin(ctx, binInicio, binFim));
    } catch (err) { next(err); }
}
export async function handleFaixaComparacao(req: Request, res: Response, next: NextFunction) {
    try {
        const params = req.body;
        if (!params || !params.modo) {
            res.status(400).json({ erro: 'Modo não especificado.' });
            return;
        }
        if (params.modo === 'granularidade') {
            if (!validGranularidades.includes(params.granularidade)) {
                res.status(400).json({ erro: `Granularidade inválida. Permitidos: ${validGranularidades.join(', ')}` });
                return;
            }
        }
        res.json(await faixaComparacao(params));
    } catch (err) { next(err); }
}

export async function handleCategoricoComparacao(req: Request, res: Response, next: NextFunction) {
    try {
        const params = req.body;
        if (!params || !params.modo) {
            res.status(400).json({ erro: 'Modo não especificado.' });
            return;
        }
        if (params.modo === 'granularidade') {
            if (!validGranularidades.includes(params.granularidade)) {
                res.status(400).json({ erro: `Granularidade inválida. Permitidos: ${validGranularidades.join(', ')}` });
                return;
            }
        }
        res.json(await categoricoComparacao(params));
    } catch (err) { next(err); }
}

export async function handleKpisDashboard(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim } = req.query as { dataInicio: string; dataFim: string };
    if (!dataInicio || !dataFim) {
      res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
      return;
    }
    res.json(await getKpisDashboard({ dataInicio, dataFim }));
  } catch (err) { next(err); }
}

export async function handleRankingProcessos(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim } = req.query as { dataInicio: string; dataFim: string };
    if (!dataInicio || !dataFim) {
      res.status(400).json({ erro: 'dataInicio e dataFim são obrigatórios.' });
      return;
    }
    const ranking = await getRankingProcessos({ dataInicio, dataFim });
    res.json(ranking);
  } catch (err) { next(err); }
}

export async function handleRankingProdutos(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim } = req.query as { dataInicio: string; dataFim: string };
    res.json(await getRankingProdutos({ dataInicio, dataFim }));
  } catch (err) { next(err); }
}

export async function handleRankingEnsaios(req: Request, res: Response, next: NextFunction) {
  try {
    const { dataInicio, dataFim } = req.query as { dataInicio: string; dataFim: string };
    res.json(await getRankingEnsaios({ dataInicio, dataFim }));
  } catch (err) { next(err); }
}