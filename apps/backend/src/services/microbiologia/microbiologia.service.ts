// apps/backend/src/services/microbiologia/microbiologia.service.ts

import { blabQuery, TABELA_FATO_PRINCIPAL } from '../../db/blab.pool';

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface ParamsDataRange {
  data_inicial: string; // YYYYMMDD
  data_final: string;   // YYYYMMDD
}

interface ParamsResultadosMicro extends ParamsDataRange {
  cod_filial: number;
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo A — Estabilidade biológica micro
// Filtro direto: cod_skip_lote NOT IN ('36', '54')
// Sem âncora — query única contra DW_FAT_RESULTADO
// ─────────────────────────────────────────────────────────────────────────────

export async function getEstabilidadeBiologicaMicro(params: ParamsDataRange) {
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
        cod_centro_de_custo,
        centro_de_custo,
        cod_bem,
        bem,
        cod_produto,
        produto,
        cod_skip_lote,
        skip_lote,
        lote_de_controle_de_qualidade,
        numero_de_controle
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_skip_lote NOT IN ('36', '54')
    ORDER BY cod_amostra, cod_ensaio`,
    [data_inicial, data_final],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo A — Estabilidade biológica envase
// Filtro direto: cod_skip_lote IN ('36', '54')
// Sem âncora — query única contra DW_FAT_RESULTADO
// ─────────────────────────────────────────────────────────────────────────────

export async function getEstabilidadeBiologicaEnvase(params: ParamsDataRange) {
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
        cod_centro_de_custo,
        centro_de_custo,
        cod_bem,
        bem,
        cod_produto,
        produto,
        cod_skip_lote,
        skip_lote,
        lote_de_controle_de_qualidade,
        numero_de_controle
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_skip_lote IN ('36', '54')
    ORDER BY cod_amostra, cod_ensaio`,
    [data_inicial, data_final],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo B — Resultados microbiológicos (geral)
// 2 queries: âncora FAT_MICROBIOLOGIA → DW_FAT_RESULTADO
// Exclui cod_produto IN (14, 15) — SWAB e Água de enxague têm telas próprias
// ─────────────────────────────────────────────────────────────────────────────

export async function getResultadosMicrobiologicos(params: ParamsResultadosMicro) {
  const { cod_filial, data_inicial, data_final } = params;

  // QUERY 1 — Âncora: resolve cod_lote_de_controle_de_qualidade[] via FAT_MICROBIOLOGIA
  const ancora = await blabQuery<{ cod_lote_de_controle_de_qualidade: string }>(
    `SELECT DISTINCT
        MIC.cod_lote_de_controle_de_qualidade
    FROM FAT_MICROBIOLOGIA MIC
    WHERE MIC.cod_filial = ?
    AND MIC.data_evento BETWEEN ? AND ?
    AND MIC.D_E_L_E_T IS NULL`,
    [cod_filial, data_inicial, data_final],
  );

  if (!ancora || ancora.length === 0) {
    return [];
  }

  const codLotes = ancora
    .map((r) => r.cod_lote_de_controle_de_qualidade)
    .filter((v): v is string => typeof v === 'string' && v !== '');

  if (codLotes.length === 0) {
    return [];
  }

  const placeholders = codLotes.map(() => '?').join(', ');

  // QUERY 2 — Final contra DW_FAT_RESULTADO
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
        cod_produto,
        produto,
        lote_de_controle_de_qualidade,
        numero_de_controle
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE lote_de_controle_de_qualidade IN (${placeholders})
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_produto NOT IN (14, 15)
    ORDER BY lote_de_controle_de_qualidade, cod_amostra, cod_ensaio`,
    [...codLotes],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo A — Água de enxague
// Filtro direto: cod_produto = 15
// Sem âncora — query única contra DW_FAT_RESULTADO
// ─────────────────────────────────────────────────────────────────────────────

export async function getAguaDeEnxague(params: ParamsDataRange) {
  const { data_inicial, data_final } = params;

  return blabQuery<any>(
    `SELECT
        cod_amostra,
        data_resultado,
        hora_resultado,
        cod_ensaio,
        ensaio,
        valor,
        cod_centro_de_custo,
        centro_de_custo,
        cod_bem,
        bem,
        abreviatura,
        descricao,
        numero_de_controle,
        lote_de_controle_de_qualidade
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_produto = 15
    ORDER BY cod_amostra, cod_ensaio`,
    [data_inicial, data_final],
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Grupo A — SWAB
// Filtro direto: cod_produto = 14
// Sem âncora — query única contra DW_FAT_RESULTADO
// ─────────────────────────────────────────────────────────────────────────────

export async function getSwab(params: ParamsDataRange) {
  const { data_inicial, data_final } = params;

  return blabQuery<any>(
    `SELECT
        cod_amostra,
        data_resultado,
        hora_resultado,
        cod_ensaio,
        ensaio,
        valor,
        cod_centro_de_custo,
        centro_de_custo,
        cod_bem,
        bem,
        abreviatura,
        descricao,
        numero_de_controle,
        lote_de_controle_de_qualidade
    FROM ${TABELA_FATO_PRINCIPAL}
    WHERE data_resultado BETWEEN ? AND ?
    AND D_E_L_E_T IS NULL
    AND valor IS NOT NULL AND valor != ''
    AND cod_produto = 14
    ORDER BY cod_amostra, cod_ensaio`,
    [data_inicial, data_final],
  );
}
