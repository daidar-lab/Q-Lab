import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface Props {
    dados: any;
    modo: 'ranges' | 'granularidade';
}

export function FaixaComparacaoChart({ dados, modo }: Props) {
    const rawList = (dados ?? []) as any[];

    if (modo === 'ranges') {
        const faixasMap: Record<string, any> = {};
        rawList.forEach(d => {
            const f = d.faixa || 'Outro';
            if (!faixasMap[f]) {
                faixasMap[f] = { faixa: f, freq1: 0, pct1: 0, freq2: 0, pct2: 0 };
            }
            if (d.periodo === 'periodo_1') {
                faixasMap[f].freq1 = Number(d.frequencia);
                faixasMap[f].pct1 = Number(d.pct);
            } else {
                faixasMap[f].freq2 = Number(d.frequencia);
                faixasMap[f].pct2 = Number(d.pct);
            }
        });
        const combined = Object.values(faixasMap).sort((a: any, b: any) => (b.freq1 + b.freq2) - (a.freq1 + a.freq2));

        return (
            <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#71717a', marginBottom: '12px' }}>
                    Distribuição de Faixas por Período
                </h4>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart layout="vertical" data={combined} margin={{ top: 4, right: 32, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="faixa" tick={{ fontSize: 11 }} width={80} />
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
            </div>
        );
    } else {
        // granularidade (Option B)
        // Group by period to render evolution of faixas over time
        const periodosMap: Record<string, any> = {};
        rawList.forEach(d => {
            const p = d.periodo;
            const f = d.faixa || 'Outro';
            if (!periodosMap[p]) {
                periodosMap[p] = { periodo: p };
            }
            periodosMap[p][f] = Number(d.frequencia);
        });

        // Get unique faixas to set as Bar keys
        const faixasSet = new Set<string>();
        rawList.forEach(d => {
            if (d.faixa) faixasSet.add(d.faixa);
        });
        const faixas = Array.from(faixasSet);
        const data = Object.values(periodosMap).sort((a: any, b: any) => a.periodo.localeCompare(b.periodo));

        const CORES = [
            'oklch(0.62 0.19 260)',
            'oklch(0.68 0.16 180)',
            'oklch(0.72 0.15 140)',
            'oklch(0.65 0.19 45)',
            'oklch(0.52 0.18 320)'
        ];

        return (
            <div>
                <h4 style={{ fontSize: '13px', fontWeight: 600, color: '#71717a', marginBottom: '12px' }}>
                    Evolução das Faixas por Período
                </h4>
                <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        {faixas.map((f, i) => (
                            <Bar key={f} name={f} dataKey={f} stackId="a" fill={CORES[i % CORES.length]} />
                        ))}
                    </BarChart>
                </ResponsiveContainer>
            </div>
        );
    }
}
