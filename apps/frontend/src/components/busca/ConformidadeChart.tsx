// apps/frontend/src/components/busca/ConformidadeChart.tsx
// Série temporal de conformidade dos resultados da busca (recharts).

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from 'recharts';
import type { AgregacoesBuscaResponse } from '../../services/busca.api';

interface ConformidadeChartProps {
  dados: AgregacoesBuscaResponse['graficoConformidade'];
}

export function ConformidadeChart({ dados }: ConformidadeChartProps) {
  if (!dados || dados.length === 0) return null;

  const chartData = dados.map(d => ({
    periodo: d.periodo,
    'Conforme': d.conforme,
    'Não Conforme': d.naoConforme
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
        <BarChart data={chartData} margin={{ top: 4, right: 8, bottom: 0, left: 0 }}>
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
