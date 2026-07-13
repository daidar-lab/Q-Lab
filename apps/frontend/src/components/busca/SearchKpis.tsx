// apps/frontend/src/components/busca/SearchKpis.tsx
// KPIs calculados da lista de resultados da busca.

import type { AgregacoesBuscaResponse } from '../../services/busca.api';
import type { SearchTokens } from '../../lib/search-parser';

interface SearchKpisProps {
  agregacoes: AgregacoesBuscaResponse['kpis'];
  tokens: SearchTokens;
  carregando?: boolean;
}

export function SearchKpis({ agregacoes, carregando }: SearchKpisProps) {
  if (!agregacoes || agregacoes.totalResultados === 0) return null;

  const total = agregacoes.totalResultados;
  const nc = agregacoes.naoConformes;
  const pct = agregacoes.taxaConformidade;
  const ensaiosDistintos = new Set(agregacoes.ensaiosIds).size;
  const produtosDistintos = new Set(agregacoes.produtosIds).size;

  const cards = [
    { label: 'RESULTADOS',           value: total.toLocaleString('pt-BR'),      cor: 'var(--clr-text)' },
    { label: 'NÃO CONFORMES',        value: nc.toLocaleString('pt-BR'),         cor: nc > 0 ? 'var(--clr-danger)' : 'var(--clr-text)' },
    { label: 'CONFORMIDADE',         value: carregando ? '—' : `${pct}%`,       cor: 'var(--clr-text)' },
    { label: 'ENSAIOS DISTINTOS',    value: ensaiosDistintos.toLocaleString('pt-BR'), cor: 'var(--clr-text)' },
    { label: 'PRODUTOS DISTINTOS',   value: produtosDistintos.toLocaleString('pt-BR'), cor: 'var(--clr-text)' },
  ];

  return (
    <div style={{
      display: 'flex',
      gap: '12px',
      flexWrap: 'wrap',
      marginBottom: '20px',
    }}>
      {cards.map(c => (
        <div key={c.label} style={{
          flex: '1 1 160px',
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: 'var(--r-lg)',
          padding: '16px 20px',
        }}>
          <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--clr-text-3)', letterSpacing: '0.08em', marginBottom: '8px' }}>
            {c.label}
          </div>
          <div style={{ fontSize: '26px', fontWeight: 800, color: c.cor, lineHeight: 1 }}>
            {c.value}
          </div>
        </div>
      ))}
    </div>
  );
}
