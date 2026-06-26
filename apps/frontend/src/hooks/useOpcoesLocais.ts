// apps/frontend/src/hooks/useOpcoesLocais.ts
// Carrega as listas completas de produtos e ensaios uma única vez quando o
// período (dataInicio + dataFim) é definido e as armazena em estado local.
// A filtragem acontece em JavaScript — zero requests adicionais por keystroke.

import { useState, useEffect } from 'react';
import * as api from '../services/opcoes.api';

interface Filtros {
    dataInicio?: string;
    dataFim?: string;
}

interface Opcao {
    label: string;
    value: number;
}

interface Estado {
    dados: Opcao[];
    carregando: boolean;
}

const VAZIO: Estado = { dados: [], carregando: false };

export function useOpcoesLocais(f: Filtros) {
    const periodoOk = !!f.dataInicio && !!f.dataFim;

    const [produtos, setProdutos] = useState<Estado>(VAZIO);
    const [ensaios, setEnsaios]   = useState<Estado>(VAZIO);

    useEffect(() => {
        if (!periodoOk) {
            setProdutos(VAZIO);
            setEnsaios(VAZIO);
            return;
        }

        const base = { dataInicio: f.dataInicio!, dataFim: f.dataFim! };
        let cancelado = false;

        async function carregar() {
            setProdutos(p => ({ ...p, carregando: true }));
            setEnsaios(p => ({ ...p, carregando: true }));

            try {
                // Carrega em paralelo — uma request por dimensão
                const [resProdutos, resEnsaios] = await Promise.all([
                    api.getProdutos(base),
                    api.getEnsaios(base),
                ]);

                if (cancelado) return;

                setProdutos({
                    dados: resProdutos.map(p => ({ label: p.produto, value: p.codProduto })),
                    carregando: false,
                });
                setEnsaios({
                    dados: resEnsaios.map(e => ({ label: e.ensaio, value: e.codEnsaio })),
                    carregando: false,
                });
            } catch (err) {
                if (cancelado) return;
                console.error('Erro ao carregar opções locais:', err);
                setProdutos(p => ({ ...p, carregando: false }));
                setEnsaios(p => ({ ...p, carregando: false }));
            }
        }

        carregar();

        return () => { cancelado = true; };

    // Recarrega apenas quando o período mudar
    }, [f.dataInicio, f.dataFim]); // eslint-disable-line react-hooks/exhaustive-deps

    return { produtos, ensaios };
}
