import type { ReactNode } from 'react';
import styles from './ResumoIADetalhe.module.css';

interface Destaque {
  valor: string;
  tipo: 'positivo' | 'critico' | 'neutro';
}

interface Props {
  texto: string;
  destaques?: Destaque[];
  carregando?: boolean;
  actionNode?: ReactNode;
}

export default function ResumoIADetalhe({ texto, destaques, carregando, actionNode }: Props) {
  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span className={styles.icone}>✦</span>
            <span className={styles.titulo}>Análise inteligente</span>
          </div>
          {actionNode}
        </div>
        <div className={styles.skeleton} />
        <div className={`${styles.skeleton} ${styles.skeletonCurto}`} />
      </div>
    );
  }

  if (!texto) {
    if (!actionNode) return null;
    return (
      <div className={styles.container} style={{ display: 'flex', justifyContent: 'flex-end' }}>
        {actionNode}
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span className={styles.icone}>✦</span>
          <span className={styles.titulo}>Análise inteligente</span>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap' }}>
          {actionNode}
        </div>
      </div>

      <p className={styles.texto}>{texto}</p>

      {destaques && destaques.length > 0 && (
        <div className={styles.destaques}>
          {destaques.map((d, i) => (
            <span key={i} className={`${styles.destaque} ${styles[d.tipo]}`}>
              {d.valor}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
