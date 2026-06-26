// apps/frontend/src/services/resumo-dashboard.api.ts

import { request } from './api';

export interface RespostaIA {
  texto: string;
  destaques?: { valor: string; tipo: 'positivo' | 'critico' | 'neutro' }[];
  acoes?: string[];
}

export const resumoDashboardApi = {
  getResumo: (dataInicio: string, dataFim: string) =>
    request<{ ok: boolean; data: RespostaIA }>(
      '/api/resumo-dashboard',
      { params: { dataInicio, dataFim } },
    ),
};
