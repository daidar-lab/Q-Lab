import { blabQuery } from '../../db/blab.pool';

// Sub-tela 3 — Pasteurização
// Discriminador: cod_operacao = 28 + cod_produto = 150
// Grupo A: query única contra DW_FAT_RESULTADO, sem âncora

interface AnalisesPasteurizacaoParams {
    cod_filial: number;
    data_inicial: string; // YYYYMMDD
    data_final: string;   // YYYYMMDD
    cod_centro_de_custo: number;
}

export async function getAnalisesPasteurizacao(params: AnalisesPasteurizacaoParams) {
    const { data_inicial, data_final, cod_centro_de_custo } = params;

    return blabQuery<any>(
        `SELECT
            cod_amostra,
            data_resultado,
            hora_resultado,
            cod_ensaio,
            ensaio,
            valor,
            lie,
            lse,
            conformidade,
            cod_centro_de_custo,
            centro_de_custo,
            cod_bem,
            bem,
            abreviatura,
            descricao,
            cod_produto,
            produto,
            cod_operacao,
            operacao,
            lote_de_controle_de_qualidade,
            numero_de_controle
        FROM DW_FAT_RESULTADO
        WHERE data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
        AND valor IS NOT NULL AND valor != ''
        AND cod_operacao = 28
        AND cod_produto = 150
        AND cod_centro_de_custo = ?
        ORDER BY cod_amostra, cod_ensaio`,
        [data_inicial, data_final, cod_centro_de_custo],
    );
}
