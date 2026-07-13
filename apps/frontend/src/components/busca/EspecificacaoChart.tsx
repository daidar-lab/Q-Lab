// apps/frontend/src/components/busca/EspecificacaoChart.tsx
// Scatter de valores individuais com linhas de LIE/LSE para um ensaio.

import {
  ScatterChart, Scatter, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, ReferenceLine,
} from 'recharts';
import type { SearchResultRow } from '../../services/busca.api';

interface EspecificacaoChartProps {
  rows: SearchResultRow[];
  nomeEnsaio: string;
}

export function EspecificacaoChart({ rows, nomeEnsaio }: EspecificacaoChartProps) {
  const pontos = rows
    .map((r, i) => {
      const lieVal = r.limite_inferior !== null ? parseFloat(String(r.limite_inferior).replace(',', '.')) : null;
      const lseVal = r.limite_superior !== null ? parseFloat(String(r.limite_superior).replace(',', '.')) : null;
      return {
        x: i,
        y: parseFloat(String(r.valor).replace(',', '.')),
        data: r.data_resultado,
        conforme: r.conformidade === 'CONFORME',
        lie: isNaN(Number(lieVal)) ? null : lieVal,
        lse: isNaN(Number(lseVal)) ? null : lseVal,
      };
    })
    .filter(p => !isNaN(p.y));

  if (pontos.length === 0) return null;

  const lies = Array.from(new Set(pontos.map(p => p.lie).filter((v): v is number => v !== null)));
  const lses = Array.from(new Set(pontos.map(p => p.lse).filter((v): v is number => v !== null)));

  const limitesVariaveis = lies.length > 1 || lses.length > 1;
  const lieUnico = lies.length === 1 ? lies[0] : null;
  const lseUnico = lses.length === 1 ? lses[0] : null;

  const conformes  = pontos.filter(p =>  p.conforme);
  const ncPontos   = pontos.filter(p => !p.conforme);

  // Calcula limites dinâmicos para o eixo Y com folga
  const yValues = pontos.map(p => p.y);
  const lieValues = pontos.map(p => p.lie).filter((v): v is number => v !== null);
  const lseValues = pontos.map(p => p.lse).filter((v): v is number => v !== null);

  const minVal = Math.min(...yValues, ...lieValues);
  const maxVal = Math.max(...yValues, ...lseValues);
  const padding = (maxVal - minVal) * 0.2 || 0.5;
  const yDomain = [minVal - padding, maxVal + padding];

  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--r-lg)',
      padding: '20px 24px',
      marginBottom: '20px',
    }}>
      <h3 style={{ margin: '0 0 4px', fontSize: '14px', fontWeight: 700, color: 'var(--clr-text)' }}>
        {nomeEnsaio}
      </h3>
      <p style={{ margin: '0 0 16px', fontSize: '12px', color: 'var(--clr-text-3)' }}>
        {pontos.length} medições
        {!limitesVariaveis && lieUnico != null ? ` · LIE ${lieUnico}` : ''}
        {!limitesVariaveis && lseUnico != null ? ` · LSE ${lseUnico}` : ''}
        {limitesVariaveis ? ' · Limites variáveis' : ''}
      </p>
      <ResponsiveContainer width="100%" height={220}>
        <ScatterChart margin={{ top: 8, right: 8, bottom: 8, left: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border)" vertical={false} />
          
          {/* Eixo X agora usa index, mas formata exibindo a data correta */}
          <XAxis 
            dataKey="x" 
            type="number"
            domain={['dataMin', 'dataMax']}
            tick={{ fontSize: 10, fill: 'var(--clr-text-3)' }}
            tickLine={false}
            axisLine={false}
            minTickGap={45}
            tickFormatter={(val) => {
              const p = pontos.find(pt => pt.x === val);
              if (!p || !p.data) return '';
              const datePart = p.data.split('T')[0].split(' ')[0];
              const partes = datePart.split('-');
              if (partes.length === 3) return `${partes[2]}/${partes[1]}`;
              return datePart;
            }}
          />
          
          <YAxis
            dataKey="y"
            tick={{ fontSize: 11, fill: 'var(--clr-text-3)' }}
            tickLine={false}
            axisLine={false}
            domain={yDomain}
            width={45}
          />
          
          <Tooltip
            content={({ payload }) => {
              if (!payload?.length) return null;
              const d = payload[0].payload;
              return (
                <div style={{
                  background: 'var(--clr-surface)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: '8px',
                  padding: '8px 12px',
                  fontSize: '12px',
                  boxShadow: 'var(--shadow-md)',
                }}>
                  <div style={{ fontWeight: 600, color: d.conforme ? 'var(--clr-success)' : 'var(--clr-danger)' }}>
                    Valor: {d.y} {d.conforme ? '(Conforme)' : '(Não Conforme)'}
                  </div>
                  {d.lie !== null && <div>LIE: {d.lie}</div>}
                  {d.lse !== null && <div>LSE: {d.lse}</div>}
                  <div style={{ color: 'var(--clr-text-3)', marginTop: '4px' }}>{d.data}</div>
                </div>
              );
            }}
          />

          {!limitesVariaveis && lieUnico != null && (
            <ReferenceLine y={lieUnico} stroke="#DC2626" strokeDasharray="4 2" label={{ value: 'LIE', fill: '#DC2626', fontSize: 10 }} />
          )}
          {!limitesVariaveis && lseUnico != null && (
            <ReferenceLine y={lseUnico} stroke="#DC2626" strokeDasharray="4 2" label={{ value: 'LSE', fill: '#DC2626', fontSize: 10 }} />
          )}

          <Scatter data={conformes} fill="var(--clr-success)" opacity={0.7} r={3.5} />
          <Scatter data={ncPontos}  fill="var(--clr-danger)" opacity={0.9} r={4.5} />
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
