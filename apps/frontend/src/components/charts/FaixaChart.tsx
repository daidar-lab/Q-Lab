import { useState, type CSSProperties } from 'react';
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Cell,
} from 'recharts';

interface Props { dados: Record<string, unknown[]>; }

export function FaixaChart({ dados }: Props) {
    const [aba, setAba] = useState<'distribuicao' | 'serie'>('distribuicao');
    const distribuicao = (dados.distribuicao ?? []) as any[];
    const serie = (dados.serie ?? []) as any[];

    const tab = (active: boolean): CSSProperties => ({
        padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer', border: 'none',
        background: active ? '#18181b' : '#f4f4f5',
        color: active ? '#fff' : '#52525b',
    });

    const CORES = [
        'oklch(0.62 0.19 260)',
        'oklch(0.68 0.16 180)',
        'oklch(0.72 0.15 140)',
        'oklch(0.65 0.19 45)',
        'oklch(0.52 0.18 320)'
    ];

    return (
        <div>
            <div style={{ display: 'flex', gap: '4px', marginBottom: '16px' }}>
                <button style={tab(aba === 'distribuicao')} onClick={() => setAba('distribuicao')}>Distribuição</button>
                <button style={tab(aba === 'serie')} onClick={() => setAba('serie')}>Série</button>
            </div>

            {aba === 'distribuicao' && (
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart layout="vertical" data={distribuicao}
                        margin={{ top: 4, right: 40, left: 8, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis type="number" tick={{ fontSize: 11 }} />
                        <YAxis type="category" dataKey="faixa" tick={{ fontSize: 11 }} width={80} />
                        <Tooltip formatter={(v: any) => [v, 'Frequência']} />
                        <Bar dataKey="frequencia" radius={[0, 3, 3, 0]}>
                            {distribuicao.map((_, i) => (
                                <Cell key={i} fill={CORES[i % CORES.length]} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            )}

            {aba === 'serie' && (
                <ResponsiveContainer width="100%" height={260}>
                    <BarChart data={serie} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                        <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="n" fill="oklch(0.62 0.19 260)" radius={[3, 3, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            )}
        </div>
    );
}