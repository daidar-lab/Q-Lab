// apps/frontend/src/lib/search-parser.ts
//
// Parser determinístico de queries livres em português.
// Roda inteiramente no cliente — zero banco enquanto o usuário digita.

import type { Catalogo } from '../services/busca.api';

// ─── Tipos públicos ───────────────────────────────────────────────────────────

export interface Etiqueta {
  tipo: 'processo' | 'produto' | 'ensaio' | 'tipo-produto' | 'periodo' | 'desconhecido';
  label: string;   // texto exibido na tag
  rawText?: string; // texto exato digitado para remoção da query
  valor: string | number;
}

export interface Sugestao {
  tipo: 'processo' | 'produto' | 'ensaio' | 'tipo-produto';
  label: string;
  valor: string | number;
}

export interface SearchTokens {
  processos: string[];
  produtos: number[];
  ensaios: number[];
  tipos: string[];  // tipos de produto selecionados via SearchBar
  periodo: { dataInicio: string; dataFim: string };
  rawTerms: string[];
  etiquetas: Etiqueta[];
}

// ─── Helpers de período ───────────────────────────────────────────────────────

function fmt(d: Date): string { return d.toISOString().slice(0, 10); }

export function periodoDefault(): { dataInicio: string; dataFim: string } {
  const fim = new Date();
  const inicio = new Date();
  inicio.setDate(inicio.getDate() - 30);
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

function diasAtras(n: number) { const f = new Date(); const i = new Date(); i.setDate(i.getDate() - n); return { dataInicio: fmt(i), dataFim: fmt(f) }; }
function semanaAtras(n: number) { return diasAtras(n * 7); }
function mesesAtras(n: number) { const f = new Date(); const i = new Date(); i.setMonth(i.getMonth() - n); return { dataInicio: fmt(i), dataFim: fmt(f) }; }
function anosAtras(n: number) { const f = new Date(); const i = new Date(); i.setFullYear(i.getFullYear() - n); return { dataInicio: fmt(i), dataFim: fmt(f) }; }

function anoPassado(): { dataInicio: string; dataFim: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear() - 1, 0, 1);
  const fim = new Date(hoje.getFullYear() - 1, 11, 31);
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

function mesPassado(): { dataInicio: string; dataFim: string } {
  const hoje = new Date();
  const inicio = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
  const fim = new Date(hoje.getFullYear(), hoje.getMonth(), 0);
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

function mesNomeado(nomeMes: string, anoStr?: string): { dataInicio: string; dataFim: string } {
  const meses: Record<string, number> = {
    janeiro: 0, fevereiro: 1, março: 2, marco: 2, abril: 3,
    maio: 4, junho: 5, julho: 6, agosto: 7, setembro: 8,
    outubro: 9, novembro: 10, dezembro: 11,
  };
  const mes = meses[nomeMes.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')] ?? 0;
  const ano = anoStr ? parseInt(anoStr) : new Date().getFullYear();
  const inicio = new Date(ano, mes, 1);
  const fim = new Date(ano, mes + 1, 0);
  return { dataInicio: fmt(inicio), dataFim: fmt(fim) };
}

// ─── PROCESSO_ALIASES ─────────────────────────────────────────────────────────
// Bigramas listados ANTES dos unigramas para evitar match parcial.
// Normalizado: lowercase sem acentos (matching tolerante).

export const PROCESSO_ALIASES: Record<string, string> = {
  // Bigramas primeiro
  'cip processo': 'cip-processo',
  'cip envasamento': 'cip-envasamento-novo',
  'produto acabado': 'envase-produto-acabado',
  'provas horarias': 'envase-provas-horarias',
  'provas horárias': 'envase-provas-horarias',
  'agua enxague': 'microbiologia-agua-enxague',
  'água enxague': 'microbiologia-agua-enxague',
  'ar comprimido': 'ar-co2',
  'materia prima': 'fisico-materia-prima',
  'matéria prima': 'fisico-materia-prima',
  'fisico embalagem': 'fisico-embalagem',
  'físico embalagem': 'fisico-embalagem',

  // Processo produtivo
  'fermentacao': 'fermentacao',
  'fermentação': 'fermentacao',
  'filtracao': 'filtracao',
  'filtração': 'filtracao',
  'brassagem': 'brassagem',
  'mosturacao': 'brassagem',
  'mosturação': 'brassagem',
  'maturacao': 'maturacao',
  'maturação': 'maturacao',
  'desalcoolizacao': 'desalcoolizacao',
  'desalcoolização': 'desalcoolizacao',
  'captacao': 'captacao',
  'captação': 'captacao',
  'efluentes': 'tratamento-efluentes',
  'ete': 'tratamento-efluentes',
  'residuos': 'residuos',
  'resíduos': 'residuos',
  'co2': 'co2-beneficiado',
  'fermento': 'fermento',

  // Envase
  'envase': 'envase-produto-acabado',
  'chopp': 'envase-chopp',
  'arrolhamento': 'envase-arrolhamento',
  'assoprador': 'envase-assoprador',
  'lubrificante': 'envase-lubrificante',
  'recravacao': 'envase-recravacao',
  'recravação': 'envase-recravacao',
  'pasteurizador': 'envase-pasteurizador',
  'interunidades': 'envase-interunidades',

  // CIP
  'cip': 'cip-processo',

  // Microbiologia
  'micro': 'microbiologia-analise-microbiologia',
  'microbiologia': 'microbiologia-analise-microbiologia',
  'swab': 'microbiologia-swab',
  'estabilidade': 'microbiologia-estabilidade-micro',

  // Físico
  'quimicos': 'fisico-quimicos',
  'químicos': 'fisico-quimicos',
};

// Map de exibição para os slugs (bonitinhos)
export const LABELS_CATEGORIA: Record<string, string> = {
  'fermento': 'Fermento',
  'microbiologia-estabilidade-micro': 'Estabilidade Biológica Micro',
  'microbiologia-estabilidade-envase': 'Estabilidade Biológica Envase',
  'microbiologia-agua-enxague': 'Água de Enxague',
  'microbiologia-swab': 'SWAB',
  'microbiologia-analise-microbiologia': 'Análise Microbiológica',
  'envase-produto-acabado': 'Produto Acabado',
  'envase-chopp': 'Chopp',
  'envase-arrolhamento': 'Arrolhamento',
  'envase-provas-horarias': 'Provas Horárias',
  'envase-assoprador': 'Assoprador',
  'envase-lubrificante': 'Lubrificante de Esteira',
  'envase-recravacao': 'Recravação',
  'envase-pasteurizador': 'Pasteurizador',
  'envase-interunidades': 'Produto Interunidades',
  'fermentacao': 'Fermentação',
  'filtracao': 'Filtração',
  'brassagem': 'Brassagem',
  'maturacao': 'Maturação',
  'desalcoolizacao': 'Desalcoolização',
  'captacao': 'Captação',
  'tratamento-efluentes': 'Tratamento de Efluentes',
  'residuos': 'Resíduos',
  'ar-co2': 'Ar Comprimido e CO2',
  'co2-beneficiado': 'CO2 Beneficiado',
  'cip-processo': 'CIP — Processo',
  'cip-envasamento-novo': 'CIP — Envasamento Novo',
  'cip-envasamento-antigo': 'CIP — Envasamento Antigo',
  'fisico-embalagem': 'Físico — Embalagem',
  'fisico-materia-prima': 'Físico — Matéria-Prima',
  'fisico-quimicos': 'Físico — Químicos',
};

// ─── PERIODO_PATTERNS ─────────────────────────────────────────────────────────

const PERIODO_PATTERNS: {
  re: RegExp;
  resolver: (m: RegExpMatchArray) => { dataInicio: string; dataFim: string };
}[] = [
    {
      re: /(?:ú|u)ltim[oa]s?\s+(\d+)\s+dias?/i,
      resolver: m => diasAtras(Number(m[1])),
    },

    {
      re: /(?:ú|u)ltim[oa]\s+semana|semana\s+passada/i,
      resolver: () => semanaAtras(1),
    },
    {
      re: /(?:ú|u)ltim[oa]s?\s+(\d+)\s+semanas?/i,
      resolver: m => semanaAtras(Number(m[1])),
    },
    {
      re: /m(?:ê|e)s\s+passado/i,
      resolver: () => mesPassado(),
    },
    {
      re: /(?:ú|u)ltim[oa]\s+m(?:ê|e)s/i,
      resolver: () => mesesAtras(1),
    },
    {
      re: /(?:ú|u)ltim[oa]s?\s+(\d+)\s+m(?:ê|e)ses?/i,
      resolver: m => mesesAtras(Number(m[1])),
    },
    {
      re: /ano\s+passado/i,
      resolver: () => anoPassado(),
    },
    {
      re: /(?:ú|u)ltimo\s+ano/i,
      resolver: () => anosAtras(1),
    },
    {
      re: /(?:ú|u)ltimos?\s+(\d+)\s+anos?/i,
      resolver: m => anosAtras(Number(m[1])),
    },
    {
      re: /(?:ú|u)ltim[oa]s?\s+(\d+)\s+m(?:ê|e)ses?/i,
      resolver: m => mesesAtras(Number(m[1])),
    },
    {
      re: /(janeiro|fevereiro|mar[cç]o|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)(?:\s+(?:de\s+)?(\d{4}))?/i,
      resolver: m => mesNomeado(m[1], m[2]),
    },
    {
      re: /(\d{2})\/(\d{2})\/(\d{4})\s*[-a]\s*(\d{2})\/(\d{2})\/(\d{4})/,
      resolver: m => ({
        dataInicio: `${m[3]}-${m[2]}-${m[1]}`,
        dataFim: `${m[6]}-${m[5]}-${m[4]}`,
      }),
    },
  ];

// ─── Normalização ─────────────────────────────────────────────────────────────

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

// Injeta os labels exatos da UI (normalizados) como aliases válidos
// Garante que clicar numa sugestão do dropdown sempre resulte em match perfeito
Object.entries(LABELS_CATEGORIA).forEach(([slug, label]) => {
  PROCESSO_ALIASES[norm(label)] = slug;
});

// ─── parseSearchQuery ─────────────────────────────────────────────────────────

export function parseSearchQuery(input: string, catalogo: Catalogo): SearchTokens {
  const tokens: SearchTokens = {
    processos: [], produtos: [], ensaios: [], tipos: [],
    periodo: periodoDefault(),
    rawTerms: [], etiquetas: [],
  };

  if (!input.trim()) return tokens;

  // 1. Tenta resolver período primeiro — consome o trecho do input
  let restante = input;
  for (const { re, resolver } of PERIODO_PATTERNS) {
    const m = restante.match(re);
    if (m) {
      tokens.periodo = resolver(m);
      tokens.etiquetas.push({
        tipo: 'periodo',
        label: m[0],
        rawText: m[0],
        valor: `${tokens.periodo.dataInicio}:${tokens.periodo.dataFim}`
      });
      restante = restante.replace(m[0], ' ');
      break;
    }
  }

  // 2. Tokeniza o restante por delimitadores: vírgula, " e ", "+", ponto e vírgula, "·"
  const partes = restante
    .split(/[,;+·]|\se\s/i)
    .map(p => p.trim())
    .filter(Boolean);

  for (const parte of partes) {
    const chave = norm(parte);

    // 2a. Tenta processo — bigramas têm prioridade (estão listados primeiro no Record)
    const slugProcesso = PROCESSO_ALIASES[chave];
    if (slugProcesso) {
      if (!tokens.processos.includes(slugProcesso)) {
        tokens.processos.push(slugProcesso);
        const labelBonito = LABELS_CATEGORIA[slugProcesso] || parte;
        tokens.etiquetas.push({ tipo: 'processo', label: labelBonito, rawText: parte, valor: slugProcesso });
      }
      continue;
    }

    // 2b. Tipo de produto (exato primeiro, depois fuzzy)
    const tipoExato = catalogo.tipos?.find(t => norm(t.tipo) === chave);
    if (tipoExato) {
      if (!tokens.tipos.includes(tipoExato.tipo)) {
        tokens.tipos.push(tipoExato.tipo);
        tokens.etiquetas.push({ tipo: 'tipo-produto', label: tipoExato.tipo, rawText: parte, valor: tipoExato.tipo });
      }
      continue;
    }
    const tipoFuzzy = catalogo.tipos?.find(t => norm(t.tipo).includes(chave) && chave.length >= 3);
    if (tipoFuzzy) {
      if (!tokens.tipos.includes(tipoFuzzy.tipo)) {
        tokens.tipos.push(tipoFuzzy.tipo);
        tokens.etiquetas.push({ tipo: 'tipo-produto', label: tipoFuzzy.tipo, rawText: parte, valor: tipoFuzzy.tipo });
      }
      continue;
    }

    // 2c. Exato produto
    const produtoExato = catalogo.produtos.find(p => norm(p.nome) === chave);
    if (produtoExato) {
      if (!tokens.produtos.includes(produtoExato.id)) {
        tokens.produtos.push(produtoExato.id);
        tokens.etiquetas.push({ tipo: 'produto', label: produtoExato.nome, rawText: parte, valor: produtoExato.id });
      }
      continue;
    }

    // 2c. Exato ensaio (antes do fuzzy de produto para evitar "COR" → "COROA")
    const ensaioExato = catalogo.ensaios.find(e => norm(e.nome) === chave);
    if (ensaioExato) {
      if (!tokens.ensaios.includes(ensaioExato.id)) {
        tokens.ensaios.push(ensaioExato.id);
        tokens.etiquetas.push({ tipo: 'ensaio', label: ensaioExato.nome, rawText: parte, valor: ensaioExato.id });
      }
      continue;
    }

    // 2d. Fuzzy ensaio (startsWith tem prioridade sobre includes de produto)
    const ensaioFuzzy = catalogo.ensaios.find(e => norm(e.nome).includes(chave));
    if (ensaioFuzzy) {
      if (!tokens.ensaios.includes(ensaioFuzzy.id)) {
        tokens.ensaios.push(ensaioFuzzy.id);
        tokens.etiquetas.push({ tipo: 'ensaio', label: ensaioFuzzy.nome, rawText: parte, valor: ensaioFuzzy.id });
      }
      continue;
    }

    // 2e. Fuzzy produto (último recurso)
    const produtoFuzzy = catalogo.produtos.find(p => norm(p.nome).includes(chave));
    if (produtoFuzzy) {
      if (!tokens.produtos.includes(produtoFuzzy.id)) {
        tokens.produtos.push(produtoFuzzy.id);
        tokens.etiquetas.push({ tipo: 'produto', label: produtoFuzzy.nome, rawText: parte, valor: produtoFuzzy.id });
      }
      continue;
    }

    // 2d. Não reconhecido
    tokens.rawTerms.push(parte);
    tokens.etiquetas.push({ tipo: 'desconhecido', label: parte, rawText: parte, valor: parte });
  }

  return tokens;
}

// ─── gerarSugestoes ──────────────────────────────────────────────────────────
// Roda inteiramente no cliente — zero banco.

export function gerarSugestoes(input: string, catalogo: Catalogo): Sugestao[] {
  // Pega apenas o último fragmento digitado (após a última vírgula/·)
  const fragmento = input.split(/[,;+·]/).pop() ?? input;
  const chave = norm(fragmento.trim());
  if (chave.length < 2) return [];

  const resultado: Sugestao[] = [];

  // Processos — sem duplicatas de slug
  const slugsVistos = new Set<string>();
  for (const [alias, slug] of Object.entries(PROCESSO_ALIASES)) {
    if (norm(alias).includes(chave) && !slugsVistos.has(slug)) {
      slugsVistos.add(slug);
      // Usa a label bonita para sugerir
      const labelBonita = LABELS_CATEGORIA[slug] || alias;
      resultado.push({ tipo: 'processo', label: labelBonita, valor: slug });
    }
  }

  // Tipos de produto (máximo 5)
  (catalogo.tipos ?? [])
    .filter(t => norm(t.tipo).includes(chave))
    .slice(0, 5)
    .forEach(t => resultado.push({ tipo: 'tipo-produto', label: t.tipo, valor: t.tipo }));

  // Produtos (máximo 5)
  catalogo.produtos
    .filter(p => norm(p.nome).includes(chave))
    .slice(0, 5)
    .forEach(p => resultado.push({ tipo: 'produto', label: p.nome, valor: p.id }));

  // Ensaios (máximo 5)
  catalogo.ensaios
    .filter(e => norm(e.nome).includes(chave))
    .slice(0, 5)
    .forEach(e => resultado.push({ tipo: 'ensaio', label: e.nome, valor: e.id }));

  return resultado.slice(0, 15); // teto global
}
