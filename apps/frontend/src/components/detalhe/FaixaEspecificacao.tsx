import styles from './FaixaEspecificacao.module.css';

interface FaixaProps {
    dados: {
        ensaio: string;
        modo: 'regua' | 'percentual';
        motivo: 'multiplos_produtos' | 'sem_especificacao' | null;
        media: number | null;
        lie: number | null;
        lse: number | null;
        pct_conforme: number;
    };
}

export default function FaixaEspecificacao({ dados }: FaixaProps) {
    if (dados.modo === 'regua') {
        const { lie, lse, media } = dados;
        const range = lse! - lie!;
        const posPct = Math.min(100, Math.max(0,
            ((media! - lie!) / range) * 100
        ));

        return (
            <div className={styles.card}>
                <div className={styles.header}>
                    <strong>{dados.ensaio}</strong>
                    <span className={styles.valorAtual}>{media}</span>
                </div>
                <div className={styles.regua}>
                    <div className={styles.faixaVerde} />
                    <div
                        className={styles.ponto}
                        style={{ left: `${posPct}%` }}
                    />
                </div>
                <div className={styles.limites}>
                    <span>{lie}</span>
                    <span>{lse}</span>
                </div>
            </div>
        );
    }

    // Modo percentual
    return (
        <div className={styles.card}>
            <div className={styles.header}>
                <strong>{dados.ensaio}</strong>
                <span className={styles.valorAtual}>{dados.pct_conforme}% Conforme</span>
            </div>
            <div className={styles.barraProporcao}>
                <div
                    className={styles.barraPreenchida}
                    style={{ width: `${dados.pct_conforme}%` }}
                />
            </div>
            {dados.motivo === 'multiplos_produtos' && (
                <p className={styles.aviso}>
                    Múltiplos produtos neste processo. Clique para ver especificações por produto.
                </p>
            )}
        </div>
    );
}