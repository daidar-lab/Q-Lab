// apps/frontend/src/components/dashboard/ResumoAutomatico.tsx

import { useEffect, useState } from 'react';
import { resumoDashboardApi } from '../../services/resumo-dashboard.api';
import type { RespostaIA } from '../../services/resumo-dashboard.api';
import styles from './ResumoAutomatico.module.css';

interface Props {
  dataInicio: string;
  dataFim:    string;
  filialId:   number;
  kpis:       any;
  processos:  any;
  produtos:   any;
  ensaios:    any;
}

export default function ResumoAutomatico({ dataInicio, dataFim, filialId, kpis, processos, produtos, ensaios }: Props) {
  const [resumo,     setResumo]     = useState<RespostaIA | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState(false);

  useEffect(() => {
    // Only call API if all data is present
    if (!kpis || !processos || !produtos || !ensaios) return;

    setCarregando(true);
    setErro(false);
    setResumo(null);

    resumoDashboardApi
      .getResumo(dataInicio, dataFim, filialId, kpis, processos, ensaios, produtos)
      .then(res => setResumo(res.data))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [dataInicio, dataFim, filialId, kpis, processos, produtos, ensaios]);

  if (carregando) {
    return (
      <div className={`${styles.card} ${styles.loading}`}>
        <span className={styles.spinner} />
        Gerando resumo…
      </div>
    );
  }

  // Falha silenciosa — não bloqueia o dashboard
  if (erro || !resumo) return null;

  return (
    <div className={styles.card}>
      <span className={styles.badge}>Resumo automático</span>
      <p className={styles.texto}>{resumo.texto}</p>
    </div>
  );
}
