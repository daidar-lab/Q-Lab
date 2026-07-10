import React, { useState, useEffect } from 'react';
import { request } from '../../services/api';
import { useContexto } from '../../contexts/ContextoProvider';
import FaixaCard from './FaixaCard';
import type { Faixa } from './FaixaCard';
import ProdutosDropdown from './ProdutosDropdown';
import styles from './FaixasContainer.module.css';

interface FaixasContainerProps {
    id: string | number;
    codEnsaio: string;
    dataInicio: string;
    dataFim: string;
    operacao?: string;
    bem?: string;
    selectedSkus: string[];
    onSelectedSkusChange: (skus: string[]) => void;
    onActiveFaixasChange?: (limits: { lie: number; lse: number }[]) => void;
    /** Notifica o modal pai se estamos em modo sem-faixa (processo / produto sem especificação) */
    onModoSemFaixaChange?: (semFaixa: boolean) => void;
}

export const FaixasContainer: React.FC<FaixasContainerProps> = ({
    id,
    codEnsaio,
    dataInicio,
    dataFim,
    operacao,
    bem,
    selectedSkus,
    onSelectedSkusChange,
    onActiveFaixasChange,
    onModoSemFaixaChange,
}) => {
    const { filialId } = useContexto();
    const [faixas, setFaixas] = useState<Faixa[]>([]);
    const [loading, setLoading] = useState<boolean>(true);
    const [error, setError] = useState<string | null>(null);
    const [expandedFaixaKeys, setExpandedFaixaKeys] = useState<Record<string, boolean>>({});

    // Modo sem-faixa: quando o ensaio não tem LIE/LSE distintos
    const [modoSemFaixa, setModoSemFaixa] = useState<boolean>(false);

    useEffect(() => {
        const fetchFaixas = async () => {
            if (filialId === null) return;
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
                        filialId,
                        ...(operacao ? { operacao } : {}),
                        ...(bem ? { bem } : {}),
                    },
                });

                if (!data || data.length === 0) {
                    // Fallback: sem faixas LIE/LSE — modo direto por produto
                    setFaixas([]);
                    setModoSemFaixa(true);
                    onModoSemFaixaChange?.(true);
                    // Neste modo não há limites ativos
                    onActiveFaixasChange?.([]);
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
    }, [id, codEnsaio, dataInicio, dataFim, operacao, bem]);

    // Reset parent active limits and local expanded key when codEnsaio changes
    useEffect(() => {
        setExpandedFaixaKeys({});
        if (onActiveFaixasChange) {
            onActiveFaixasChange([]);
        }
    }, [id, codEnsaio]);

    const handleToggleExpand = (key: string, _faixa: Faixa) => {
        setExpandedFaixaKeys(prev => {
            const next = { ...prev, [key]: !prev[key] };
            if (onActiveFaixasChange) {
                const active = faixas
                    .filter(f => next[`${f.lie}_${f.lse}`])
                    .map(f => ({ lie: Number(f.lie), lse: Number(f.lse) }));
                onActiveFaixasChange(active);
            }
            return next;
        });
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
                    operacao={operacao}
                    bem={bem}
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
                    const isExpanded = !!expandedFaixaKeys[key];

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
                            operacao={operacao}
                            bem={bem}
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