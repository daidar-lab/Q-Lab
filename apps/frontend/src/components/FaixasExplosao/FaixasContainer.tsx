import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import FaixaCard from './FaixaCard';
import type { Faixa } from './FaixaCard';
import ProdutosDropdown from './ProdutosDropdown';
import styles from './FaixasContainer.module.css';

interface FaixasContainerProps {
    id: string | number;
    codEnsaio: string;
    dataInicio: string;
    dataFim: string;
    selectedSkus: string[];
    onSelectedSkusChange: (skus: string[]) => void;
    onActiveFaixaChange?: (limits: { lie: number; lse: number } | null) => void;
    /** Notifica o modal pai se estamos em modo sem-faixa (processo / produto sem especificação) */
    onModoSemFaixaChange?: (semFaixa: boolean) => void;
}

export const FaixasContainer: React.FC<FaixasContainerProps> = ({
    id,
    codEnsaio,
    dataInicio,
    dataFim,
    selectedSkus,
    onSelectedSkusChange,
    onActiveFaixaChange,
    onModoSemFaixaChange,
}) => {
    const [faixas, setFaixas] = useState<Faixa[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedFaixaKey, setExpandedFaixaKey] = useState<string | null>(null);

    // Modo sem-faixa: quando o ensaio não tem LIE/LSE distintos
    const [modoSemFaixa, setModoSemFaixa] = useState<boolean>(false);

    useEffect(() => {
        const fetchFaixas = async () => {
            setLoading(true);
            setError(null);
            setModoSemFaixa(false);
            try {
                const data = await request<Faixa[]>('/api/analitica/detalhe/faixas', {
                    params: {
                        id,
                        codEnsaio,
                        dataInicio,
                        dataFim,
                    },
                });

                if (!data || data.length === 0) {
                    // Fallback: sem faixas LIE/LSE — modo direto por produto
                    setFaixas([]);
                    setModoSemFaixa(true);
                    onModoSemFaixaChange?.(true);
                    // Neste modo não há limites ativos
                    onActiveFaixaChange?.(null);
                } else {
                    setFaixas(data);
                    setModoSemFaixa(false);
                    onModoSemFaixaChange?.(false);
                }
            } catch (err: any) {
                console.error('Erro ao buscar faixas:', err);
                setError(err.message || 'Erro ao carregar as faixas de especificação.');
            } finally {
                setLoading(false);
            }
        };

        if (id && codEnsaio) {
            fetchFaixas();
        }
    }, [id, codEnsaio, dataInicio, dataFim]);

    // Reset parent active limits and local expanded key when codEnsaio changes
    useEffect(() => {
        setExpandedFaixaKey(null);
        if (onActiveFaixaChange) {
            onActiveFaixaChange(null);
        }
    }, [id, codEnsaio, onActiveFaixaChange]);

    const handleToggleExpand = (key: string, faixa: Faixa) => {
        const nextKey = expandedFaixaKey === key ? null : key;
        setExpandedFaixaKey(nextKey);

        if (onActiveFaixaChange) {
            if (nextKey) {
                // Garante que lie/lse sejam números mesmo se o backend retornar strings
                onActiveFaixaChange({ lie: Number(faixa.lie), lse: Number(faixa.lse) });
            } else {
                onActiveFaixaChange(null);
            }
        }
    };

    const handleToggleSku = (codProduto: string) => {
        if (selectedSkus.includes(codProduto)) {
            onSelectedSkusChange(selectedSkus.filter(s => s !== codProduto));
        } else {
            onSelectedSkusChange([...selectedSkus, codProduto]);
        }
    };

    if (loading) {
        return (
            <div className={styles.loading}>
                <div className={styles.spinner}></div>
                <p className={styles.loadingText}>Carregando faixas de especificação...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={styles.error}>
                <p className={styles.errorTitle}>Erro ao carregar dados:</p>
                <p>{error}</p>
            </div>
        );
    }

    // ── Modo sem-faixa: renderiza ProdutosDropdown direto, sem FaixaCard ────────
    if (modoSemFaixa) {
        return (
            <div className={styles.container}>
                <div className={styles.header}>
                    <h3 className={styles.title}>Produtos do Ensaio</h3>
                    <p className={styles.subtitle}>
                        Ensaio sem intervalos de especificação numérica. Selecione produtos para ver o histórico de conformidade.
                    </p>
                </div>
                <ProdutosDropdown
                    id={id}
                    codEnsaio={codEnsaio}
                    lie={0}
                    lse={0}
                    dataInicio={dataInicio}
                    dataFim={dataFim}
                    selectedSkus={selectedSkus}
                    onToggleSku={handleToggleSku}
                    semFaixa={true}
                />
            </div>
        );
    }

    // ── Modo normal: nenhuma faixa encontrada no período ─────────────────────────
    if (faixas.length === 0) {
        return (
            <div className={styles.empty}>
                <p className={styles.emptyText}>Nenhuma faixa de especificação encontrada para os filtros selecionados.</p>
            </div>
        );
    }

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <h3 className={styles.title}>Refinamento por Faixa de Especificação</h3>
                <p className={styles.subtitle}>Selecione uma faixa para explodir em SKUs e marcar produtos no gráfico.</p>
            </div>

            <div className={styles.grid}>
                {faixas.map((faixa) => {
                    const key = `${faixa.lie}_${faixa.lse}`;
                    const isExpanded = expandedFaixaKey === key;

                    return (
                        <FaixaCard
                            key={key}
                            faixa={faixa}
                            isExpanded={isExpanded}
                            onToggle={() => handleToggleExpand(key, faixa)}
                            id={id}
                            codEnsaio={codEnsaio}
                            dataInicio={dataInicio}
                            dataFim={dataFim}
                            selectedSkus={selectedSkus}
                            onToggleSku={handleToggleSku}
                        />
                    );
                })}
            </div>
        </div>
    );
};

export default FaixasContainer;