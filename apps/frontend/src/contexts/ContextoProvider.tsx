// apps/frontend/src/contexts/ContextoProvider.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
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
    filialId: number | null;
    filialLabel: string;
    setFilial: (cod_filial: number | null, label: string) => void;
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
    meta: number;
    setMeta: (val: number) => void;
}

const ContextoCtx = createContext<ContextoState | null>(null);

import { useAuth } from './AuthProvider';

export function ContextoProvider({ children }: { children: ReactNode }) {
    const defPeriodo = periodoDefault();
    const { filiais, meta: metaAuth } = useAuth();

    // Estado da filial recuperado do localStorage
    const [filialId, setFilialIdState] = useState<number | null>(() => {
        const cached = localStorage.getItem('qlab:filialId');
        return cached ? Number(cached) : null;
    });
    const [filialLabel, setFilialLabel] = useState<string>(() => {
        return localStorage.getItem('qlab:filialLabel') || '';
    });
    const [meta, setMeta] = useState<number>(metaAuth);

    const [ctx, setCtx] = useState<Partial<ContextoAnalise>>({
        filialId: filialId ?? undefined,
        dataInicio: defPeriodo.dataInicio,
        dataFim: defPeriodo.dataFim,
    });
    const [modoAnalyse, setModoAnalyse] = useState<'individual' | 'ranges' | 'granularidade'>('individual');
    const [periodo2, setPeriodo2] = useState<{ inicio: string; fim: string }>({ inicio: '', fim: '' });
    const [granularidade, setGranularidade] = useState<'dia' | 'semana' | 'mes' | 'trimestre' | 'ano'>('dia');

    useEffect(() => {
        setMeta(metaAuth);
    }, [metaAuth]);

    useEffect(() => {
        if (filiais && filiais.length > 0) {
            const filialPadrao = filiais.find(f => f.padrao) ?? filiais[0];
            const filialSalva = localStorage.getItem('qlab:filialId');
            const filialInicial = filiais.find(f => String(f.cod_filial) === filialSalva) ?? filialPadrao;
            
            if (filialInicial && filialInicial.cod_filial !== filialId) {
                setFilial(filialInicial.cod_filial, filialInicial.abreviatura);
            }
        }
    }, [filiais]);

    // Sincroniza filialId no contexto de análise
    useEffect(() => {
        setCtx(prev => ({
            ...prev,
            filialId: filialId ?? undefined,
        }));
    }, [filialId]);

    function setFilial(cod_filial: number | null, label: string) {
        if (cod_filial === null) {
            localStorage.removeItem('qlab:filialId');
            localStorage.removeItem('qlab:filialLabel');
        } else {
            localStorage.setItem('qlab:filialId', String(cod_filial));
            localStorage.setItem('qlab:filialLabel', label);
        }
        setFilialIdState(cod_filial);
        setFilialLabel(label);

        // Ao mudar a filial, limpa os filtros dependentes anteriores
        setCtx(prev => ({
            filialId: cod_filial ?? undefined,
            dataInicio: prev.dataInicio,
            dataFim: prev.dataFim,
        }));
    }

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
            filialId: filialId ?? undefined,
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
            filialId,
            filialLabel,
            setFilial,
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
            meta,
            setMeta,
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