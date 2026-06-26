// apps/frontend/src/services/opcoes.api.ts
import { request } from './api';
import type {
    OpcaoProduto, OpcaoCentro, OpcaoBem,
    OpcaoSkipLote, OpcaoEnsaio,
} from '@qlab/types';

interface FiltrosOpcoes {
    dataInicio: string;
    dataFim: string;
    codProduto?: number;
    codCentroCusto?: number;
    codEnsaio?: number;
    codBem?: number;
    codSkipLote?: string | string[];
}

function toParams(f: FiltrosOpcoes) {
    return {
        dataInicio: f.dataInicio,
        dataFim: f.dataFim,
        codProduto: f.codProduto,
        codCentroCusto: f.codCentroCusto,
        codEnsaio: f.codEnsaio,
        codBem: f.codBem,
        codSkipLote: f.codSkipLote,
    };
}

export const getProdutos = (f: FiltrosOpcoes) =>
    request<OpcaoProduto[]>('/api/opcoes/produtos', { params: toParams(f) });

export const getCentros = (f: FiltrosOpcoes) =>
    request<OpcaoCentro[]>('/api/opcoes/centros', { params: toParams(f) });

export const getBens = (f: FiltrosOpcoes) =>
    request<{ bens: OpcaoBem[]; skip: boolean }>('/api/opcoes/bens', { params: toParams(f) });

export const getSkipLotes = (f: FiltrosOpcoes) =>
    request<OpcaoSkipLote[]>('/api/opcoes/skip-lotes', { params: toParams(f) });

export const getEnsaios = (f: FiltrosOpcoes) =>
    request<OpcaoEnsaio[]>('/api/opcoes/ensaios', { params: toParams(f) });

export const buscarEnsaios = (
  termo: string,
  f: FiltrosOpcoes,
  pagination: { limit?: number; offset?: number } = { limit: 20, offset: 0 }
) =>
  request<OpcaoEnsaio[]>(
    '/api/opcoes/buscar/ensaios',
    { params: { ...toParams(f), termo, ...pagination } },
    undefined,
    2
  );

export const buscarProdutos = (
  termo: string,
  f: FiltrosOpcoes,
  pagination: { limit?: number; offset?: number } = { limit: 20, offset: 0 }
) =>
  request<OpcaoProduto[]>(
    '/api/opcoes/buscar/produtos',
    { params: { ...toParams(f), termo, ...pagination } },
    undefined,
    2
  );