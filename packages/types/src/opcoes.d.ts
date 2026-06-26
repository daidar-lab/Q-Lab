export interface OpcaoProduto {
    codProduto: number;
    produto: string;
}
export interface OpcaoCentro {
    codCentroCusto: number;
    centroCusto: string;
}
export interface OpcaoBem {
    codBem: number;
    bem: string;
}
export interface OpcaoSkipLote {
    codSkipLote: string;
    skipLote: string;
}
export interface OpcaoEnsaio {
    codEnsaio: number;
    ensaio: string;
    codTipoResultado: number;
    tipoDescricao: string;
    tipoAbreviatura: string;
}
export interface ResultadoInspecao {
    total: number;
    qtdNumerico: number;
    qtdFaixa: number;
    qtdTexto: number;
    familia: import('./familia').Familia;
}
export type Granularidade = 'DAY' | 'WEEK' | 'MONTH';
