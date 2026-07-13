import { useEffect, useState } from 'react';
import { detalheApi } from '../../services/detalhe.api';
import styles from './FaixaModal.module.css'; // reaproveita estilos existentes

interface CentroCustoOption {
  cod_centro_de_custo: number;
  centro_de_custo: string;
  n_amostras: number;
  n_nao_conforme: number;
  pct_nao_conforme: number;
}

interface SelecionarCentroCustoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelecionar: (codCentroCusto: number, nomeCentroCusto: string) => void;
  codEnsaio: string;
  ensaioNome: string;
  dataInicio: string;
  dataFim: string;
  codProduto?: string;
}

export default function SelecionarCentroCustoModal({
  isOpen,
  onClose,
  onSelecionar,
  codEnsaio,
  ensaioNome,
  dataInicio,
  dataFim,
  codProduto,
}: SelecionarCentroCustoModalProps) {
  const [opcoes, setOpcoes] = useState<CentroCustoOption[]>([]);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setCarregando(true);
    
    const fetchOpcoes = codProduto
      ? detalheApi.getCentrosCustoPorProdutoEEnsaio(codProduto, codEnsaio, dataInicio, dataFim)
      : detalheApi.getCentrosCustoPorEnsaio(codEnsaio, dataInicio, dataFim);

    fetchOpcoes
      .then(setOpcoes)
      .finally(() => setCarregando(false));
  }, [isOpen, codEnsaio, dataInicio, dataFim, codProduto]);


  if (!isOpen) return null;

  return (
    <div className={styles.overlay}>
      <div className={`${styles.modal} ${styles.modalPequeno}`}>
        <div className={styles.header}>
          <div>
            <h2 className={styles.headerTitle}>{ensaioNome}</h2>
            <p className={styles.headerSubtitle}>Selecione o processo para ver as faixas de especificação</p>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>×</button>
        </div>

        <div className={styles.content}>
          {carregando && <p className={styles.loadingText}>Carregando...</p>}
          {!carregando && opcoes.length === 0 && (
            <p className={styles.noDataText}>Nenhum processo encontrado para este ensaio no período.</p>
          )}
          {!carregando && opcoes.map((opcao, index) => (
            <button
              key={`${opcao.cod_centro_de_custo}-${index}`}
              className={styles.opcaoCentroCusto}
              onClick={() => onSelecionar(opcao.cod_centro_de_custo, opcao.centro_de_custo)}
            >
              <strong>{opcao.centro_de_custo}</strong>
              <span>{opcao.n_amostras} amostras · {opcao.pct_nao_conforme}% NC</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
