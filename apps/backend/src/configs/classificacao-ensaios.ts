// apps/backend/src/configs/classificacao-ensaios.ts

// Levantamento manual com a equipe de Qualidade (CQ).
// Todo ensaio que NÃO estiver listado aqui é considerado "produto" por padrão —
// só existem essas duas naturezas, sem terceiro grupo.
//
// Atualizar conforme o levantamento avançar com Bruna/Sergio.
export const ENSAIOS_DE_PROCESSO: Record<string, string[]> = {
  ENVASAMENTO: [
    'TORQUE 1° ESTÁGIO',
    'TORQUE 2° ESTÁGIO',
    'ANÁLISE VISUAL',
    'CONCENTRAÇÃO DE LUBRIFICANTE DE ESTEIRAS',
    'CODIFICAÇÃO DATADOR 01',
    'ALTURA - CORTE 1',
    'ESPESSURA',
    'GANCHO DA TAMPA - CORTE 1',
    'GANCHO DO CORPO - CORTE 1',
    'PROFUNDIDADE',
    'SEAN GAP - CORTE 1',
    'TRANSPASSE - CORTE 1',
    'PONTO DE INJEÇÃO',
    'CURVATURA DO PÉ',
    'ÁREA DO FUNDO',
    'CALCANHAR',
    'CINTURA',
    'PAINEL DE ROTULAGEM',
    'OMBRO',
    'OMBRO SUPERIOR',
    'CONCENTRAÇÃO DE ADITIVO DE SODA',
    'CONCENTRAÇÃO DE CARBONATOS',
    'CONCENTRAÇÃO DE SODA CÁUSTICA',
    'ISENÇÃO DE RESÍDUOS CÁUSTICOS',
    'ISENÇÃO DE MATÉRIA ORGÂNICA',
    'VOLUME LÍQUIDO',
    'PESO VAZIO',
    'PESO CHEIO',
    'DENSIDADE',
    'CONCENTRAÇÃO HSO'
  ],
  FERMENTACAO: [
    'DICETONAS VICINAIS'
  ],
  BRASSAGEM: [],
  FILTRACAO: ['DICETONAS VICINAIS'],
  MATURACAO: [
    'COLIFORMES TERMO TOLERANTES',
    'COLIFORMES TOTAIS',
    'BACTÉRIAS HETEROTRÓFICAS',
    'LEVEDURAS SELVAGENS',
    'BACTÉRIAS AERÓBIAS',
    'BACTÉRIAS ANAERÓBIAS',
    'CÉLULAS EM SUSPENSÃO',
    'E. COLI',
    'LEVEDURAS TOTAIS'
  ],
  ETDI: [],
  CIP: [],
  FISICO: [],
  CAPTACAO: [],
  MICROBIOLOGIA: [],
  COLETA_DE_AGUA: [],
  DESALCOOLIZACAO: [],
  PROPAGACAO: [],
};

export type NaturezaEnsaio = 'produto' | 'processo';

export function classificarEnsaio(macroProcesso: string, nomeEnsaio: string): NaturezaEnsaio {
  const listaProcesso = ENSAIOS_DE_PROCESSO[macroProcesso] ?? [];
  return listaProcesso.includes(nomeEnsaio) ? 'processo' : 'produto';
}

export function getEnsaiosPorNatureza(macroProcesso: string, natureza: NaturezaEnsaio): string[] | null {
  const listaProcesso = ENSAIOS_DE_PROCESSO[macroProcesso] ?? [];
  // null = "sem filtro restritivo" (usado para natureza 'produto', que é o complemento)
  return natureza === 'processo' ? listaProcesso : null;
}
