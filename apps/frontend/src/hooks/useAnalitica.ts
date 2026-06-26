// apps/frontend/src/hooks/useAnalitica.ts
import { useState } from 'react';
import { rodarAnalitica, inspecionarEnsaio, getNumericoComparacao, getFaixaComparacao, getCategoricoComparacao } from '../services/analitica.api';
import type { ContextoAnalise, Familia, ResultadoInspecao } from '@qlab/types';
import { useContexto } from '../contexts/ContextoProvider';

interface EstadoAnalitica {
    familia: Familia | null;
    inspecao: ResultadoInspecao | null;
    dados: any | null;
    carregando: boolean;
    erro: string | null;
}

export function useAnalitica() {
    const { modoAnalyse, periodo2, granularidade } = useContexto();
    const [state, setState] = useState<EstadoAnalitica>({
        familia: null, inspecao: null, dados: null,
        carregando: false, erro: null,
    });

    async function rodar(ctx: ContextoAnalise) {
        setState(s => ({ ...s, carregando: true, erro: null }));
        try {
            if (modoAnalyse === 'individual') {
                const res = await rodarAnalitica(ctx);
                setState({
                    familia: res.familia,
                    inspecao: res.inspecao,
                    dados: res.dados,
                    carregando: false,
                    erro: null,
                });
            } else {
                // 1. Inspeciona o ensaio para determinar a família
                const inspecao = await inspecionarEnsaio(ctx);
                const familia = inspecao.familia;

                // 2. Constrói o payload de comparação
                let payload: any;
                if (modoAnalyse === 'ranges') {
                    payload = {
                        modo: 'ranges',
                        periodo1: { inicio: ctx.dataInicio, fim: ctx.dataFim },
                        periodo2: { inicio: periodo2.inicio, fim: periodo2.fim },
                        codProduto: ctx.codProduto,
                        codCentroCusto: ctx.codCentroCusto,
                        codEnsaio: ctx.codEnsaio,
                        codBem: ctx.codBem,
                        codSkipLote: ctx.codSkipLote,
                    };
                } else {
                    payload = {
                        modo: 'granularidade',
                        dataInicio: ctx.dataInicio,
                        dataFim: ctx.dataFim,
                        granularidade,
                        codProduto: ctx.codProduto,
                        codCentroCusto: ctx.codCentroCusto,
                        codEnsaio: ctx.codEnsaio,
                        codBem: ctx.codBem,
                        codSkipLote: ctx.codSkipLote,
                    };
                }

                // 3. Roda a comparação para a família correta
                let dados: any;
                if (familia === 'NUMERICO') {
                    dados = await getNumericoComparacao(payload);
                } else if (familia === 'FAIXA') {
                    dados = await getFaixaComparacao(payload);
                } else {
                    dados = await getCategoricoComparacao(payload);
                }

                setState({
                    familia,
                    inspecao,
                    dados,
                    carregando: false,
                    erro: null,
                });
            }
        } catch (e: any) {
            setState(s => ({ ...s, carregando: false, erro: e.message }));
        }
    }

    function limpar() {
        setState({ familia: null, inspecao: null, dados: null, carregando: false, erro: null });
    }

    return { ...state, rodar, limpar };
}