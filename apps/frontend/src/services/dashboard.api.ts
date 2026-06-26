// apps/frontend/src/services/dashboard.api.ts
import { request } from './api';

interface FiltroPeriodo {
    dataInicio: string;
    dataFim: string;
}

interface KpiValor {
    valor: number;
    deltaPct: number | null;
}

interface KpisDashboard {
    amostras: KpiValor;
    ensaios: KpiValor;
    naoConformidades: KpiValor;
    conformidade: { valor: number; meta: number };
}

export interface RankingItem {
    id: number;
    nome: string;
    amostras: number;
    nc: number;
    tem_produto?: boolean;
    tem_processo?: boolean;
}

export const getKpisDashboard = (f: FiltroPeriodo) =>
    request<KpisDashboard>('/api/analitica/dashboard/kpis', { params: f });

export const getRankingProcessos = (f: FiltroPeriodo) =>
    request<RankingItem[]>('/api/analitica/dashboard/ranking/processos', { params: f });

export const getRankingProdutos = (f: FiltroPeriodo) =>
    request<RankingItem[]>('/api/analitica/dashboard/ranking/produtos', { params: f });

export const getRankingEnsaios = (f: FiltroPeriodo) =>
    request<RankingItem[]>('/api/analitica/dashboard/ranking/ensaios', { params: f });
