export type Familia = 'NUMERICO' | 'FAIXA' | 'CATEGORICO';
export interface ContextoAnalise {
    codProduto: number;
    codCentroCusto: number;
    codEnsaio: number;
    dataInicio: string;
    dataFim: string;
    codBem?: number;
    codSkipLote?: string | string[];
    familia?: Familia;
}
export declare function contextoCompleto(ctx: Partial<ContextoAnalise>): ctx is ContextoAnalise;
export declare function periodoPreenchido(ctx: Partial<ContextoAnalise>): boolean;
