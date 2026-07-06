// apps/frontend/src/components/contexto/DrawerAnalitica.tsx
import { useState, useEffect, type CSSProperties } from 'react';
import { useAnalitica } from '../../hooks/useAnalitica';
import { NumericoChart, type HistogramaBinInfo } from '../charts/NumericoChart';
import { FaixaChart } from '../charts/FaixaChart';
import { CategoricoChart } from '../charts/CategoricoChart';
import { NumericoComparacaoChart } from '../charts/NumericoComparacaoChart';
import { FaixaComparacaoChart } from '../charts/FaixaComparacaoChart';
import { CategoricoComparacaoChart } from '../charts/CategoricoComparacaoChart';
import { AmostraDetalheDrawer } from '../amostra/AmostraDetalheDrawer';
import { useContexto } from '../../contexts/ContextoProvider';
import type { ContextoAnalise } from '@qlab/types';

interface Props {
    open: boolean;
    ctx: ContextoAnalise;
    onClose: () => void;
}

const FAMILIA_LABEL: Record<string, string> = {
    NUMERICO: 'Ensaio numérico',
    FAIXA: 'Ensaio de faixa',
    CATEGORICO: 'Ensaio categórico',
};

export function DrawerAnalitica({ open, ctx, onClose }: Props) {
    const { modoAnalyse } = useContexto();
    const { rodar, familia, dados, carregando, erro, limpar } = useAnalitica();

    const [selectedCodAmostra, setSelectedCodAmostra] = useState<string | null>(null);
    const [selectedCodEnsaio, setSelectedCodEnsaio] = useState<string | undefined>(undefined);

    useEffect(() => {
        if (open && ctx?.codEnsaio) rodar(ctx);
        if (!open) {
            limpar();
            setSelectedCodAmostra(null);
            setSelectedCodEnsaio(undefined);
        }
    }, [open]);

    function handlePontoClick(info: { codAmostra?: string; codEnsaioAtual?: string }) {
        if (!info.codAmostra) return;
        const codEnsaio = info.codEnsaioAtual ?? (ctx?.codEnsaio ? String(ctx.codEnsaio) : undefined);

        setSelectedCodAmostra(info.codAmostra);
        setSelectedCodEnsaio(codEnsaio);
    }

    const handleHistogramaBinClick = (_info: HistogramaBinInfo) => { };

    const overlayStyle: CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: 'var(--clr-overlay)',
        zIndex: 100,
        display: open ? 'flex' : 'none',
        alignItems: 'flex-end',
        backdropFilter: 'blur(2px)',
        WebkitBackdropFilter: 'blur(2px)',
    };

    const drawerStyle: CSSProperties = {
        background: 'var(--clr-surface)',
        borderRadius: 'var(--r-2xl) var(--r-2xl) 0 0',
        width: '100%',
        maxHeight: '90dvh',
        overflowY: 'auto',
        padding: '0 0 32px',
        boxSizing: 'border-box',
        boxShadow: 'var(--shadow-xl)',
    };

    return (
        <>
            <div style={overlayStyle} onClick={e => e.target === e.currentTarget && onClose()}>
                <div style={drawerStyle}>
                    {/* Handle bar */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',
                        padding: '12px 0 8px',
                    }}>
                        <div style={{
                            width: '36px',
                            height: '4px',
                            borderRadius: 'var(--r-full)',
                            background: 'var(--clr-border-strong)',
                        }} />
                    </div>

                    {/* Header */}
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '8px 20px 16px',
                        borderBottom: '1px solid var(--clr-border)',
                        marginBottom: '20px',
                    }}>
                        <div>
                            <h3 style={{
                                margin: '0 0 2px',
                                fontSize: '17px',
                                fontWeight: 700,
                                color: 'var(--clr-text)',
                                letterSpacing: '-0.02em',
                            }}>
                                {familia ?? 'Analisando…'}
                            </h3>
                            {familia && (
                                <span style={{
                                    fontSize: '12px',
                                    color: 'var(--clr-text-3)',
                                    fontWeight: 500,
                                }}>
                                    {FAMILIA_LABEL[familia]}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={onClose}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: 'var(--r-md)',
                                background: 'var(--clr-surface-2)',
                                border: '1px solid var(--clr-border)',
                                fontSize: '16px',
                                cursor: 'pointer',
                                color: 'var(--clr-text-2)',
                                transition: 'background var(--t-fast)',
                                fontFamily: 'var(--font)',
                            }}
                            onMouseEnter={e => { e.currentTarget.style.background = 'var(--clr-border)'; }}
                            onMouseLeave={e => { e.currentTarget.style.background = 'var(--clr-surface-2)'; }}
                        >
                            ✕
                        </button>
                    </div>

                    {/* Content */}
                    <div style={{ padding: '0 16px' }}>
                        {carregando && (
                            <div style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px',
                                padding: '40px 0',
                                color: 'var(--clr-text-3)',
                            }}>
                                <div style={{
                                    width: '24px', height: '24px',
                                    border: '3px solid var(--clr-border)',
                                    borderTopColor: 'var(--clr-primary)',
                                    borderRadius: '50%',
                                    animation: 'qlab-spin 0.8s linear infinite',
                                }} />
                                <span style={{ fontSize: '14px', fontWeight: 500 }}>Carregando análise…</span>
                            </div>
                        )}

                        {erro && (
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '10px',
                                color: 'var(--clr-danger)', background: 'var(--clr-danger-bg)',
                                padding: '14px', borderRadius: 'var(--r-md)',
                                border: '1px solid rgba(220,38,38,0.2)',
                                fontSize: '13px', fontWeight: 500,
                            }}>
                                <span>⚠</span>
                                <span>{erro}</span>
                            </div>
                        )}

                        {!carregando && !erro && dados && familia === 'NUMERICO' && (
                            modoAnalyse === 'individual'
                                ? <NumericoChart dados={dados} onPontoClick={handlePontoClick} onHistogramaBinClick={handleHistogramaBinClick} />
                                : <NumericoComparacaoChart dados={dados} modo={modoAnalyse} />
                        )}
                        {!carregando && !erro && dados && familia === 'FAIXA' && (
                            modoAnalyse === 'individual'
                                ? <FaixaChart dados={dados} />
                                : <FaixaComparacaoChart dados={dados} modo={modoAnalyse} />
                        )}
                        {!carregando && !erro && dados && familia === 'CATEGORICO' && (
                            modoAnalyse === 'individual'
                                ? <CategoricoChart dados={dados} />
                                : <CategoricoComparacaoChart dados={dados} modo={modoAnalyse} />
                        )}
                    </div>
                </div>
            </div>

            <AmostraDetalheDrawer
                open={!!selectedCodAmostra}
                onClose={() => { setSelectedCodAmostra(null); setSelectedCodEnsaio(undefined); }}
                codAmostra={selectedCodAmostra}
                codEnsaioAtual={selectedCodEnsaio}
            />
        </>
    );
}