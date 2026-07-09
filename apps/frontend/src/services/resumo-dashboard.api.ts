// apps/frontend/src/services/resumo-dashboard.api.ts

import { request } from './api';

export interface RespostaIA {
  texto: string;
  destaques?: { valor: string; tipo: 'positivo' | 'critico' | 'neutro' }[];
  acoes?: string[];
}

export const resumoDashboardApi = {
  getResumo: (dataInicio: string, dataFim: string, filialId: number, kpis: any, processos: any, ensaios: any, produtos: any) =>
    request<{ ok: boolean; data: RespostaIA }>(
      '/api/resumo-dashboard',
      {
        method: 'POST',
        body: { dataInicio, dataFim, filialId, kpis, processos, ensaios, produtos },
      },
    ),
};
