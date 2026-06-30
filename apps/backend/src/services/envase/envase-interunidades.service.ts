import { blabQuery } from '../../db/blab.pool';

interface ProdutoInterunidadesParams {
    cod_filial: number;
    data_inicial: string; // YYYYMMDD
    data_final: string;   // YYYYMMDD
}

export async function getProdutoInterunidades(params: ProdutoInterunidadesParams) {
    const { cod_filial, data_inicial, data_final } = params;

    // QUERY 1 — Âncora (FAT_ENVASAMENTO, sem filtro de filial)
    const envasamentos = await blabQuery<any>(
        `SELECT
        E.cod_filial,
        LCQ.cod_lote_de_controle_de_qualidade,
        LCQ.lote_de_controle_de_qualidade,
        PRO.produto,
        PRO.sku,
        PRO.tipo,
        PRO.marca,
        PRO.cod_erp,
        E.cenario AS origem,
        E.motivo,
        CASE
            WHEN LCQ.lote_de_controle_de_qualidade LIKE '%PTR%' THEN 'PETRÓPOLIS'
            WHEN LCQ.lote_de_controle_de_qualidade LIKE '%FRT%' THEN 'FRUTAL'
            ELSE 'NÃO CLASSIFICADO'
        END AS filial_origem
    FROM FAT_ENVASAMENTO E
    INNER JOIN DIM_PRODUTO PRO ON PRO.cod_produto = E.cod_produto
    INNER JOIN FAT_LOTE_DE_CONTROLE_DE_QUALIDADE LCQ
        ON LCQ.cod_lote_de_controle_de_qualidade = E.cod_lote_de_controle_de_qualidade
    WHERE E.data BETWEEN ? AND ?
    AND E.D_E_L_E_T IS NULL`,
        [data_inicial, data_final]
    );

    if (!envasamentos || envasamentos.length === 0) {
        return [];
    }

    // Extrair codLotesStr
    const codLotesStr = envasamentos
        .map((env) => env.lote_de_controle_de_qualidade)
        .filter((lote): lote is string => typeof lote === 'string' && lote !== '');

    if (codLotesStr.length === 0) {
        return [];
    }

    const placeholders = codLotesStr.map(() => '?').join(', ');

    // QUERY 2 — DW_FAT_RESULTADO
    const resultados = await blabQuery<any>(
        `SELECT
        cod_amostra,
        cod_ensaio,
        ensaio,
        valor,
        lie,
        lse,
        conformidade,
        lote_de_controle_de_qualidade,
        cod_skip_lote,
        skip_lote,
        produto,
        cod_produto,
        data_resultado,
        hora_resultado,
        data_da_coleta,
        cod_centro_de_custo,
        centro_de_custo
    FROM DW_FAT_RESULTADO
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND lote_de_controle_de_qualidade IN (${placeholders})
    AND cod_skip_lote = '33'`,
        [data_inicial, data_final, ...codLotesStr]
    );

    // MONTAGEM
    return envasamentos
        .map((env) => ({
            ...env,
            resultados: resultados.filter(
                (r) => r.lote_de_controle_de_qualidade === env.lote_de_controle_de_qualidade
            ),
        }))
        .filter((env) => env.resultados.length > 0);
}
