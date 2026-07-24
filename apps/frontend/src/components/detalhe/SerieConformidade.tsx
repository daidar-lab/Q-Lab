import { ResponsiveContainer, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine } from 'recharts';
import styles from './SerieConformidade.module.css';

interface SerieItem {
  periodo: string;
  total: number;
  n_conforme: number;
  pct_conforme: number;
}

interface SerieConformidadeProps {
  dados: {
    granularidade: 'hour' | 'day' | 'week' | 'month';
    dados: SerieItem[];
  };
  limites?: {
    lie: number;
    lse: number;
  } | null;
}

export default function SerieConformidade({ dados, limites }: SerieConformidadeProps) {
  const { granularidade = 'month', dados: listaDados = [] } = dados || {};

  // Formata o período de acordo com a granularidade
  const dadosFormatados = listaDados.map((item) => {
    let periodoFormatado = item.periodo;

    if (granularidade === 'hour') {
      // Exemplo: '2026-06-22 06-12h' -> '22/06 06-12h'
      const partes = item.periodo.split(' ');
      if (partes.length === 2) {
        const [data, hora] = partes;
        const [mes, dia] = data.split('-');
        if (dia && mes) {
          periodoFormatado = `${dia}/${mes} ${hora}`;
        }
      }
    } else if (granularidade === 'day') {
      // Exemplo: '2026-06-22' -> '22/06'
      const [mes, dia] = item.periodo.split('-');
      if (dia && mes) {
        periodoFormatado = `${dia}/${mes}`;
      }
    } else if (granularidade === 'week') {
      // Exemplo: '2026-25' -> 'W25/26'
      const [ano, sem] = item.periodo.split('-');
      if (ano && sem) {
        periodoFormatado = `W${sem}/${ano.slice(-2)}`;
      }
    } else {
      // Exemplo: '2026-06' -> '06/2026'
      const [ano, mes] = item.periodo.split('-');
      if (ano && mes) {
        periodoFormatado = `${mes}/${ano}`;
      }
    }

    return {
      ...item,
      periodoFormatado,
    };
  });

  const titulos = {
    hour: 'Histórico de Conformidade por Turno (6h)',
    day: 'Histórico de Conformidade Diária',
    week: 'Histórico de Conformidade Semanal',
    month: 'Histórico de Conformidade Mensal',
  };

  const chartTitle = titulos[granularidade] || titulos.month;

  // Resumo Inteligente — pior período e média geral
  let totalNC = 0;
  let totalConf = 0;
  let piorItem = listaDados[0] as SerieItem | undefined;
  let maiorTaxaNC = -1;

  listaDados.forEach((item) => {
    totalNC += (item.total - item.n_conforme);
    totalConf += item.n_conforme;

    const nc = item.total - item.n_conforme;
    const taxa = item.total > 0 ? nc / item.total : 0;
    if (taxa > maiorTaxaNC) {
      maiorTaxaNC = taxa;
      piorItem = item;
    }
  });

  // Usa pct_conforme do backend diretamente para a média (mais confiável)
  const valoresValidos = listaDados.map(item => Number(item.pct_conforme)).filter(v => !isNaN(v));
  const mediaConformidade = valoresValidos.length > 0
    ? (valoresValidos.reduce((acc, v) => acc + v, 0) / valoresValidos.length).toFixed(1)
    : null;

  // Formata o label do pior período
  const formatarPeriodo = (periodo: string) => {
    if (granularidade === 'month') {
      const [ano, mes] = periodo.split('-');
      return mes && ano ? `${mes}/${ano}` : periodo;
    }
    if (granularidade === 'week') {
      const [ano, sem] = periodo.split('-');
      return ano && sem ? `W${sem}/${ano.slice(-2)}` : periodo;
    }
    if (granularidade === 'day') {
      const parts = periodo.split('-');
      return parts.length >= 3 ? `${parts[2]}/${parts[1]}` : periodo;
    }
    return periodo;
  };

  // Se os limites estiverem definidos, podemos expandir o domínio do eixo Y para que apareçam
  const minLim = limites ? Math.min(0, limites.lie) : 0;
  const maxLim = limites ? Math.max(100, limites.lse) : 100;
  const yDomain = [minLim, maxLim];

  return (
    <div className={styles.chartCard}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '12px', marginBottom: '8px' }}>
        <h3 className={styles.chartTitle} style={{ margin: 0 }}>{chartTitle}</h3>

        {/* Resumo Inteligente */}
        {listaDados.length > 0 && (
          <div style={{ display: 'flex', gap: '16px', fontSize: '12px' }}>
            {mediaConformidade !== null && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end' }}>
                <span style={{ color: 'var(--clr-text-3)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Média Geral
                </span>
                <span style={{ fontWeight: 800, color: '#16A34A', fontSize: '14px' }}>
                  {mediaConformidade}%
                </span>
              </div>
            )}

            {piorItem && totalNC > 0 && maiorTaxaNC > 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', borderLeft: '1px solid var(--clr-border)', paddingLeft: '16px' }}>
                <span style={{ color: 'var(--clr-text-3)', fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Pior período ({formatarPeriodo(piorItem.periodo)})
                </span>
                <span style={{ fontWeight: 800, color: '#DC2626', fontSize: '14px' }}>
                  {piorItem.total - piorItem.n_conforme} NCs{' '}
                  <span style={{ fontSize: '12px', fontWeight: 600, opacity: 0.8 }}>
                    ({(maiorTaxaNC * 100).toFixed(1)}%)
                  </span>
                </span>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.chartContainer}>
        <ResponsiveContainer width="100%" height={280}>
          <AreaChart data={dadosFormatados} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="colorConformidade" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="var(--clr-success, #16A34A)" stopOpacity={0.2} />
                <stop offset="95%" stopColor="var(--clr-success, #16A34A)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border, #E7E5E4)" />
            <XAxis
              dataKey="periodoFormatado"
              tick={{ fontSize: 11, fill: 'var(--clr-text-2, #57534E)' }}
            />
            <YAxis
              tick={{ fontSize: 11, fill: 'var(--clr-text-2, #57534E)' }}
              domain={yDomain}
              unit="%"
            />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--clr-surface, #FFFFFF)',
                borderColor: 'var(--clr-border, #E7E5E4)',
                borderRadius: 'var(--r-md, 8px)',
                color: 'var(--clr-text, #1C1917)'
              }}
              formatter={(value: any, name: string) => {
                if (name === 'pct_conforme') {
                  return [`${value}%`, 'Conformidade'];
                }
                if (name === 'total') {
                  return [value, 'Total Amostras'];
                }
                return [value, name];
              }}
            />
            <Area
              type="monotone"
              dataKey="pct_conforme"
              stroke="var(--clr-success, #16A34A)"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorConformidade)"
            />

            {limites && limites.lie !== undefined && limites.lie !== null && (
              <ReferenceLine
                y={limites.lie}
                stroke="#E76F51"
                strokeDasharray="3 3"
                label={{ value: `LIE: ${limites.lie}`, position: 'insideBottomLeft', fill: '#E76F51', fontSize: 10 }}
              />
            )}
            {limites && limites.lse !== undefined && limites.lse !== null && (
              <ReferenceLine
                y={limites.lse}
                stroke="#E76F51"
                strokeDasharray="3 3"
                label={{ value: `LSE: ${limites.lse}`, position: 'insideTopLeft', fill: '#E76F51', fontSize: 10 }}
              />
            )}
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
