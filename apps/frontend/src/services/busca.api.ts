// apps/frontend/src/services/busca.api.ts
// Funções de acesso ao backend do buscador — usa o request() existente com JWT injetado.

import { request } from './api';

export interface CatalogoItem {
  id: number;
  nome: string;
}

export interface Catalogo {
  produtos: CatalogoItem[];
  ensaios: CatalogoItem[];
  carregadoEm: number;
}

export interface SearchResultRow {
  cod_amostra: number;
  cod_ensaio: number;
  ensaio: string;
  cod_produto: number;
  produto: string;
  lote_de_controle_de_qualidade: string;
  data_resultado: string;
  valor: string;
  conformidade: 'CONFORME' | 'NÃO CONFORME';
  limite_inferior: number | null;
  limite_superior: number | null;
  valor_alvo: number | null;
  operacao: string | null;
}

export async function fetchCatalogo(filialId: number): Promise<Catalogo> {
  return request<Catalogo>('/api/busca/catalogo', { params: { filialId } });
}

export interface BuscaParams {
  filialId: number;
  dataInicio: string;
  dataFim: string;
  processos?: string[];
  produtos?: number[];
  ensaios?: number[];
}

export async function fetchBuscaResultados(p: BuscaParams): Promise<SearchResultRow[]> {
  const params: Record<string, any> = {
    filialId:   p.filialId,
    dataInicio: p.dataInicio,
    dataFim:    p.dataFim,
    // Serializa arrays como chave repetida (api.ts já trata Array.isArray)
    'processos[]': p.processos ?? [],
    'produtos[]':  p.produtos  ?? [],
    'ensaios[]':   p.ensaios   ?? [],
  };

  const res = await request<{ ok: boolean; data: SearchResultRow[] }>(
    '/api/busca/resultados',
    { params },
    35_000, // 35s — margem sobre os 30s do backend
  );
  return res.data;
}
