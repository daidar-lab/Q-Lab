// apps/frontend/src/hooks/useDashboard.ts
import { useState, useEffect } from 'react';
import * as api from '../services/dashboard.api';
import type { RankingItem, TipoProdutoRankingItem } from '../services/dashboard.api';

interface FiltroPeriodo {
  filialId: number | null;
  dataInicio: string;
  dataFim: string;
}

export function useDashboard(periodo: FiltroPeriodo) {
  const [kpis, setKpis] = useState<any>(null);
  const [processos, setProcessos] = useState<RankingItem[]>([]);
  const [produtos, setProdutos] = useState<TipoProdutoRankingItem[]>([]);
  const [ensaios, setEnsaios] = useState<RankingItem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!periodo.dataInicio || !periodo.dataFim || periodo.filialId === null) {
      setKpis(null);
      setProcessos([]);
      setProdutos([]);
      setEnsaios([]);
      setCarregando(false);
      return;
    }

    setCarregando(true);
    setErro(null);

    const f = { 
      filialId: periodo.filialId,
      dataInicio: periodo.dataInicio, 
      dataFim: periodo.dataFim 
    };

    Promise.all([
      api.getKpisDashboard(f),
      api.getRankingProcessos(f),
      api.getRankingProdutos(f),
      api.getRankingEnsaios(f),
    ])
      .then(([k, p, pr, e]) => {
        setKpis(k);
        setProcessos(Array.isArray(p) ? p : []);
        setProdutos(Array.isArray(pr) ? pr : []);
        setEnsaios(Array.isArray(e) ? e : []);
      })
      .catch(err => setErro(err.message))
      .finally(() => setCarregando(false));
  }, [periodo.dataInicio, periodo.dataFim, periodo.filialId]);

  return { kpis, processos, produtos, ensaios, carregando, erro };
}