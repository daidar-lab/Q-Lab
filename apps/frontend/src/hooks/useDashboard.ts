// apps/frontend/src/hooks/useDashboard.ts
import { useState, useEffect } from 'react';
import * as api from '../services/dashboard.api';
import type { RankingItem } from '../services/dashboard.api';

interface FiltroPeriodo {
  dataInicio: string;
  dataFim: string;
}

export function useDashboard(periodo: FiltroPeriodo) {
  const [kpis, setKpis] = useState<any>(null);
  const [processos, setProcessos] = useState<RankingItem[]>([]);
  const [produtos, setProdutos] = useState<RankingItem[]>([]);
  const [ensaios, setEnsaios] = useState<RankingItem[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!periodo.dataInicio || !periodo.dataFim) return;

    setCarregando(true);
    setErro(null);

    Promise.all([
      api.getKpisDashboard(periodo),
      api.getRankingProcessos(periodo),
      api.getRankingProdutos(periodo),
      api.getRankingEnsaios(periodo),
    ])
      .then(([k, p, pr, e]) => {
        setKpis(k);
        setProcessos(p);
        setProdutos(pr);
        setEnsaios(e);
      })
      .catch(err => setErro(err.message))
      .finally(() => setCarregando(false));
  }, [periodo.dataInicio, periodo.dataFim]);

  return { kpis, processos, produtos, ensaios, carregando, erro };
}