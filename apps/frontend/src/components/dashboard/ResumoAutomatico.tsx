// apps/frontend/src/components/dashboard/ResumoAutomatico.tsx

import { useEffect, useState } from 'react';
import { resumoDashboardApi } from '../../services/resumo-dashboard.api';
import type { RespostaIA } from '../../services/resumo-dashboard.api';
import styles from './ResumoAutomatico.module.css';

interface Props {
  dataInicio: string;
  dataFim:    string;
  filialId:   number;
}

export default function ResumoAutomatico({ dataInicio, dataFim, filialId }: Props) {
  const [resumo,     setResumo]     = useState<RespostaIA | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState(false);

  useEffect(() => {
    setCarregando(true);
    setErro(false);
    setResumo(null);

    resumoDashboardApi
      .getResumo(dataInicio, dataFim, filialId)
      .then(res => setResumo(res.data))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [dataInicio, dataFim, filialId]);

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
