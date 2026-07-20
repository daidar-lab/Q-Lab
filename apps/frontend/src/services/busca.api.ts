// apps/frontend/src/services/busca.api.ts
// Funções de acesso ao backend do buscador — usa o request() existente com JWT injetado.

import { request } from './api';

export interface CatalogoItem {
  id: number;
  nome: string;
}

export interface TipoCatalogoItem {
  tipo: string;
  produtos: CatalogoItem[];
}

export interface Catalogo {
  produtos: CatalogoItem[];
  ensaios: CatalogoItem[];
  tipos: TipoCatalogoItem[];
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
  signal?: AbortSignal;
}

export interface AgregacoesBuscaResponse {
  kpis: {
    totalResultados: number;
    naoConformes: number;
    taxaConformidade: number;
    ensaiosIds: number[];
    produtosIds: number[];
  };
  graficoConformidade: {
    periodo: string;
    conforme: number;
    naoConforme: number;
  }[];
  pontosEspecificacao: SearchResultRow[];
}

export async function fetchBuscaAgregacoes(p: BuscaParams): Promise<AgregacoesBuscaResponse> {
  const params: Record<string, any> = {
    filialId:   p.filialId,
    dataInicio: p.dataInicio,
    dataFim:    p.dataFim,
    'processos[]': p.processos ?? [],
    'produtos[]':  p.produtos  ?? [],
    'ensaios[]':   p.ensaios   ?? [],
  };

  const res = await request<{ ok: boolean; data: AgregacoesBuscaResponse }>(
    '/api/busca/agregacoes',
    { params, signal: p.signal },
    35_000,
  );
  return res.data;
}

export interface PaginacaoParams extends BuscaParams {
  limit?: number;
  offset?: number;
}

export async function fetchBuscaResultados(p: PaginacaoParams): Promise<SearchResultRow[]> {
  const params: Record<string, any> = {
    filialId:   p.filialId,
    dataInicio: p.dataInicio,
    dataFim:    p.dataFim,
    limit:      p.limit,
    offset:     p.offset,
    'processos[]': p.processos ?? [],
    'produtos[]':  p.produtos  ?? [],
    'ensaios[]':   p.ensaios   ?? [],
  };

  const res = await request<{ ok: boolean; data: SearchResultRow[] }>(
    '/api/busca/resultados',
    { params, signal: p.signal },
    35_000,
  );
  return res.data;
}
