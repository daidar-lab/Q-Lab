import { blabQuery } from '../../db/blab.pool';

interface ChoppParams {
    cod_filial: number;
    data_inicial: string; // YYYYMMDD
    data_final: string;   // YYYYMMDD
}

export async function getChopp(params: ChoppParams) {
    const { cod_filial, data_inicial, data_final } = params;

    // QUERY 1 — Âncora (FAT_ENVASAMENTO + DIM_CENTRO_DE_CUSTO)
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
        E.data
    FROM FAT_ENVASAMENTO E
    INNER JOIN DIM_PRODUTO PRO ON PRO.cod_produto = E.cod_produto
    INNER JOIN FAT_LOTE_DE_CONTROLE_DE_QUALIDADE LCQ
        ON LCQ.cod_lote_de_controle_de_qualidade = E.cod_lote_de_controle_de_qualidade
    INNER JOIN DIM_CENTRO_DE_CUSTO CC
        ON CC.cod_centro_de_custo = E.cod_centro_de_custo
        AND CC.cod_filial = E.cod_filial
    WHERE E.cod_filial = ?
    AND E.data BETWEEN ? AND ?
    AND E.D_E_L_E_T IS NULL
    AND CC.cod_centro_de_custo = 450050`,
        [cod_filial, data_inicial, data_final]
    );

    if (!envasamentos || envasamentos.length === 0) {
        return [];
    }

    // Extrair codLotes
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
    AND lote_de_controle_de_qualidade IN (${placeholders})`,
        [data_inicial, data_final, ...codLotesStr]
    );

    // MONTAGEM: agrupar resultados correspondentes a cada lote
    return envasamentos.map((env) => ({
        ...env,
        resultados: resultados.filter(
            (r) => r.lote_de_controle_de_qualidade === env.lote_de_controle_de_qualidade
        ),
    }));
}
