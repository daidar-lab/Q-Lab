import { request } from './api';

export const detalheApi = {
    getDetalhe: async (
        tipo: string,
        id: string,
        dataInicio: string,
        dataFim: string,
        filialId: number
    ) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/${tipo}/${id}`, {
            params: { dataInicio, dataFim, filialId },
        });
        return res.data;
    },
    getResumoIA: async (
        tipo: string,
        id: string,
        dataInicio: string,
        dataFim: string,
        filialId: number
    ) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/${tipo}/${id}/resumo-ia`, {
            params: { dataInicio, dataFim, filialId },
        });
        return res.data;
    },
    getCentrosCustoPorEnsaio: async (codEnsaio: string, dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/ensaio/${codEnsaio}/centros-custo`, {
            params: { dataInicio, dataFim, filialId },
        });
        return res.data;
    },
    getCentrosCustoPorProdutoEEnsaio: async (codProduto: string, codEnsaio: string, dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/produto/${codProduto}/ensaio/${codEnsaio}/centros-custo`, {
            params: { dataInicio, dataFim, filialId },
        });
        return res.data;
    },
    getOperacoesPorCentroCustoEEnsaio: async (codEnsaio: string, codCentroCusto: string, dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/ensaio/${codEnsaio}/centro-custo/${codCentroCusto}/operacoes`, {
            params: { dataInicio, dataFim, filialId },
        });
        return res.data;
    },
    getBensPorOperacao: async (codEnsaio: string, codCentroCusto: string, operacao: string, dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/ensaio/${codEnsaio}/centro-custo/${codCentroCusto}/bens`, {
            params: { dataInicio, dataFim, filialId, operacao },
        });
        return res.data;
    },

    getHistoricoProdutosFaixa: async (
        id: string | number,
        codEnsaio: string,
        lie: number | undefined,
        lse: number | undefined,
        dataInicio: string,
        dataFim: string,
        produtos: string[],
        filialId: number,
        operacao?: string,
        bem?: string
    ) => {
        return request<any[]>('/api/analitica/detalhe/faixas/produtos/historico', {
            params: { id, codEnsaio, lie, lse, dataInicio, dataFim, produtos: produtos.join(','), filialId, ...(operacao ? { operacao } : {}), ...(bem ? { bem } : {}) },
        });
    },

    /** Fallback: ensaios sem LIE/LSE — retorna conformidade como 0/1 no campo valor */
    getHistoricoProdutosSemFaixa: async (
        id: string | number,
        codEnsaio: string,
        dataInicio: string,
        dataFim: string,
        produtos: string[],
        filialId: number,
        operacao?: string,
        bem?: string
    ) => {
        return request<any[]>('/api/analitica/detalhe/faixas/sem-faixa/historico', {
            params: { id, codEnsaio, dataInicio, dataFim, produtos: produtos.join(','), filialId, ...(operacao ? { operacao } : {}), ...(bem ? { bem } : {}) },
        });
    },

    /** Fallback: busca produtos de ensaios sem faixa LIE/LSE */
    getProdutosSemFaixa: async (
        id: string | number,
        codEnsaio: string,
        dataInicio: string,
        dataFim: string,
        filialId: number,
        operacao?: string,
        bem?: string
    ) => {
        return request<any[]>('/api/analitica/detalhe/faixas/sem-faixa/produtos', {
            params: { id, codEnsaio, dataInicio, dataFim, filialId, ...(operacao ? { operacao } : {}), ...(bem ? { bem } : {}) },
        });
    },

    getDetalheAmostra: async (codAmostra: string, codEnsaio?: string) => {
        return request<any[]>(`/api/analitica/amostra/${codAmostra}`, {
            params: { ensaio: codEnsaio },
        });
    },

    getListaEnsaiosInformativos: async (dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: { cod_ensaio: number; ensaio: string; total_realizado: number }[] }>(
            '/api/detalhe/informativos/ensaios',
            { params: { dataInicio, dataFim, filialId } }
        );
        return res.data;
    },

    getCentrosCustoInformativos: async (codEnsaio: number, dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: { cod_centro_de_custo: number; centro_de_custo: string; total_realizado: number }[] }>(
            '/api/detalhe/informativos/centros-custo',
            { params: { codEnsaio, dataInicio, dataFim, filialId } }
        );
        return res.data;
    },

    getProdutosInformativos: async (codEnsaio: number, codCentroCusto: number, dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: { cod_produto: number; produto: string; ultimo_resultado_texto: string; total_realizado: number }[] }>(
            '/api/detalhe/informativos/produtos',
            { params: { codEnsaio, codCentroCusto, dataInicio, dataFim, filialId } }
        );
        return res.data;
    },

    getAmostrasInformativos: async (codEnsaio: number, codCentroCusto: number, codProduto: number, valor: string | null, dataInicio: string, dataFim: string, filialId: number) => {
        const res = await request<{ ok: boolean; data: { cod_amostra: number; numero_de_controle: string; data_resultado: string; hora_resultado: string; ultimo_resultado_texto: string }[] }>(
            '/api/detalhe/informativos/amostras',
            { params: { codEnsaio, codCentroCusto, codProduto, valor: valor || '', dataInicio, dataFim, filialId } }
        );
        return res.data;
    },
};
