// apps/frontend/src/services/resumo-dashboard.api.ts

import { request } from './api';

export interface AcaoIA {
  tipo: 'processo' | 'ensaio';
  id: string | number;
  label: string;
}

export interface RespostaIA {
  texto: string;
  destaques?: string[];
  acoes?: AcaoIA[];
}

export const resumoDashboardApi = {
  getResumo: (dataInicio: string, dataFim: string, filialId: number, kpis: any, processos: any, ensaios: any, produtos: any, metaConformidade: number) =>
    request<{ ok: boolean; data: RespostaIA }>(
      '/api/resumo-dashboard',
      {
        method: 'POST',
        body: { dataInicio, dataFim, filialId, kpis, processos, ensaios, produtos, metaConformidade },
      },
    ),
};
