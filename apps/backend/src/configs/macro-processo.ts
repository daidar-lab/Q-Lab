// apps/backend/src/configs/macro-processo.ts

// Mapa de prefixo do LCQ → Macro Processo (origem)
// IMPORTANTE: ordem de prioridade do mais específico para o mais genérico,
// pois alguns prefixos têm sobreposição (ex: LCQC é prefixo de LCQCP e LCQCA)
export const MAPA_PREFIXO_MACRO_PROCESSO: [string, string][] = [
  ['LCQCP', 'CAPTACAO'],
  ['LCQMB', 'MICROBIOLOGIA'],
  ['LCQCA', 'COLETA DE AGUA'],
  ['LCQTE', 'ETDI'],
  ['LCQD', 'DESALCOOLIZACAO'],
  ['LCQR', 'FISICO'],
  ['LCQC', 'CIP'],
  ['LCQE', 'ENVASAMENTO'],
  ['LCQP', 'PROPAGACAO'],
  ['LCQM', 'MATURACAO'],
  ['LCQF', 'FERMENTACAO'],
  ['LCQB', 'BRASSAGEM'],
  ['LCQFI', 'FILTRACAO'],
];

export function resolverMacroProcesso(lcq: string): string | null {
  for (const [prefixo, origem] of MAPA_PREFIXO_MACRO_PROCESSO) {
    if (lcq.startsWith(prefixo)) return origem;
  }
  return null;
}

export function prefixoPorMacroProcesso(origem: string): string | null {
  const entry = MAPA_PREFIXO_MACRO_PROCESSO.find(([, o]) => o === origem);
  return entry ? entry[0] : null;
}

export const LISTA_MACRO_PROCESSOS = MAPA_PREFIXO_MACRO_PROCESSO.map(([, origem]) => origem);
