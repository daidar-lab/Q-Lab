// apps/frontend/src/hooks/useFiliais.ts

import { useEffect, useState } from 'react';
import { request } from '../services/api';

export interface Filial {
  cod_filial: number;
  filial: string;
  abreviatura: string;
}

export function useFiliais() {
  const [filiais, setFiliais] = useState<Filial[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    request<Filial[]>('/api/filiais')
      .then((data) => {
        if (active) {
          setFiliais(data);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (active) {
          setError(err.message || 'Erro ao carregar filiais');
          setLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, []);

  return { filiais, loading, error };
}
