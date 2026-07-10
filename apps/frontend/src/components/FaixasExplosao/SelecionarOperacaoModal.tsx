import { useEffect, useState } from 'react';
import { detalheApi } from '../../services/detalhe.api';
import styles from './FaixaModal.module.css';

interface OperacaoOption {
  operacao: string;
  n_amostras: number;
  n_nao_conforme: number;
  pct_nao_conforme: number;
}

interface SelecionarOperacaoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelecionar: (operacao: string) => void;
  codEnsaio: string;
  ensaioNome: string;
  codCentroCusto: string;
  centroCustoNome: string;
  dataInicio: string;
  dataFim: string;
}

export default function SelecionarOperacaoModal({
  isOpen,
  onClose,
  onSelecionar,
  codEnsaio,
  ensaioNome,
  codCentroCusto,
  centroCustoNome,
  dataInicio,
  dataFim,
}: SelecionarOperacaoModalProps) {
  const [opcoes, setOpcoes] = useState<OperacaoOption[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCarregando(true);
    
    detalheApi.getOperacoesPorCentroCustoEEnsaio(codEnsaio, codCentroCusto, dataInicio, dataFim)
      .then(setOpcoes)
      .finally(() => setCarregando(false));
  }, [isOpen, codEnsaio, codCentroCusto, dataInicio, dataFim]);

  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles.modalPequeno}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>{ensaioNome} - {centroCustoNome}</h2>
            <p className={styles.headerSubtitle}>Selecione a operação para continuar</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {carregando && <p className={styles.loadingText}>Carregando operações...</p>}
          {!carregando && opcoes.length === 0 && (
            <p className={styles.noDataText}>Nenhuma operação encontrada para este processo.</p>
          )}
          {!carregando && opcoes.map((opcao) => (
            <button
              key={opcao.operacao}
              className={styles.opcaoCentroCusto}
              onClick={() => onSelecionar(opcao.operacao)}
            >
              <strong>{opcao.operacao}</strong>
              <span>{opcao.n_amostras} amostras · {opcao.pct_nao_conforme}% NC</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
