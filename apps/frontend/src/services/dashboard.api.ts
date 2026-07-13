// apps/frontend/src/services/dashboard.api.ts
import { request } from './api';

interface FiltroPeriodo {
    filialId: number;
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
    informativos: KpiValor;
    naoConformidades: KpiValor;
    conformidade: { valor: number; meta: number };
}

// id é string para processos (ex: 'fermentacao', 'cip') e number para produtos/ensaios
export interface RankingItem {
    id: string | number;
    nome: string;
    amostras: number;
    nc: number;
}

export interface ProdutoRankingItem {
  id: number;
  nome: string;
  amostras: number;
  ensaios: number;
  nc: number;
}

export interface TipoProdutoRankingItem {
  tipo: string;
  amostras: number;
  ensaios: number;
  nc: number;
  produtos: ProdutoRankingItem[];
}

export const getKpisDashboard = (f: FiltroPeriodo) =>
    request<KpisDashboard>('/api/analitica/dashboard/kpis', { params: f });

export const getRankingProcessos = (f: FiltroPeriodo) =>
    request<RankingItem[]>('/api/analitica/dashboard/ranking/processos', { params: f });

export const getRankingProdutos = (f: FiltroPeriodo) =>
    request<TipoProdutoRankingItem[]>('/api/analitica/dashboard/ranking/produtos', { params: f });

export const getRankingEnsaios = (f: FiltroPeriodo) =>
    request<RankingItem[]>('/api/analitica/dashboard/ranking/ensaios', { params: f });
