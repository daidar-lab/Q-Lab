// apps/frontend/src/hooks/useOpcoes.ts
import { useState, useEffect } from 'react';
import * as api from '../services/opcoes.api';
import type {
    OpcaoCentro, OpcaoBem,
    OpcaoSkipLote, OpcaoEnsaio,
} from '@qlab/types';

interface FiltrosOpcoes {
    dataInicio: string;
    dataFim: string;
    codProduto?: number;
    codCentroCusto?: number;
    codBem?: number;
    codSkipLote?: string | string[];
}

// Hook genérico — dispara quando deps mudam e período está preenchido
function useOpcao<T>(
    fn: () => Promise<T>,
    deps: unknown[],
    enabled: boolean,
) {
    const [dados, setDados] = useState<T | null>(null);
    const [carregando, setLoad] = useState(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (!enabled) { setDados(null); return; }
        setLoad(true);
        setErro(null);
        fn()
            .then(setDados)
            .catch(e => setErro(e.message))
            .finally(() => setLoad(false));
    }, deps); // eslint-disable-line react-hooks/exhaustive-deps

    return { dados, carregando, erro };
}

export function useOpcoes(f: Partial<FiltrosOpcoes>) {
    const periodoOk = !!f.dataInicio && !!f.dataFim;
    const base = f as FiltrosOpcoes;


    const centros = useOpcao<OpcaoCentro[]>(() => api.getCentros(base),
        [f.dataInicio, f.dataFim, f.codProduto],
        periodoOk && !!f.codProduto,
    );

    const bens = useOpcao<OpcaoBem[]>(() => api.getBens(base).then(res => res.bens),
        [f.dataInicio, f.dataFim, f.codProduto, f.codCentroCusto],
        periodoOk && !!f.codProduto && !!f.codCentroCusto,
    );

    const skipLotes = useOpcao<OpcaoSkipLote[]>(() => api.getSkipLotes(base),
        [f.dataInicio, f.dataFim, f.codProduto, f.codCentroCusto, f.codBem],
        periodoOk && !!f.codProduto && !!f.codCentroCusto,
    );

    const ensaios = useOpcao<OpcaoEnsaio[]>(() => api.getEnsaios(base),
        [f.dataInicio, f.dataFim, f.codProduto, f.codCentroCusto, f.codBem, f.codSkipLote],
        periodoOk && !!f.codProduto && !!f.codCentroCusto,
    );

    return { centros, bens, skipLotes, ensaios };
}