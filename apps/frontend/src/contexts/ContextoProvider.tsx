// apps/frontend/src/contexts/ContextoProvider.tsx
import { createContext, useContext, useState, type ReactNode } from 'react';
import { contextoCompleto } from '@qlab/types';
import type { ContextoAnalise } from '@qlab/types';

function periodoDefault() {
    const fim = new Date();
    const inicio = new Date();
    inicio.setMonth(inicio.getMonth() - 1);
    const fmt = (d: Date) => d.toISOString().slice(0, 10);
    return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

interface ContextoState {
    ctx: Partial<ContextoAnalise>;
    set: <K extends keyof ContextoAnalise>(key: K, val: ContextoAnalise[K] | undefined) => void;
    reset: () => void;
    periodoOk: boolean;
    contextoOk: boolean;
    modoAnalyse: 'individual' | 'ranges' | 'granularidade';
    setModoAnalyse: (modo: 'individual' | 'ranges' | 'granularidade') => void;
    periodo2: { inicio: string; fim: string };
    setPeriodo2: (p: { inicio: string; fim: string } | ((prev: { inicio: string; fim: string }) => { inicio: string; fim: string })) => void;
    granularidade: 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano';
    setGranularidade: (g: 'dia' | 'semana' | 'mes' | 'trimestre' | 'ano') => void;
}

const ContextoCtx = createContext<ContextoState | null>(null);

export function ContextoProvider({ children }: { children: ReactNode }) {
    const defPeriodo = periodoDefault();
    const [ctx, setCtx] = useState<Partial<ContextoAnalise>>({
        dataInicio: defPeriodo.dataInicio,
        dataFim: defPeriodo.dataFim,
    });
    const [modoAnalyse, setModoAnalyse] = useState<'individual' | 'ranges' | 'granularidade'>('individual');
    const [periodo2, setPeriodo2] = useState<{ inicio: string; fim: string }>({ inicio: '', fim: '' });
    const [granularidade, setGranularidade] = useState<'dia' | 'semana' | 'mes' | 'trimestre' | 'ano'>('dia');

    function set<K extends keyof ContextoAnalise>(key: K, val: ContextoAnalise[K] | undefined) {
        setCtx(prev => {
            const next = { ...prev, [key]: val };
            if (key === 'codProduto') {
                delete next.codCentroCusto;
                delete next.codBem;
                delete next.codSkipLote;
                delete next.codEnsaio;
                delete next.familia;
            }
            if (key === 'codCentroCusto') {
                delete next.codBem;
                delete next.codSkipLote;
                delete next.codEnsaio;
                delete next.familia;
            }
            if (key === 'dataInicio' || key === 'dataFim') {
                delete next.codEnsaio;
                delete next.familia;
            }
            return next;
        });
    }

    function reset() {
        const defPeriodo = periodoDefault();
        setCtx({
            dataInicio: defPeriodo.dataInicio,
            dataFim: defPeriodo.dataFim,
        });
        setModoAnalyse('individual');
        setPeriodo2({ inicio: '', fim: '' });
        setGranularidade('dia');
    }

    const pOk = modoAnalyse === 'ranges'
        ? !!ctx.dataInicio && !!ctx.dataFim && !!periodo2.inicio && !!periodo2.fim && ctx.dataInicio <= ctx.dataFim && periodo2.inicio <= periodo2.fim
        : !!ctx.dataInicio && !!ctx.dataFim && ctx.dataInicio <= ctx.dataFim;

    return (
        <ContextoCtx.Provider value={{
            ctx,
            set,
            reset,
            periodoOk: pOk,
            contextoOk: contextoCompleto(ctx),
            modoAnalyse,
            setModoAnalyse,
            periodo2,
            setPeriodo2,
            granularidade,
            setGranularidade,
        }}>
            {children}
        </ContextoCtx.Provider>
    );
}

export function useContexto(): ContextoState {
    const ctx = useContext(ContextoCtx);
    if (!ctx) throw new Error('useContexto deve ser usado dentro de ContextoProvider');
    return ctx;
}