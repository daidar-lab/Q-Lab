// apps/backend/src/services/opcoes.service.ts

import { blabQuery } from '../db/blab.pool';
import type {
  OpcaoProduto,
  OpcaoCentro,
  OpcaoBem,
  OpcaoSkipLote,
  OpcaoEnsaio,
} from '@qlab/types';

interface FiltrosBase {
  dataInicio: string;
  dataFim: string;
  codProduto?: number | null;
  codCentroCusto?: number | null;
  codEnsaio?: number | null;
  codBem?: number | null;
  codSkipLote?: string | string[] | null;
}

function buildWhere(f: FiltrosBase): { where: string; params: unknown[] } {
  const conditions: string[] = [
    'dw.D_E_L_E_T IS NULL',
    'dw.data_resultado BETWEEN ? AND ?',
    'dw.cod_centro_de_custo IS NOT NULL',
  ];
  const params: unknown[] = [f.dataInicio, f.dataFim];

  if (f.codProduto != null) {
    conditions.push('dw.cod_produto = ?');
    params.push(f.codProduto);
  }
  if (f.codCentroCusto != null) {
    conditions.push('dw.cod_centro_de_custo = ?');
    params.push(f.codCentroCusto);
  }
  if (f.codEnsaio != null) {
    conditions.push('dw.cod_ensaio = ?');
    params.push(f.codEnsaio);
  }
  if (f.codBem != null) {
    conditions.push('dw.cod_bem = ?');
    params.push(f.codBem);
  }
  if (f.codSkipLote != null) {
    const valores = Array.isArray(f.codSkipLote) ? f.codSkipLote : [f.codSkipLote];
    const placeholders = valores.map(() => '?').join(', ');
    conditions.push(`dw.cod_skip_lote IN (${placeholders})`);
    params.push(...valores.map(String));
  }

  return { where: conditions.join('\n  AND '), params };
}

export async function getProdutos(f: FiltrosBase): Promise<OpcaoProduto[]> {
  const { where, params } = buildWhere(f);
  return blabQuery<OpcaoProduto>(`
    SELECT DISTINCT dw.cod_produto AS codProduto, dw.produto AS produto
    FROM DW_FAT_RESULTADO dw
    WHERE ${where}
    ORDER BY dw.produto ASC
  `, params);
}

export async function getCentros(f: FiltrosBase): Promise<OpcaoCentro[]> {
  const { where, params } = buildWhere(f);
  return blabQuery<OpcaoCentro>(`
    SELECT DISTINCT dw.cod_centro_de_custo AS codCentroCusto, dw.centro_de_custo AS centroCusto
    FROM DW_FAT_RESULTADO dw
    WHERE ${where}
    ORDER BY dw.centro_de_custo ASC
  `, params);
}

export async function getBens(f: FiltrosBase): Promise<OpcaoBem[]> {
  const { where, params } = buildWhere(f);
  return blabQuery<OpcaoBem>(`
    SELECT DISTINCT dw.cod_bem AS codBem, dw.bem AS bem
    FROM DW_FAT_RESULTADO dw
    WHERE ${where}
      AND dw.cod_bem IS NOT NULL
    ORDER BY dw.bem ASC
  `, params);
}

export async function getSkipLotes(f: FiltrosBase): Promise<OpcaoSkipLote[]> {
  const { where, params } = buildWhere(f);
  return blabQuery<OpcaoSkipLote>(`
    SELECT DISTINCT dw.cod_skip_lote AS codSkipLote, dw.skip_lote AS skipLote
    FROM DW_FAT_RESULTADO dw
    WHERE ${where}
      AND dw.cod_skip_lote IS NOT NULL
    ORDER BY dw.skip_lote ASC
  `, params);
}

