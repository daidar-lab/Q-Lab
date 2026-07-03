import { blabQuery } from '../../db/blab.pool';

// Sub-tela 1 — Provas Horárias (Envasamento)
// Discriminador: cod_skip_lote IN (29, 36, 31, 54)
// Grupo A: query única contra DW_FAT_RESULTADO, sem âncora

interface ProvasHorariasParams {
    cod_filial: number;
    data_inicial: string; // YYYYMMDD
    data_final: string;   // YYYYMMDD
}

export async function getProvasHorarias(params: ProvasHorariasParams) {
    const { data_inicial, data_final } = params;

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
            cod_laboratorio,
            laboratorio,
            cod_centro_de_custo,
            centro_de_custo,
            cod_bem,
            bem,
            abreviatura,
            descricao,
            cod_produto,
            produto,
            cod_skip_lote,
            skip_lote,
            lote_de_controle_de_qualidade,
            numero_de_controle
        FROM DW_FAT_RESULTADO
        WHERE data_resultado BETWEEN ? AND ?
        AND D_E_L_E_T IS NULL
        AND valor IS NOT NULL AND valor != ''
        AND cod_skip_lote IN ('29', '36', '31', '54')
        AND cod_laboratorio IN ('16', '18', '20', '4', '6', '8', '5')
        ORDER BY lote_de_controle_de_qualidade, cod_amostra, cod_ensaio`,
        [data_inicial, data_final],
    );
}
