import { useEffect, useState } from 'react';
import { detalheApi } from '../../services/detalhe.api';
import styles from './FaixaModal.module.css';

interface BemOption {
  bem: string;
  n_amostras: number;
  n_nao_conforme: number;
  pct_nao_conforme: number;
}

interface SelecionarBemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelecionar: (bem: string) => void;
  codEnsaio: string;
  ensaioNome: string;
  codCentroCusto: string;
  centroCustoNome: string;
  operacao: string;
  dataInicio: string;
  dataFim: string;
  filialId: number;
}

export default function SelecionarBemModal({
  isOpen,
  onClose,
  onSelecionar,
  codEnsaio,
  ensaioNome,
  codCentroCusto,
  centroCustoNome,
  operacao,
  dataInicio,
  dataFim,
  filialId,
}: SelecionarBemModalProps) {
  const [opcoes, setOpcoes] = useState<BemOption[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCarregando(true);
    
    detalheApi.getBensPorOperacao(codEnsaio, codCentroCusto, operacao, dataInicio, dataFim, filialId)
      .then(setOpcoes)
      .finally(() => setCarregando(false));
  }, [isOpen, codEnsaio, codCentroCusto, operacao, dataInicio, dataFim, filialId]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles.modalPequeno}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>{ensaioNome} - {centroCustoNome}</h2>
            <p className={styles.headerSubtitle}>Selecione o equipamento ({operacao})</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {carregando && <p className={styles.loadingText}>Carregando equipamentos...</p>}
          {!carregando && opcoes.length === 0 && (
            <p className={styles.noDataText}>Nenhum equipamento encontrado para esta operação.</p>
          )}
          {!carregando && opcoes.map((opcao) => (
            <button
              key={opcao.bem}
              className={styles.opcaoCentroCusto}
              onClick={() => onSelecionar(opcao.bem)}
            >
              <strong>{opcao.bem}</strong>
              <span>{opcao.n_amostras} amostras · {opcao.pct_nao_conforme}% NC</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
