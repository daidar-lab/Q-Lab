// apps/frontend/src/components/busca/SearchKpis.tsx
// KPIs calculados da lista de resultados da busca.

import type { SearchResultRow } from '../../services/busca.api';
import type { SearchTokens } from '../../lib/search-parser';

interface SearchKpisProps {
  rows: SearchResultRow[];
  tokens: SearchTokens;
}

export function SearchKpis({ rows }: SearchKpisProps) {
  if (rows.length === 0) return null;

  const total        = rows.length;
  const nc           = rows.filter(r => r.conformidade === 'NÃO CONFORME').length;
  const conforme     = total - nc;
  const pct          = total > 0 ? ((conforme / total) * 100).toFixed(1) : '—';
  const ensaiosDistintos = new Set(rows.map(r => r.cod_ensaio)).size;
  const produtosDistintos = new Set(rows.map(r => r.cod_produto)).size;

  const cards = [
    { label: 'RESULTADOS',           value: total.toLocaleString('pt-BR'),      cor: 'var(--clr-text)' },
    { label: 'NÃO CONFORMES',        value: nc.toLocaleString('pt-BR'),         cor: nc > 0 ? 'var(--clr-danger)' : 'var(--clr-text)' },
    { label: 'CONFORMIDADE',         value: `${pct}%`,                          cor: 'var(--clr-text)' },
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
