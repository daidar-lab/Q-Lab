// packages/types/opcoes.ts
// Shapes de resposta das queries de opções (drill-down e entrada direta)

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
    codSkipLote: string;   // varchar(255) — string
    skipLote: string;
}

export interface OpcaoEnsaio {
    codEnsaio: number;
    ensaio: string;
    codTipoResultado: number;
    tipoDescricao: string;
    tipoAbreviatura: string;   // INT | DEC | LIST — label/ícone no frontend
}

// Resultado da query de inspeção
export interface ResultadoInspecao {
    total: number;
    qtdNumerico: number;
    qtdFaixa: number;
    qtdTexto: number;
    familia: import('./familia.js').Familia;  // já resolvido pelo backend
}

// Granularidade temporal — calculada pelo backend a partir do período
export type Granularidade = 'DAY' | 'WEEK' | 'MONTH';