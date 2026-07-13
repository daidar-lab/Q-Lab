// apps/frontend/src/components/dashboard/ResumoAutomatico.tsx

import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { resumoDashboardApi } from '../../services/resumo-dashboard.api';
import type { RespostaIA, AcaoIA } from '../../services/resumo-dashboard.api';
import styles from './ResumoAutomatico.module.css';

interface Props {
  dataInicio: string;
  dataFim:    string;
  filialId:   number;
  kpis:       any;
  processos:  any;
  produtos:   any;
  ensaios:    any;
  metaConformidade: number;
}

export default function ResumoAutomatico({ dataInicio, dataFim, filialId, kpis, processos, produtos, ensaios, metaConformidade }: Props) {
  const navigate = useNavigate();
  const [resumo,     setResumo]     = useState<RespostaIA | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro,       setErro]       = useState(false);

  useEffect(() => {
    // Only call API if all data is present
    if (!kpis || !processos || !produtos || !ensaios) return;

    setCarregando(true);
    setErro(false);
    setResumo(null);

    // Achata a árvore de produtos para uma lista simples para enviar para a IA
    const produtosPlanos = Array.isArray(produtos) 
      ? produtos.flatMap((p: any) => p.produtos || p)
      : produtos;

    resumoDashboardApi
      .getResumo(dataInicio, dataFim, filialId, kpis, processos, ensaios, produtosPlanos, metaConformidade)
      .then(res => setResumo(res.data))
      .catch(() => setErro(true))
      .finally(() => setCarregando(false));
  }, [dataInicio, dataFim, filialId, kpis, processos, produtos, ensaios, metaConformidade]);

  function handleAcao(acao: AcaoIA) {
    if (acao.tipo === 'processo') navigate(`/detalhe/processos/${acao.id}`);
    if (acao.tipo === 'ensaio')   navigate(`/detalhe/ensaios/${acao.id}`);
  }

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
      {resumo.acoes && resumo.acoes.length > 0 && (
        <div className={styles.acoes}>
          {resumo.acoes.map((acao, i) => (
            <button
              key={i}
              className={styles.botaoAcao}
              onClick={() => handleAcao(acao)}
            >
              {acao.label} →
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
