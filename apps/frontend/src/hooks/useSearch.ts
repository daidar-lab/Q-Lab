// apps/frontend/src/hooks/useSearch.ts
//
// Hook do campo de busca:
// - Autocompletar: debounce 150ms, inteiramente client-side (catálogo em memória)
// - Submissão: apenas em evento explícito (Enter / clique) — nunca automática
// - URL: serializa o `q` bruto para compartilhamento e navegação por histórico

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { gerarSugestoes } from '../lib/search-parser';
import type { Sugestao } from '../lib/search-parser';
import type { Catalogo } from '../services/busca.api';

export function useSearch(catalogo: Catalogo | null) {
  const navigate = useNavigate();
  const [inputValue, setInputValue] = useState('');
  const [sugestoes, setSugestoes]   = useState<Sugestao[]>([]);

  // Autocompletar — debounce 150ms, zero banco
  useEffect(() => {
    if (!catalogo || inputValue.trim().length < 2) {
      setSugestoes([]);
      return;
    }
    const t = setTimeout(() => {
      setSugestoes(gerarSugestoes(inputValue, catalogo));
    }, 150);
    return () => clearTimeout(t);
  }, [inputValue, catalogo]);

  // Submissão — apenas em evento explícito (Enter / clique no botão)
  const submitBusca = useCallback((valor: string) => {
    const q = valor.trim();
    if (!q) return;
    setSugestoes([]);
    navigate(`/busca?q=${encodeURIComponent(q)}`);
  }, [navigate]);

  // Limpa sugestões ao navegar
  const limparSugestoes = useCallback(() => setSugestoes([]), []);

  return { inputValue, setInputValue, sugestoes, submitBusca, limparSugestoes };
}
