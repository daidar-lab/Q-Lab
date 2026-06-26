import { useState, type CSSProperties } from 'react';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Legend, Cell
} from 'recharts';

interface Props {
    dados: any;
    modo: 'ranges' | 'granularidade';
}

type TabA = 'serie' | 'histograma' | 'estatisticas';

export function NumericoComparacaoChart({ dados, modo }: Props) {
    const [abaA, setAbaA] = useState<TabA>('serie');

    const tab = (active: boolean): CSSProperties => ({
        padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer', border: 'none',
        background: active ? '#18181b' : '#f4f4f5',
        color: active ? '#fff' : '#52525b',
        whiteSpace: 'nowrap',
    });

    if (modo === 'ranges') {
        const serie1 = (dados.serie1 ?? []) as any[];
        const serie2 = (dados.serie2 ?? []) as any[];
        const stats = (dados.estatisticas ?? []) as any[];
        const histogramData = (dados.histograma ?? []) as any[];

        // 1. Align Line Chart by Index
        const maxLen = Math.max(serie1.length, serie2.length);
        const combinedSerie = Array.from({ length: maxLen }, (_, i) => ({
            ponto: `Ponto ${i + 1}`,
            val1: serie1[i] ? Number(serie1[i].valor_num) : null,
            data1: serie1[i]?.data || '',
            val2: serie2[i] ? Number(serie2[i].valor_num) : null,
            data2: serie2[i]?.data || '',
        }));

        const lie1 = serie1[0]?.lie;
        const lse1 = serie1[0]?.lse;

        const lieNum1 = stats.find(s => s.periodo === 'periodo_1')?.lie != null ? Number(stats.find(s => s.periodo === 'periodo_1')?.lie) : null;
        const lseNum1 = stats.find(s => s.periodo === 'periodo_1')?.lse != null ? Number(stats.find(s => s.periodo === 'periodo_1')?.lse) : null;
        const lieNum2 = stats.find(s => s.periodo === 'periodo_2')?.lie != null ? Number(stats.find(s => s.periodo === 'periodo_2')?.lie) : null;
        const lseNum2 = stats.find(s => s.periodo === 'periodo_2')?.lse != null ? Number(stats.find(s => s.periodo === 'periodo_2')?.lse) : null;


        // 2. Align Histogram Bins
        const binsMap: Record<number, any> = {};
        histogramData.forEach(h => {
            const idx = Number(h.bin_idx);
            if (!binsMap[idx]) {
                binsMap[idx] = {
                    bin_idx: idx,
                    bin_inicio: Number(h.bin_inicio).toFixed(2),
                    freq1: 0,
                    freq2: 0,
                };
            }
            if (h.periodo === 'periodo_1') {
                binsMap[idx].freq1 = Number(h.frequencia);
            } else {
                binsMap[idx].freq2 = Number(h.frequencia);
            }
        });
        const combinedHistogram = Object.values(binsMap).sort((a: any, b: any) => a.bin_idx - b.bin_idx);

        // 3. Stats Side-by-side
        const stat1 = stats.find(s => s.periodo === 'periodo_1') || {};
        const stat2 = stats.find(s => s.periodo === 'periodo_2') || {};

        return (
            <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {(['serie', 'histograma', 'estatisticas'] as TabA[]).map(a => (
                        <button key={a} style={tab(abaA === a)} onClick={() => setAbaA(a)}>
                            {{ serie: 'Série Comparativa', histograma: 'Histograma Comparativo', estatisticas: 'Estatísticas' }[a]}
                        </button>
                    ))}
                </div>

                {abaA === 'serie' && (
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={combinedSerie} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="ponto" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(value: any, name: any, props: any) => {
                                    const isP1 = name === 'Período 1';
                                    const date = isP1 ? props.payload.data1 : props.payload.data2;
                                    return [`${value} (${date || 'Sem data'})`, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11, marginTop: 4 }} />
                            {lie1 && <ReferenceLine y={Number(lie1)} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'LIE P1', fontSize: 9, fill: '#ef4444' }} />}
                            {lse1 && <ReferenceLine y={Number(lse1)} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'LSE P1', fontSize: 9, fill: '#ef4444' }} />}
                            <Line type="monotone" name="Período 1" dataKey="val1" stroke="oklch(0.62 0.19 260)" strokeWidth={2} dot={false} connectNulls />
                            <Line type="monotone" name="Período 2" dataKey="val2" stroke="oklch(0.65 0.19 45)" strokeWidth={2} dot={false} connectNulls />
                        </LineChart>
                    </ResponsiveContainer>
                )}

                {abaA === 'histograma' && (
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={combinedHistogram} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="bin_inicio" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip labelFormatter={v => `A partir de ${v}`} />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar name="Período 1" dataKey="freq1" radius={[3, 3, 0, 0]}>
                                {combinedHistogram.map((entry: any, idx: number) => {
                                    const bin = Number(entry.bin_inicio);
                                    const inside = lieNum1 != null && lseNum1 != null && !Number.isNaN(bin) && bin >= lieNum1 && bin <= lseNum1;
                                    return <Cell key={`p1-${idx}`} fill={inside ? '#16a34a' : '#ef4444'} />;
                                })}
                            </Bar>
                            <Bar name="Período 2" dataKey="freq2" radius={[3, 3, 0, 0]}>
                                {combinedHistogram.map((entry: any, idx: number) => {
                                    const bin = Number(entry.bin_inicio);
                                    const inside = lieNum2 != null && lseNum2 != null && !Number.isNaN(bin) && bin >= lieNum2 && bin <= lseNum2;
                                    return <Cell key={`p2-${idx}`} fill={inside ? '#16a34a' : '#ef4444'} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {abaA === 'estatisticas' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', borderBottom: '1px solid #e4e4e7', paddingBottom: '8px', fontWeight: 600, fontSize: '12px', color: '#71717a' }}>
                            <span>Indicador</span>
                            <span>Período 1</span>
                            <span>Período 2</span>
                        </div>
                        {[
                            { label: 'N (Amostras)', val1: stat1.n, val2: stat2.n },
                            { label: 'Média', val1: stat1.media != null ? Number(stat1.media).toFixed(4) : '—', val2: stat2.media != null ? Number(stat2.media).toFixed(4) : '—' },
                            { label: 'Desvio Padrão', val1: stat1.desvio != null ? Number(stat1.desvio).toFixed(4) : '—', val2: stat2.desvio != null ? Number(stat2.desvio).toFixed(4) : '—' },
                            { label: 'Mínimo', val1: stat1.minimo != null ? Number(stat1.minimo).toFixed(4) : '—', val2: stat2.minimo != null ? Number(stat2.minimo).toFixed(4) : '—' },
                            { label: 'Máximo', val1: stat1.maximo != null ? Number(stat1.maximo).toFixed(4) : '—', val2: stat2.maximo != null ? Number(stat2.maximo).toFixed(4) : '—' },
                            { label: '% Conforme', val1: stat1.pct_conforme != null ? `${stat1.pct_conforme}%` : '—', val2: stat2.pct_conforme != null ? `${stat2.pct_conforme}%` : '—' },
                            { label: 'LIE', val1: stat1.lie ?? '—', val2: stat2.lie ?? '—' },
                            { label: 'LSE', val1: stat1.lse ?? '—', val2: stat2.lse ?? '—' },
                        ].map((row, i) => (
                            <div key={i} style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', fontSize: '13px', borderBottom: '1px solid #f4f4f5', paddingBottom: '6px' }}>
                                <span style={{ color: '#52525b', fontWeight: 500 }}>{row.label}</span>
                                <span style={{ fontWeight: 700, color: '#18181b' }}>{row.val1}</span>
                                <span style={{ fontWeight: 700, color: '#18181b' }}>{row.val2}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    } else {
        // granularidade (Option B)
        const evolucao = (dados ?? []) as any[];

        return (
            <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#71717a', marginBottom: '12px' }}>
                    Evolução da Média por Período
                </h4>
                <ResponsiveContainer width="100%" height={260}>
                    <LineChart data={evolucao} margin={{ top: 12, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip
                            formatter={(value: any, name: any, props: any) => {
                                if (name === 'Média') {
                                    return [
                                        `Média: ${value} (n=${props.payload.n}, conf=${props.payload.pct_conforme}%)`,
                                        name
                                    ];
                                }
                                return [value, name];
                            }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Line type="monotone" name="Média" dataKey="media" stroke="oklch(0.62 0.19 260)" strokeWidth={2} dot={{ r: 4 }} connectNulls />
                        <Line type="monotone" name="Mínimo" dataKey="minimo" stroke="#a1a1aa" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                        <Line type="monotone" name="Máximo" dataKey="maximo" stroke="#a1a1aa" strokeWidth={1} dot={false} strokeDasharray="3 3" />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        );
    }
}
