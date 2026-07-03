import styles from './ResumoIADetalhe.module.css';

interface Destaque {
  valor: string;
  tipo: 'positivo' | 'critico' | 'neutro';
}

interface Props {
  texto: string;
  destaques?: Destaque[];
  carregando?: boolean;
}

export default function ResumoIADetalhe({ texto, destaques, carregando }: Props) {
  if (carregando) {
    return (
      <div className={styles.container}>
        <div className={styles.header}>
          <span className={styles.icone}>✦</span>
          <span className={styles.titulo}>Análise inteligente</span>
        </div>
        <div className={styles.skeleton} />
        <div className={`${styles.skeleton} ${styles.skeletonCurto}`} />
      </div>
    );
  }

  if (!texto) return null;

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <span className={styles.icone}>✦</span>
        <span className={styles.titulo}>Análise inteligente</span>
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
