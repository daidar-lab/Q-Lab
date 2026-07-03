import { request } from './api';

interface ParamsEnvaseBase {
    data_inicial: string;
    data_final: string;
    cod_filial?: number;
    filialId?: number;
}

interface ParamsComCentroCusto extends ParamsEnvaseBase {
    cod_centro_de_custo: number;
}

interface ParamsRecravacao extends ParamsComCentroCusto {
    cod_bem: number;
}

// Sub-tela 1 — Provas Horárias (cod_skip_lote IN 29,36,31,54)
export const getProvasHorarias = (params: ParamsEnvaseBase) =>
    request<{ ok: boolean; data: any[] }>('/qlab/envase/envase/provas-horarias', {
        method: 'POST',
        body: params,
    });

// Sub-tela 2 — Recravação (cod_operacao = 25)
export const getAnalisesRecravacao = (params: ParamsRecravacao) =>
    request<{ ok: boolean; data: any[] }>('/qlab/envase/envase/recravacao', {
        method: 'POST',
        body: params,
    });

// Sub-tela 3 — Pasteurização (cod_operacao = 28 + cod_produto = 150)
export const getAnalisesPasteurizacao = (params: ParamsComCentroCusto) =>
    request<{ ok: boolean; data: any[] }>('/qlab/envase/envase/pasteurizacao', {
        method: 'POST',
        body: params,
    });

// Sub-tela 4 — Lubrificantes de Esteira (produto LIKE 'LUBRIFICANTE%')
export const getAnalisesLubrificantes = (params: ParamsComCentroCusto) =>
    request<{ ok: boolean; data: any[] }>('/qlab/envase/envase/lubrificantes', {
        method: 'POST',
        body: params,
    });

// Sub-tela 5 — Assoprador (cod_operacao = 96)
export const getAnalisesAssoprador = (params: ParamsComCentroCusto) =>
    request<{ ok: boolean; data: any[] }>('/qlab/envase/envase/assoprador', {
        method: 'POST',
        body: params,
    });
