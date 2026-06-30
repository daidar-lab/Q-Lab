import { blabQuery } from '../../db/blab.pool';

export type TipoAnalise =
    | 'arrolhamento'
    | 'assoprador'
    | 'lubrificante'
    | 'recravacao'
    | 'pasteurizador';

interface AnaliseAuxiliarParams {
    cod_filial: number;
    data_inicial: string; // YYYYMMDD
    data_final: string;   // YYYYMMDD
    tipo: TipoAnalise;
}

export async function getAnaliseAuxiliar(params: AnaliseAuxiliarParams) {
    const { cod_filial, data_inicial, data_final } = params;

    // QUERY 1 — Âncora (FAT_ATRIBUTOS_DA_AMOSTRA, atributo 36)
    const amostrasAncora = await blabQuery<any>(
        `SELECT DISTINCT
        FAT.cod_amostra,
        SUBSTRING_INDEX(FAT.valor, '/', -1) AS lote_envasamento,
        PC.cod_filial
    FROM FAT_ATRIBUTOS_DA_AMOSTRA FAT
    INNER JOIN FAT_AMOSTRA A ON A.cod_amostra = FAT.cod_amostra
    INNER JOIN DIM_PONTO_DE_COLETA PC ON PC.cod_ponto_de_coleta = A.cod_ponto_de_coleta
    WHERE FAT.cod_atributo_da_amostra = 36
    AND FAT.D_E_L_E_T IS NULL
    AND A.D_E_L_E_T IS NULL
    AND PC.cod_filial = ?
    AND REPLACE(
        SUBSTRING(DATE_SUB(CAST(CONCAT(A.data_da_coleta,' ',A.hora_da_coleta) AS DATETIME), INTERVAL 3 HOUR),1,10),
        '-', ''
    ) BETWEEN ? AND ?`,
        [cod_filial, data_inicial, data_final]
    );

    if (!amostrasAncora || amostrasAncora.length === 0) {
        return [];
    }

    // Extrair codAmostras
    const codAmostras = amostrasAncora
        .map((a) => a.cod_amostra)
        .filter((cod): cod is number => cod !== null && cod !== undefined);

    if (codAmostras.length === 0) {
        return [];
    }

    const placeholders = codAmostras.map(() => '?').join(', ');

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
        centro_de_custo,
        cod_bem,
        bem
    FROM DW_FAT_RESULTADO
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_amostra IN (${placeholders})`,
        [data_inicial, data_final, ...codAmostras]
    );

    // MONTAGEM: agrupar resultados correspondentes a cada amostra âncora
    return amostrasAncora.map((a) => ({
        ...a,
        resultados: resultados.filter((r) => r.cod_amostra === a.cod_amostra),
    }));
}
