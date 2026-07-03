import { blabQuery } from '../../db/blab.pool';

// Sub-tela 2 — Recravação
// Discriminador: cod_operacao = 25
// Grupo A: query única contra DW_FAT_RESULTADO, sem âncora

interface AnalisesRecravacaoParams {
    cod_filial: number;
    data_inicial: string; // YYYYMMDD
    data_final: string;   // YYYYMMDD
    cod_centro_de_custo: number;
    cod_bem: number;
}

export async function getAnalisesRecravacao(params: AnalisesRecravacaoParams) {
    const { data_inicial, data_final, cod_centro_de_custo, cod_bem } = params;

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
        AND cod_operacao = 25
        AND cod_centro_de_custo = ?
        AND cod_bem = ?
        ORDER BY cod_amostra, cod_ensaio`,
        [data_inicial, data_final, cod_centro_de_custo, cod_bem],
    );
}
