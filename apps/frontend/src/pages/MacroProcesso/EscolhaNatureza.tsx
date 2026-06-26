// apps/frontend/src/pages/MacroProcesso/EscolhaNatureza.tsx

import { useParams, useNavigate } from 'react-router-dom';
import styles from './EscolhaNatureza.module.css';

const LABEL_ORIGEM: Record<string, string> = {
  CAPTACAO: 'Captação',
  MICROBIOLOGIA: 'Microbiologia',
  'COLETA DE AGUA': 'Coleta de Água',
  ETDI: 'ETDI',
  DESALCOOLIZACAO: 'Desalcoolização',
  FISICO: 'Físico-Químico',
  CIP: 'CIP',
  ENVASAMENTO: 'Envasamento',
  PROPAGACAO: 'Propagação',
  MATURACAO: 'Maturação',
  FERMENTACAO: 'Fermentação',
  BRASSAGEM: 'Brassagem',
};

export default function EscolhaNatureza() {
  const { origem } = useParams<{ origem: string }>();
  const navigate = useNavigate();

  const label = origem ? (LABEL_ORIGEM[origem] ?? origem) : '—';

  return (
    <div className={styles.page}>
      <button onClick={() => navigate(-1)} className={styles.voltar}>
        ← Voltar
      </button>

      <header className={styles.header}>
        <span className={styles.subtitulo}>Macro Processo</span>
        <h1 className={styles.titulo}>{label}</h1>
        <p className={styles.descricao}>Selecione a natureza da análise</p>
      </header>

      <div className={styles.opcoes}>
        <button
          id="btn-natureza-produto"
          className={styles.cardOpcao}
          onClick={() => navigate(`/detalhe/macro-processo/${origem}/produto`)}
        >
          <span className={`${styles.icone} ${styles.iconeProduto}`}></span>
          <strong className={styles.cardTitulo}>Produto</strong>
          <span className={styles.cardDescricao}>
            Ensaios analíticos do produto — pH, CO₂, Extrato, Amargor...
          </span>
        </button>

        <button
          id="btn-natureza-processo"
          className={styles.cardOpcao}
          onClick={() => navigate(`/detalhe/macro-processo/${origem}/processo`)}
        >
          <span className={`${styles.icone} ${styles.iconeProcesso}`}></span>
          <strong className={styles.cardTitulo}>Processo</strong>
          <span className={styles.cardDescricao}>
            Parâmetros de processo produtivo — Torque, Temperatura, Pressão...
          </span>
        </button>
      </div>
    </div>
  );
}
