// packages/types/contexto.ts

export type Familia = 'NUMERICO' | 'FAIXA' | 'CATEGORICO';


export interface ContextoAnalise {
    // ── Obrigatórios ────────────────────────────────────────────────────────────
    filialId: number;     // filtro mestre — obrigatório em todas as queries
    codProduto: number;
    codCentroCusto: number;
    codEnsaio: number;
    dataInicio: string;   // YYYY-MM-DD
    dataFim: string;      // YYYY-MM-DD

    // ── Opcionais ───────────────────────────────────────────────────────────────
    codBem?: number;
    codSkipLote?: string | string[];   // varchar(255) — um ou múltiplos

    // ── Preenchido após inspeção ────────────────────────────────────────────────
    familia?: Familia;
}

export function contextoCompleto(ctx: Partial<ContextoAnalise>): ctx is ContextoAnalise {
    return (
        ctx.filialId != null &&
        ctx.codProduto != null &&
        ctx.codCentroCusto != null &&
        ctx.codEnsaio != null &&
        !!ctx.dataInicio &&
        !!ctx.dataFim
    );
}

export function periodoPreenchido(ctx: Partial<ContextoAnalise>): boolean {
    return !!ctx.dataInicio && !!ctx.dataFim;
}