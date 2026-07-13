// apps/frontend/src/components/busca/ConformidadeChart.tsx
// Série temporal de conformidade dos resultados da busca (recharts).

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { SearchResultRow } from '../../services/busca.api';

interface ConformidadeChartProps {
  rows: SearchResultRow[];
  periodo: { dataInicio: string; dataFim: string };
}

export function ConformidadeChart({ rows, periodo }: ConformidadeChartProps) {
  if (rows.length === 0) return null;

  // Granularidade automática baseada no período
  const inicio = new Date(periodo.dataInicio);
  const fim    = new Date(periodo.dataFim);
  const dias   = Math.ceil((fim.getTime() - inicio.getTime()) / 86_400_000);

  function agruparPor(row: SearchResultRow): string {
    const d = new Date(row.data_resultado);
    if (dias <= 7)  return row.data_resultado.slice(0, 10);
    if (dias <= 90) {
      // Semana ISO
      const jan1 = new Date(d.getFullYear(), 0, 1);
      const sem  = Math.ceil(((d.getTime() - jan1.getTime()) / 86_400_000 + jan1.getDay() + 1) / 7);
      return `${d.getFullYear()}-S${String(sem).padStart(2, '0')}`;
    }
    return row.data_resultado.slice(0, 7); // YYYY-MM
  }

  // Agrega por período
  const mapa = new Map<string, { conforme: number; nc: number }>();
  for (const r of rows) {
    const chave = agruparPor(r);
    const atual = mapa.get(chave) ?? { conforme: 0, nc: 0 };
    if (r.conformidade === 'CONFORME') atual.conforme++;
    else atual.nc++;
    mapa.set(chave, atual);
  }

  const data = Array.from(mapa.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([periodo, v]) => ({
      periodo,
      'Conforme':      v.conforme,
      'Não Conforme':  v.nc,
    }));

  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--r-lg)',
      padding: '20px 24px',
      marginBottom: '20px',
    }}>
      <h3 style={{ margin: '0 0 16px', fontSize: '14px', fontWeight: 700, color: 'var(--clr-text)' }}>
        Conformidade por período
      </h3>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" vertical={false} />
          <XAxis
            dataKey="periodo"
            tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }}
            tickLine={false}
            axisLine={false}
          />
          <YAxis
            tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }}
            tickLine={false}
            axisLine={false}
          />
          <Tooltip
            contentStyle={{
              background: 'var(--clr-surface)',
              border: '1px solid var(--clr-border)',
              borderRadius: '8px',
              fontSize: '12px',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Bar dataKey="Conforme"     fill="#16A34A" radius={[3,3,0,0]} maxBarSize={40} />
          <Bar dataKey="Não Conforme" fill="#DC2626" radius={[3,3,0,0]} maxBarSize={40} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
