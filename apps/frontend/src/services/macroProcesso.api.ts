// apps/frontend/src/services/macroProcesso.api.ts

import { request } from './api';

export interface MacroProcessoResumo {
  origem: string;
  n_amostras: number;
  n_nao_conforme: number;
}

export interface MacroProcessoListaResponse {
  ok: boolean;
  data: MacroProcessoResumo[];
}

export interface MacroProcessoDetalheResponse {
  ok: boolean;
  data: any[];
}

export const macroProcessoApi = {
  getLista: (dataInicio: string, dataFim: string) =>
    request<MacroProcessoListaResponse>('/api/macro-processo', {
      params: { dataInicio, dataFim },
    }),

  getDetalhe: (
    origem: string,
    natureza: 'produto' | 'processo',
    dataInicio: string,
    dataFim: string,
  ) =>
    request<MacroProcessoDetalheResponse>(`/api/macro-processo/${origem}/${natureza}`, {
      params: { dataInicio, dataFim },
    }),
};
