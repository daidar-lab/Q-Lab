import { request } from './api';

export const detalheApi = {
    getDetalhe: async (
        tipo: string,
        id: string,
        dataInicio: string,
        dataFim: string
    ) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/${tipo}/${id}`, {
            params: { dataInicio, dataFim },
        });
        return res.data;
    },
    getResumoIA: async (
        tipo: string,
        id: string,
        dataInicio: string,
        dataFim: string
    ) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/${tipo}/${id}/resumo-ia`, {
            params: { dataInicio, dataFim },
        });
        return res.data;
    },
    getCentrosCustoPorEnsaio: async (codEnsaio: string, dataInicio: string, dataFim: string) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/ensaio/${codEnsaio}/centros-custo`, {
            params: { dataInicio, dataFim },
        });
        return res.data;
    },
    getCentrosCustoPorProdutoEEnsaio: async (codProduto: string, codEnsaio: string, dataInicio: string, dataFim: string) => {
        const res = await request<{ ok: boolean; data: any }>(`/api/detalhe/produto/${codProduto}/ensaio/${codEnsaio}/centros-custo`, {
            params: { dataInicio, dataFim },
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
        produtos: string[]
    ) => {
        return request<any[]>('/api/analitica/detalhe/faixas/produtos/historico', {
            params: { id, codEnsaio, lie, lse, dataInicio, dataFim, produtos: produtos.join(',') },
        });
    },

    /** Fallback: ensaios sem LIE/LSE — retorna conformidade como 0/1 no campo valor */
    getHistoricoProdutosSemFaixa: async (
        id: string | number,
        codEnsaio: string,
        dataInicio: string,
        dataFim: string,
        produtos: string[]
    ) => {
        return request<any[]>('/api/analitica/detalhe/faixas/sem-faixa/historico', {
            params: { id, codEnsaio, dataInicio, dataFim, produtos: produtos.join(',') },
        });
    },

    /** Fallback: busca produtos de ensaios sem faixa LIE/LSE */
    getProdutosSemFaixa: async (
        id: string | number,
        codEnsaio: string,
        dataInicio: string,
        dataFim: string
    ) => {
        return request<any[]>('/api/analitica/detalhe/faixas/sem-faixa/produtos', {
            params: { id, codEnsaio, dataInicio, dataFim },
        });
    },

    getDetalheAmostra: async (codAmostra: string, codEnsaio?: string) => {
        return request<any[]>(`/api/analitica/amostra/${codAmostra}`, {
            params: { ensaio: codEnsaio },
        });
    },
};