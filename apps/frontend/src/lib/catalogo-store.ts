// apps/frontend/src/lib/catalogo-store.ts
//
// Singleton em módulo — garante que o catálogo é carregado uma única vez por
// filial durante toda a sessão do usuário, sem Context nem biblioteca externa.
// Padrão alinhado com a filosofia do projeto (closure/module-level state).

import { fetchCatalogo } from '../services/busca.api';
import type { Catalogo } from '../services/busca.api';

// Cache em módulo — persiste enquanto a aba estiver aberta
const _cache   = new Map<number, Catalogo>();
const _loading = new Map<number, Promise<Catalogo>>();

/**
 * Retorna o catálogo da filial — da memória se já carregado,
 * ou dispara uma única fetch (deduplicada por Promise) caso contrário.
 */
export function getCatalogoStore(filialId: number): Promise<Catalogo> {
  // Já carregado
  const cached = _cache.get(filialId);
  if (cached) return Promise.resolve(cached);

  // Já em voo — devolve a mesma Promise (sem duplicate fetch)
  const inFlight = _loading.get(filialId);
  if (inFlight) return inFlight;

  // Primeira chamada — dispara fetch
  const promise = fetchCatalogo(filialId).then(catalogo => {
    _cache.set(filialId, catalogo);
    _loading.delete(filialId);
    return catalogo;
  }).catch(err => {
    _loading.delete(filialId); // permite retry em próxima tentativa
    throw err;
  });

  _loading.set(filialId, promise);
  return promise;
}

/**
 * Invalida o cache de uma filial (útil ao trocar de filial).
 */
export function invalidarCatalogo(filialId: number): void {
  _cache.delete(filialId);
  _loading.delete(filialId);
}

export type { Catalogo, CatalogoItem } from '../services/busca.api';
