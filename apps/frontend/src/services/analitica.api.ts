// apps/frontend/src/services/analitica.api.ts
import { request } from './api';
import type { ContextoAnalise, Familia, ResultadoInspecao } from '@qlab/types';

const ANALITICA_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_ANALITICA_TIMEOUT_MS ?? 180000) || 180000;

interface RespostaAnalitica {
    familia: Familia;
    inspecao: ResultadoInspecao;
    dados: Record<string, unknown>;
}

// Endpoint principal — inspeção + família completa em paralelo
export const rodarAnalitica = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<RespostaAnalitica>('/api/analitica/rodar', { method: 'POST', body: ctx }, timeoutMs);

export const inspecionarEnsaio = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<ResultadoInspecao>('/api/inspecao', { method: 'POST', body: ctx }, timeoutMs);

// Endpoints individuais — lazy load por visualização
export const getSerie = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/numerico/serie', { method: 'POST', body: ctx }, timeoutMs);

export const getEstatisticas = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/numerico/estatisticas', { method: 'POST', body: ctx }, timeoutMs);

export const getHistograma = (ctx: ContextoAnalise, bins = 10, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>(`/api/analitica/numerico/histograma?bins=${bins}`, { method: 'POST', body: ctx }, timeoutMs);

export const getShewhart = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/numerico/shewhart', { method: 'POST', body: ctx }, timeoutMs);

export const getFaixaDist = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/faixa/distribuicao', { method: 'POST', body: ctx }, timeoutMs);

export const getFaixaSerie = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/faixa/serie', { method: 'POST', body: ctx }, timeoutMs);

export const getCatFreq = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/categorico/frequencia', { method: 'POST', body: ctx }, timeoutMs);

export const getCatSerie = (ctx: ContextoAnalise, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/categorico/serie', { method: 'POST', body: ctx }, timeoutMs);

export const getNumericoComparacao = (params: any, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<any>('/api/analitica/numerico/comparacao', { method: 'POST', body: params }, timeoutMs);

export const getFaixaComparacao = (params: any, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<any>('/api/analitica/faixa/comparacao', { method: 'POST', body: params }, timeoutMs);

export const getCategoricoComparacao = (params: any, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<any>('/api/analitica/categorico/comparacao', { method: 'POST', body: params }, timeoutMs);

export const getAmostraDetalhe = (codAmostra: string, codEnsaioAtual?: string, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>(`/api/analitica/amostra/${encodeURIComponent(codAmostra)}`, {
        method: 'GET',
        params: { ensaio: codEnsaioAtual },
    }, timeoutMs);

export const getAmostrasPorBin = (ctx: ContextoAnalise, binInicio: number, binFim: number, timeoutMs = ANALITICA_REQUEST_TIMEOUT_MS) =>
    request<unknown[]>('/api/analitica/amostra/por-bin', {
        method: 'POST',
        body: { ...ctx, binInicio, binFim },
    }, timeoutMs);