export async function getEnsaios(f: FiltrosBase): Promise<OpcaoEnsaio[]> {
  const { where, params } = buildWhere(f);
  return blabQuery<OpcaoEnsaio>(`
    SELECT DISTINCT
      dw.cod_ensaio               AS codEnsaio,
      dw.ensaio                   AS ensaio,
      tr.cod_tipo_de_resultado    AS codTipoResultado,
      tr.descricao                AS tipoDescricao,
      tr.abreviatura              AS tipoAbreviatura
    FROM DW_FAT_RESULTADO dw
    JOIN DIM_ENSAIO_X_TIPO_DE_RESULTADO extr
      ON extr.cod_ensaio = dw.cod_ensaio AND extr.D_E_L_E_T IS NULL
    JOIN DIM_TIPO_DE_RESULTADO tr
      ON tr.cod_tipo_de_resultado = extr.cod_tipo_de_resultado AND tr.D_E_L_E_T IS NULL
    WHERE ${where}
    ORDER BY dw.ensaio ASC
  `, params);
}

// Updated buscarEnsaios with pagination support
export async function buscarEnsaios(
  termo: string,
  f: FiltrosBase,
  pagination: { limit?: number; offset?: number } = { limit: 20, offset: 0 }
): Promise<OpcaoEnsaio[]> {
  const { where, params } = buildWhere(f);
  const words = termo.trim().split(/\s+/).filter(Boolean);

  let searchWhere = '';
  const searchParams: unknown[] = [];

  if (words.length > 0) {
    searchWhere = 'AND dw.ensaio LIKE ?';
    searchParams.push(`${words[0]}%`);
    for (let i = 1; i < words.length; i++) {
      searchWhere += ' AND dw.ensaio LIKE ?';
      searchParams.push(`%${words[i]}%`);
    }
  }

  const limit = pagination.limit ?? 20;
  const offset = pagination.offset ?? 0;

  return blabQuery<OpcaoEnsaio>(`
    SELECT DISTINCT
      dw.cod_ensaio               AS codEnsaio,
      dw.ensaio                   AS ensaio,
      tr.cod_tipo_de_resultado    AS codTipoResultado,
      tr.descricao                AS tipoDescricao,
      tr.abreviatura              AS tipoAbreviatura
    FROM DW_FAT_RESULTADO dw
    JOIN DIM_ENSAIO_X_TIPO_DE_RESULTADO extr
      ON extr.cod_ensaio = dw.cod_ensaio AND extr.D_E_L_E_T IS NULL
    JOIN DIM_TIPO_DE_RESULTADO tr
      ON tr.cod_tipo_de_resultado = extr.cod_tipo_de_resultado AND tr.D_E_L_E_T IS NULL
    WHERE ${where}
      ${searchWhere}
    ORDER BY dw.ensaio ASC
    LIMIT ${limit} OFFSET ${offset}
  `, [...params, ...searchParams]);
}

// Updated buscarProdutos with pagination support
export async function buscarProdutos(
  termo: string,
  f: FiltrosBase,
  pagination: { limit?: number; offset?: number } = { limit: 20, offset: 0 }
): Promise<OpcaoProduto[]> {
  const { where, params } = buildWhere(f);
  const words = termo.trim().split(/\s+/).filter(Boolean);

  let searchWhere = '';
  const searchParams: unknown[] = [];

  if (words.length > 0) {
    searchWhere = 'AND dw.produto LIKE ?';
    searchParams.push(`${words[0]}%`);
    for (let i = 1; i < words.length; i++) {
      searchWhere += ' AND dw.produto LIKE ?';
      searchParams.push(`%${words[i]}%`);
    }
  }

  const limit = pagination.limit ?? 20;
  const offset = pagination.offset ?? 0;

  return blabQuery<OpcaoProduto>(`
    SELECT DISTINCT dw.cod_produto AS codProduto, dw.produto AS produto
    FROM DW_FAT_RESULTADO dw
    WHERE ${where}
      ${searchWhere}
    ORDER BY dw.produto ASC
    LIMIT ${limit} OFFSET ${offset}
  `, [...params, ...searchParams]);
}