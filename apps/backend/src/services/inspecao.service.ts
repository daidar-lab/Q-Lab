// apps/backend/src/services/inspecao.service.ts
//
// Responsabilidade: classificar o padrão real de valor de um ensaio em runtime.
// Roda SEMPRE antes de qualquer query analítica.
//
// O tipo declarado em DIM_TIPO_DE_RESULTADO representa a intenção do cadastro —
// não garante o formato real do dado em DW_FAT_RESULTADO.valor (varchar 20).
// Por isso a inspeção é obrigatória e não pode ser pulada.

import { blabQuery } from '../db/blab.pool';
import type { ContextoAnalise, Familia, ResultadoInspecao } from '@qlab/types';

// ─── Thresholds ──────────────────────────────────────────────────────────────
// Validados contra dados reais do B/LAB.
// Pior caso observado: 93,3% / 6,6% — sem ambiguidade nos thresholds abaixo.

const THRESHOLD_NUMERICO = 0.80;  // >= 80% dos valores numéricos → NUMERICO
const THRESHOLD_FAIXA = 0.50;  // >= 50% dos valores de faixa  → FAIXA
// fallback                     → CATEGORICO

// ─── Tipos internos ──────────────────────────────────────────────────────────

interface LinhaInspecao {
    total: number;
    qtdNumerico: number;
    qtdFaixa: number;
    qtdTexto: number;
}

// ─── Query de inspeção ───────────────────────────────────────────────────────

const SQL_INSPECAO = `
  SELECT
    COUNT(valor)                                                                     AS total,
    SUM(valor REGEXP '^-?[0-9]+([.,][0-9]+)?$')                                     AS qtdNumerico,
    SUM(valor REGEXP '^-?[0-9]+([.,][0-9]+)?\\\\s*[-\\/]\\\\s*-?[0-9]+([.,][0-9]+)?$') AS qtdFaixa,
    SUM(valor REGEXP '^[A-Za-zÀ-ú ]+$')                                             AS qtdTexto
  FROM DW_FAT_RESULTADO
  WHERE D_E_L_E_T IS NULL
    AND cod_ensaio          = ?
    AND cod_produto         = ?
    AND cod_centro_de_custo = ?
    AND data_resultado BETWEEN ? AND ?
    AND (? IS NULL OR cod_bem       = ?)
    AND (? IS NULL OR cod_skip_lote = ?)
    AND valor IS NOT NULL
    AND valor != ''
  ORDER BY data_resultado DESC
  LIMIT 200
`;

// ─── Lógica de decisão ───────────────────────────────────────────────────────

function resolverFamilia(linha: LinhaInspecao): Familia {
    const { total, qtdNumerico, qtdFaixa } = linha;

    if (total === 0) return 'CATEGORICO';  // sem dados → fallback seguro

    const pctNumerico = qtdNumerico / total;
    const pctFaixa = qtdFaixa / total;

    if (pctNumerico >= THRESHOLD_NUMERICO) return 'NUMERICO';
    if (pctFaixa >= THRESHOLD_FAIXA) return 'FAIXA';
    return 'CATEGORICO';
}

// ─── Export principal ────────────────────────────────────────────────────────

export async function inspecionarEnsaio(
    ctx: ContextoAnalise,
): Promise<ResultadoInspecao> {
    // codBem e codSkipLote são opcionais — o padrão (? IS NULL OR col = ?)
    // permite passar null e o MySQL trata corretamente
    const params = [
        ctx.codEnsaio,
        ctx.codProduto,
        ctx.codCentroCusto,
        ctx.dataInicio,
        ctx.dataFim,
        ctx.codBem ?? null, ctx.codBem ?? null,
        ctx.codSkipLote ?? null, ctx.codSkipLote ?? null,
    ];

    const rows = await blabQuery<LinhaInspecao>(SQL_INSPECAO, params);
    const linha = rows[0];

    // Normaliza — mysql2 retorna SUM() como string quando o resultado pode ser NULL
    const normalizada: LinhaInspecao = {
        total: Number(linha.total ?? 0),
        qtdNumerico: Number(linha.qtdNumerico ?? 0),
        qtdFaixa: Number(linha.qtdFaixa ?? 0),
        qtdTexto: Number(linha.qtdTexto ?? 0),
    };

    const familia = resolverFamilia(normalizada);

    return {
        ...normalizada,
        familia,
    };
}

// ─── Utilitário: granularidade temporal ──────────────────────────────────────
// Calculada a partir do período — usada pelas queries analíticas para controlar
// o volume de pontos retornados (proteção mobile + LightSail)

export function resolverGranularidade(
    dataInicio: string,
    dataFim: string,
): 'DAY' | 'WEEK' | 'MONTH' {
    const inicio = new Date(dataInicio);
    const fim = new Date(dataFim);
    const dias = Math.ceil((fim.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));

    if (dias <= 30) return 'DAY';    // até 30 dias  → ponto por dia
    if (dias <= 180) return 'WEEK';   // até 6 meses  → ponto por semana
    return 'MONTH';                   // acima de 6m  → ponto por mês
}