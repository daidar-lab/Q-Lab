// apps/frontend/src/hooks/useCatalogo.ts
//
// Carrega o catálogo (produtos + ensaios) uma única vez por sessão.
// Usa o singleton catalogo-store para deduplicar fetches entre renders.

import { useState, useEffect } from 'react';
import { getCatalogoStore } from '../lib/catalogo-store';
import type { Catalogo } from '../services/busca.api';

export function useCatalogo(filialId: number | null) {
  const [catalogo, setCatalogo] = useState<Catalogo | null>(null);
  const [loading, setLoading]   = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  useEffect(() => {
    if (filialId === null) {
      setCatalogo(null);
      return;
    }

    setLoading(true);
    setErro(null);

    getCatalogoStore(filialId)
      .then(c => {
        setCatalogo(c);
        setLoading(false);
      })
      .catch(() => {
        setErro('Falha ao carregar catálogo.');
        setLoading(false);
      });
  }, [filialId]);

  return { catalogo, loading, erro };
}
