// apps/frontend/src/hooks/useProdutosProgressivo.ts
// Carrega produtos página a página assim que o período fica válido.
// Cada página é 20 itens com 300ms de pausa, nunca sobrecarregando o backend.

import { useState, useEffect, useRef } from 'react';
import { buscarProdutos } from '../services/opcoes.api';

const PAGE_SIZE = 20;

interface Filtros {
    dataInicio?: string;
    dataFim?: string;
}

export function useProdutosProgressivo(f: Filtros) {
    const periodoOk = !!f.dataInicio && !!f.dataFim;
    const [dados, setDados] = useState<{ label: string; value: number }[]>([]);
    const [carregando, setCarregando] = useState(false);
    const abortRef = useRef<AbortController | null>(null);

    useEffect(() => {
        if (!periodoOk) {
            setDados([]);
            return;
        }

        // Cancela qualquer carga anterior
        abortRef.current?.abort();
        abortRef.current = new AbortController();
        const signal = abortRef.current.signal;

        let offset = 0;
        setDados([]);
        setCarregando(true);

        async function carregar() {
            try {
                while (!signal.aborted) {
                    const res = await buscarProdutos(
                        '',
                        { dataInicio: f.dataInicio!, dataFim: f.dataFim! },
                        { limit: PAGE_SIZE, offset }
                    );
                    if (signal.aborted) break;

                    const novos = res.map(p => ({ label: p.produto, value: p.codProduto }));
                    setDados(prev => [...prev, ...novos]);
                    offset += PAGE_SIZE;

                    if (novos.length < PAGE_SIZE) break; // sem mais páginas

                    // Pausa entre páginas para não sobrecarregar o backend
                    await new Promise(r => setTimeout(r, 300));
                }
            } catch (err: any) {
                if (err?.name !== 'AbortError') console.error('Erro ao carregar produtos:', err);
            } finally {
                if (!signal.aborted) setCarregando(false);
            }
        }

        carregar();

        return () => {
            abortRef.current?.abort();
        };
    }, [periodoOk, f.dataInicio, f.dataFim]); // eslint-disable-line react-hooks/exhaustive-deps

    return { dados, carregando };
}
