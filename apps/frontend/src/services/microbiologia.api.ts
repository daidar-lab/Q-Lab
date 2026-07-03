import { request } from './api';

interface ParamsDataRange {
    filialId: number;
    data_inicial: string;
    data_final: string;
}

// Análise Microbiológica (cod_laboratorio IN 5,17 AND cod_area IN 73,75)
export const getAnaliseMicrobiologia = (params: ParamsDataRange) =>
    request<{ ok: boolean; data: any[] }>('/qlab/microbiologia/analise-microbiologia', {
        method: 'POST',
        body: params,
    });

// Estabilidade Biológica Micro
export const getEstabilidadeBiologicaMicro = (params: ParamsDataRange) =>
    request<{ ok: boolean; data: any[] }>('/qlab/microbiologia/estabilidade-biologica-micro', {
        method: 'POST',
        body: params,
    });

// Estabilidade Biológica Envase
export const getEstabilidadeBiologicaEnvase = (params: ParamsDataRange) =>
    request<{ ok: boolean; data: any[] }>('/qlab/microbiologia/estabilidade-biologica-envase', {
        method: 'POST',
        body: params,
    });

// Água de Enxague
export const getAguaDeEnxague = (params: ParamsDataRange) =>
    request<{ ok: boolean; data: any[] }>('/qlab/microbiologia/agua-de-enxague', {
        method: 'POST',
        body: params,
    });

// SWAB
export const getSwab = (params: ParamsDataRange) =>
    request<{ ok: boolean; data: any[] }>('/qlab/microbiologia/swab', {
        method: 'POST',
        body: params,
    });
