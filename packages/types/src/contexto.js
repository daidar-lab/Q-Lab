"use strict";
// packages/types/contexto.ts
Object.defineProperty(exports, "__esModule", { value: true });
exports.contextoCompleto = contextoCompleto;
exports.periodoPreenchido = periodoPreenchido;
function contextoCompleto(ctx) {
    return (ctx.codProduto != null &&
        ctx.codCentroCusto != null &&
        ctx.codEnsaio != null &&
        !!ctx.dataInicio &&
        !!ctx.dataFim);
}
function periodoPreenchido(ctx) {
    return !!ctx.dataInicio && !!ctx.dataFim;
}
