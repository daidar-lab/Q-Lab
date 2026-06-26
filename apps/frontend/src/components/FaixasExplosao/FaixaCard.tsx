import React from 'react';
import ProdutosDropdown from './ProdutosDropdown';
import styles from './FaixaCard.module.css'; // Importa o novo CSS

export interface Faixa {
    lie: number;
    lse: number;
    n_amostras: number;
    n_produtos: number;
    pct_amostras: number;
}

interface FaixaCardProps {
    faixa: Faixa;
    isExpanded: boolean;
    onToggle: () => void;
    id: string | number;
    codEnsaio: string;
    dataInicio: string;
    dataFim: string;
    selectedSkus: string[];
    onToggleSku: (codProduto: string) => void;
}

export const FaixaCard: React.FC<FaixaCardProps> = ({
    faixa,
    isExpanded,
    onToggle,
    id,
    codEnsaio,
    dataInicio,
    dataFim,
    selectedSkus,
    onToggleSku,
}) => {
    const { lie, lse, n_amostras, n_produtos } = faixa;

    return (
        <div className={styles.card}>
            <div onClick={onToggle} className={styles.header}>
                <div className={styles.flexRow}>
                    <div className={styles.col}>
                        <span className={styles.label}>Intervalo de Especificação</span>
                        <span className={styles.value}>{lie.toLocaleString()} a {lse.toLocaleString()}</span>
                    </div>
                    <div className={styles.col}>
                        <span className={styles.label}>Produtos</span>
                        <span className={styles.value}>{n_produtos} {n_produtos === 1 ? 'produto' : 'produtos'}</span>
                    </div>
                    <div className={styles.col}>
                        <span className={styles.label}>Amostras</span>
                        <span className={styles.value}>{n_amostras}</span>
                    </div>
                </div>

                <div className={styles.chevronContainer}>
                    <svg className={`${styles.icon} ${isExpanded ? styles.rotated : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                </div>
            </div>

            {isExpanded && (
                <div className={styles.expandedArea}>
                    <ProdutosDropdown
                        id={id}
                        codEnsaio={codEnsaio}
                        lie={lie}
                        lse={lse}
                        dataInicio={dataInicio}
                        dataFim={dataFim}
                        selectedSkus={selectedSkus}
                        onToggleSku={onToggleSku}
                    />
                </div>
            )}
        </div>
    );
};

export default FaixaCard;