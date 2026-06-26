import { useState, type CSSProperties } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Props {
    dados: any;
    modo: 'ranges' | 'granularidade';
}

type Tab = 'frequencia' | 'conformidade';

export function CategoricoComparacaoChart({ dados, modo }: Props) {
    const [aba, setAba] = useState<Tab>('frequencia');

    const tab = (active: boolean): CSSProperties => ({
        padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer', border: 'none',
        background: active ? '#18181b' : '#f4f4f5',
        color: active ? '#fff' : '#52525b',
        whiteSpace: 'nowrap',
    });

    const CORES = [
        'oklch(0.62 0.19 260)',
        'oklch(0.68 0.16 180)',
        'oklch(0.72 0.15 140)',
        'oklch(0.65 0.19 45)',
        'oklch(0.52 0.18 320)'
    ];

    if (modo === 'ranges') {
        const freqList = (dados.frequencia ?? []) as any[];
        const confList = (dados.conformidade ?? []) as any[];

        // 1. Group Frequencies by Category
        const catsMap: Record<string, any> = {};
        freqList.forEach(d => {
            const c = d.categoria || 'Outro';
            if (!catsMap[c]) {
                catsMap[c] = { categoria: c, freq1: 0, pct1: 0, freq2: 0, pct2: 0 };
            }
            if (d.periodo === 'periodo_1') {
                catsMap[c].freq1 = Number(d.frequencia);
                catsMap[c].pct1 = Number(d.pct);
            } else {
                catsMap[c].freq2 = Number(d.frequencia);
                catsMap[c].pct2 = Number(d.pct);
            }
        });
        const combinedFreq = Object.values(catsMap).sort((a: any, b: any) => (b.freq1 + b.freq2) - (a.freq1 + a.freq2));

        // 2. Conformity stats
        const conf1 = confList.find(c => c.periodo === 'periodo_1') || {};
        const conf2 = confList.find(c => c.periodo === 'periodo_2') || {};

        return (
            <div>
                <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                    <button style={tab(aba === 'frequencia')} onClick={() => setAba('frequencia')}>Frequência</button>
                    <button style={tab(aba === 'conformidade')} onClick={() => setAba('conformidade')}>Conformidade</button>
                </div>

                {aba === 'frequencia' && (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart layout="vertical" data={combinedFreq} margin={{ top: 4, right: 32, left: 8, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis type="number" tick={{ fontSize: 11 }} />
                            <YAxis type="category" dataKey="categoria" tick={{ fontSize: 11 }} width={100} />
                            <Tooltip
                                formatter={(v: any, name: any, props: any) => {
                                    const isP1 = name === 'Período 1';
                                    const pct = isP1 ? props.payload.pct1 : props.payload.pct2;
                                    return [`${v} (${pct}%)`, name];
                                }}
                            />
                            <Legend wrapperStyle={{ fontSize: 11 }} />
                            <Bar name="Período 1" dataKey="freq1" fill="oklch(0.62 0.19 260)" radius={[0, 3, 3, 0]} />
                            <Bar name="Período 2" dataKey="freq2" fill="oklch(0.65 0.19 45)" radius={[0, 3, 3, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                )}

                {aba === 'conformidade' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr 1fr', gap: '8px', borderBottom: '1px solid #e4e4e7', paddingBottom: '8px', fontWeight: 600, fontSize: '12px', color: '#71717a' }}>
                            <span>Indicador</span>
                            <span>Período 1</span>
                            <span>Período 2</span>
                        </div>
                        {[
                            { label: 'Total de Resultados', val1: conf1.total ?? 0, val2: conf2.total ?? 0 },
                            { label: 'Resultados Conformes', val1: conf1.n_conforme ?? 0, val2: conf2.n_conforme ?? 0 },
                            { label: 'Resultados Não Conformes', val1: conf1.n_nao_conforme ?? 0, val2: conf2.n_nao_conforme ?? 0 },
                            { label: 'Conformidade (%)', val1: conf1.pct_conforme != null ? `${conf1.pct_conforme}%` : '—', val2: conf2.pct_conforme != null ? `${conf2.pct_conforme}%` : '—' },
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
        const rawList = (dados ?? []) as any[];
        const periodosMap: Record<string, any> = {};
        rawList.forEach(d => {
            const p = d.periodo;
            const c = d.categoria || 'Outro';
            if (!periodosMap[p]) {
                periodosMap[p] = { periodo: p };
            }
            periodosMap[p][c] = Number(d.frequencia);
        });

        const catsSet = new Set<string>();
        rawList.forEach(d => {
            if (d.categoria) catsSet.add(d.categoria);
        });
        const cats = Array.from(catsSet);
        const data = Object.values(periodosMap).sort((a: any, b: any) => a.periodo.localeCompare(b.periodo));

        return (
            <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#71717a', marginBottom: '12px' }}>
                    Evolução das Categorias por Período
                </h4>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {cats.map((c, i) => (
                            <Bar key={c} name={c} dataKey={c} stackId="a" fill={CORES[i % CORES.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
}
