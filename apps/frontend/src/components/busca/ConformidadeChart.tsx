// apps/frontend/src/components/busca/ConformidadeChart.tsx
// Série temporal de conformidade dos resultados da busca (recharts).

import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend, LabelList
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

  // Cálculos do resumo inteligente
  let totalConforme = 0;
  let totalNaoConforme = 0;
  let piorMes = dados[0];
  let maiorTaxaNaoConformidade = -1;

  dados.forEach(d => {
    totalConforme += d.conforme;
    totalNaoConforme += d.naoConforme;
    
    const totalMes = d.conforme + d.naoConforme;
    const taxaNC = totalMes > 0 ? (d.naoConforme / totalMes) : 0;
    
    if (taxaNC > maiorTaxaNaoConformidade) {
      maiorTaxaNaoConformidade = taxaNC;
      piorMes = d;
    }
  });

  const total = totalConforme + totalNaoConforme;
  const mediaConformidade = total > 0 ? ((totalConforme / total) * 100).toFixed(1) : '0.0';
  const showLabels = dados.length <= 6; // Se tiver até 6 meses, exibe os rótulos acima das barras
  const maxBarSize = dados.length <= 3 ? 80 : 40; // Barras mais largas quando há poucos meses

  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--r-lg)',
      padding: '20px 24px',
      marginBottom: '20px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <h3 style={{ margin: 0, fontSize: '15px', fontWeight: 700, color: 'var(--clr-text)' }}>
          Conformidade por período
        </h3>
        
        {/* Resumo Inteligente */}
        <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
            <span style={{ color: 'var(--clr-text-3)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Média Geral
            </span>
            <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '14px' }}>
              {mediaConformidade}%
            </span>
          </div>
          
          {totalNaoConforme > 0 && maiorTaxaNaoConformidade >= 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderLeft: '1px solid var(--clr-border)', paddingLeft: '16px' }}>
              <span style={{ color: 'var(--clr-text-3)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Pior índice ({piorMes.periodo.split('-').reverse().join('/')})
              </span>
              <span style={{ fontWeight: 800, color: '#DC2626', fontSize: '14px' }}>
                {piorMes.naoConforme} NCs <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8 }}>({(maiorTaxaNaoConformidade * 100).toFixed(1)}%)</span>
              </span>
            </div>
          )}
        </div>
      </div>

      <ResponsiveContainer width="100%" height={showLabels ? 160 : 200}>
        <BarChart data={chartData} margin={{ top: showLabels ? 24 : 8, right: 8, bottom: 0, left: 0 }}>
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
              boxShadow: 'var(--shadow-md)',
            }}
          />
          <Legend wrapperStyle={{ fontSize: '12px', paddingTop: '8px' }} />
          <Bar dataKey="Conforme" fill="#16A34A" radius={[3,3,0,0]} maxBarSize={maxBarSize}>
            {showLabels && <LabelList dataKey="Conforme" position="top" fill="#15803D" fontSize={11} fontWeight={600} />}
          </Bar>
          <Bar dataKey="Não Conforme" fill="#DC2626" radius={[3,3,0,0]} maxBarSize={maxBarSize}>
            {showLabels && <LabelList dataKey="Não Conforme" position="top" fill="#B91C1C" fontSize={11} fontWeight={600} />}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
