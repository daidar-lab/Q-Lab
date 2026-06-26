import { useState, useMemo, type CSSProperties } from 'react';
import {
    LineChart, Line, BarChart, Bar,
    XAxis, YAxis, CartesianGrid, Tooltip,
    ReferenceLine, ResponsiveContainer, Cell,
} from 'recharts';

interface MouseClickInfo {
    codAmostra?: string;
    numeroDeControle?: string;
}

export interface HistogramaBinInfo {
    binInicio: number;
    binFim: number;
    frequencia: number;
}

interface Props {
    dados: Record<string, unknown>;
    onPontoClick?: (info: MouseClickInfo) => void;
    onHistogramaBinClick?: (info: HistogramaBinInfo) => void;
}

type Aba = 'serie' | 'histograma' | 'shewhart' | 'estatisticas';

// ── Normaliza data_resultado para string 'YYYY-MM-DD' ────────────────────────
// mysql2 pode retornar DATE como Date object ou string ISO dependendo do driver.
function normalizarData(raw: unknown): string {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    const s = String(raw);
    // ISO string como '2025-01-12T03:00:00.000Z' → pega só os 10 primeiros chars
    return s.slice(0, 10);
}

// ── Formata data_resultado conforme range em dias ─────────────────────────────
function formatarDataShewhart(dataRaw: unknown, horaRaw: unknown, diffDias: number): string {
    const dateStr = normalizarData(dataRaw);
    if (dateStr.length < 10) return '';
    const ano = dateStr.slice(0, 4);
    const mes = dateStr.slice(5, 7);
    const dia = dateStr.slice(8, 10);
    const hhmm = String(horaRaw ?? '').slice(0, 5);
    if (diffDias <= 7)  return `${dia}/${mes} ${hhmm}`.trim();
    if (diffDias <= 90) return `${dia}/${mes}`;
    return `${mes}/${ano}`;
}

export function NumericoChart({ dados, onPontoClick, onHistogramaBinClick }: Props) {
    const [aba, setAba] = useState<Aba>('serie');

    const serie = (dados.serie ?? []) as any[];
    const histograma = (dados.histograma ?? []) as any[];

    // shewhart agora é { pontos, limites } — backward-compat com array legado
    const shewhartRaw = dados.shewhart as any;
    const shewhart: any[] = Array.isArray(shewhartRaw)
        ? shewhartRaw
        : (shewhartRaw?.pontos ?? []);
    const shewhartLimites: { lm: number; lsc: number; lic: number; lse: number } | null =
        Array.isArray(shewhartRaw) ? null : (shewhartRaw?.limites ?? null);

    const estat = (dados.estatisticas as any[])?.[0] as any;

    const tabBar: CSSProperties = {
        display: 'flex', gap: '4px', marginBottom: '16px',
        overflowX: 'auto', paddingBottom: '4px',
    };
    const tab = (active: boolean): CSSProperties => ({
        padding: '6px 14px', borderRadius: '20px', fontSize: '13px',
        fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
        border: 'none',
        background: active ? '#18181b' : '#f4f4f5',
        color: active ? '#fff' : '#52525b',
    });

    const lie = serie[0]?.lie ?? estat?.lie;
    const lse = serie[0]?.lse ?? estat?.lse;

    const toSafeNum = (v: unknown) => {
        const n = Number(v);
        return !Number.isNaN(n) && isFinite(n) ? n : undefined;
    };
    const clampChartLimit = (value: unknown, min?: number, max?: number) => {
        const n = toSafeNum(value);
        if (n == null || min == null || max == null) return n;
        const span = Math.max(Math.abs(min), Math.abs(max));
        return Math.abs(n) <= span * 10 ? n : undefined;
    };

    // ── Y-axis domains ───────────────────────────────────────────────────────
    const medias = serie.map(s => Number(s.media)).filter(n => !Number.isNaN(n));
    const [serieMin, serieMax] = medias.length ? [Math.min(...medias), Math.max(...medias)] : [undefined, undefined] as const;
    const safeLie = clampChartLimit(lie, serieMin, serieMax);
    const safeLse = clampChartLimit(lse, serieMin, serieMax);
    const yAllVals = [...medias, safeLie, safeLse].filter((v): v is number => v != null);
    const yMinRaw = yAllVals.length ? Math.min(...yAllVals) : undefined;
    const yMaxRaw = yAllVals.length ? Math.max(...yAllVals) : undefined;
    const yPad = yMinRaw != null && yMaxRaw != null ? (yMaxRaw - yMinRaw) * 0.08 || 1 : 1;
    const yDomain: any = yMinRaw != null && yMaxRaw != null ? [yMinRaw - yPad, yMaxRaw + yPad] : undefined;

    // ── Shewhart: range em dias para formatar eixo X ─────────────────────────
    const shewhartDiffDias = useMemo(() => {
        if (shewhart.length < 2) return 0;
        const first = normalizarData(shewhart[0]?.data_resultado);
        const last  = normalizarData(shewhart[shewhart.length - 1]?.data_resultado);
        if (!first || !last) return 0;
        const t1 = Date.parse(first);
        const t2 = Date.parse(last);
        if (isNaN(t1) || isNaN(t2)) return 0;
        return Math.round(Math.abs(t2 - t1) / 86_400_000);
    }, [shewhart]);

    // Pontos enriquecidos com label de data formatada para o eixo X
    const shewhartData = useMemo(() =>
        shewhart.map(p => ({
            ...p,
            xLabel: formatarDataShewhart(p.data_resultado, p.hora_resultado ?? '', shewhartDiffDias),
        })),
        [shewhart, shewhartDiffDias],
    );

    const shewhartVals = shewhartData
        .map(s => toSafeNum(s.valor_num))
        .filter((n): n is number => n != null);
    const shMin = shewhartVals.length ? Math.min(...shewhartVals) : undefined;
    const shMax = shewhartVals.length ? Math.max(...shewhartVals) : undefined;

    // Domínio Y: usa apenas pontos + limites de controle (LM/LSC/LIC).
    // LSE é excluído pois pode conter valores sentinel do banco (ex: 999999).
    const safeLm = toSafeNum(shewhartLimites?.lm);
    const safeLsc = toSafeNum(shewhartLimites?.lsc);
    const safeLic = toSafeNum(shewhartLimites?.lic);
    const safeShewhartLse = toSafeNum(shewhartLimites?.lse);
    const shAllVals = [
        ...shewhartVals,
        safeLm,
        safeLsc,
        safeLic,
        safeShewhartLse != null && shMax != null && safeShewhartLse < shMax * 10 ? safeShewhartLse : undefined,
    ].filter((v): v is number => v != null);

    const shPad = shMin != null && shMax != null ? (shMax - shMin) * 0.10 || 0.5 : 0.5;
    const shewhartDomain: any = shAllVals.length
        ? [Math.min(...shAllVals) - shPad, Math.max(...shAllVals) + shPad]
        : undefined;

    // ── Custom dot para série temporal ────────────────────────────────────────
    const renderSerieDot = (props: any) => {
        const { cx, cy, index, payload } = props;
        if (cx == null || cy == null) return <g key={`sd-${index}`} />;
        return (
            <circle
                key={`serie-dot-${index}`}
                cx={cx}
                cy={cy}
                r={4}
                fill="oklch(0.62 0.19 260)"
                stroke="#fff"
                strokeWidth={1.5}
                style={{ cursor: onPontoClick && payload?.cod_amostra ? 'pointer' : 'default' }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!payload?.cod_amostra || !onPontoClick) return;
                    onPontoClick({
                        codAmostra: String(payload.cod_amostra),
                        numeroDeControle: payload.numero_de_controle ? String(payload.numero_de_controle) : undefined,
                    });
                }}
            />
        );
    };

    // Coloração baseada em fora_de_controle (flag do banco) — não conformidade
    const renderShewhartDot = (props: any) => {
        const { cx, cy, index, payload } = props;
        if (cx == null || cy == null) return <g key={`shd-${index}`} />;
        const foraDeControle = payload?.fora_de_controle === 1 || payload?.fora_de_controle === true;
        const color = foraDeControle ? '#ef4444' : 'oklch(0.62 0.19 260)';
        return (
            <circle
                key={`shewhart-dot-${index}`}
                cx={cx}
                cy={cy}
                r={5}
                fill={color}
                stroke="#fff"
                strokeWidth={1.5}
                style={{ cursor: onPontoClick && payload?.cod_amostra ? 'pointer' : 'default' }}
                onClick={(e) => {
                    e.stopPropagation();
                    if (!payload?.cod_amostra || !onPontoClick) return;
                    onPontoClick({
                        codAmostra: String(payload.cod_amostra),
                        numeroDeControle: payload.numero_de_controle ? String(payload.numero_de_controle) : undefined,
                    });
                }}
            />
        );
    };

    // ── Histograma: Bar onClick ───────────────────────────────────────────────
    const handleHistogramaBarClick = (barData: any) => {
        if (!onHistogramaBinClick || !barData) return;
        const ini = Number(barData.bin_inicio);
        const fim = Number(barData.bin_fim);
        if (isNaN(ini) || isNaN(fim)) return;
        onHistogramaBinClick({ binInicio: ini, binFim: fim, frequencia: Number(barData.frequencia) });
    };

    const hasSerieClick = !!onPontoClick;
    const hasHistClick = !!onHistogramaBinClick;

    return (
        <div>
            <div style={tabBar}>
                {(['serie', 'histograma', 'shewhart', 'estatisticas'] as Aba[]).map(a => (
                    <button key={a} style={tab(aba === a)} onClick={() => setAba(a)}>
                        {{ serie: 'Série', histograma: 'Histograma', shewhart: 'Shewhart', estatisticas: 'Estatísticas' }[a]}
                    </button>
                ))}
            </div>

            {/* ── Série temporal ── */}
            {aba === 'serie' && (
                <div>
                    {hasSerieClick && (
                        <p style={{ fontSize: '11px', color: '#71717a', marginBottom: '6px', textAlign: 'center' }}>
                            Clique em um ponto para ver o detalhe da amostra
                        </p>
                    )}
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={serie} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="periodo" tick={{ fontSize: 11 }} />
                            <YAxis tick={{ fontSize: 11 }} domain={yDomain} />
                            <Tooltip />
                            {lie && <ReferenceLine y={Number(lie)} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'LIE', fontSize: 10 }} />}
                            {lse && <ReferenceLine y={Number(lse)} stroke="#ef4444" strokeDasharray="4 4" label={{ value: 'LSE', fontSize: 10 }} />}
                            <Line
                                type="monotone"
                                dataKey="media"
                                stroke="oklch(0.62 0.19 260)"
                                strokeWidth={2}
                                dot={hasSerieClick ? renderSerieDot : { r: 3, fill: 'oklch(0.62 0.19 260)', strokeWidth: 0 }}
                                activeDot={hasSerieClick ? false : { r: 5 }}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Histograma ── */}
            {aba === 'histograma' && (
                <div>
                    {hasHistClick && (
                        <p style={{ fontSize: '11px', color: '#71717a', marginBottom: '6px', textAlign: 'center' }}>
                            Clique em uma barra para ver as amostras desse intervalo
                        </p>
                    )}
                    <ResponsiveContainer width="100%" height={260}>
                        <BarChart data={histograma} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis dataKey="bin_inicio" tick={{ fontSize: 11 }} tickFormatter={v => Number(v).toFixed(2)} />
                            <YAxis tick={{ fontSize: 11 }} />
                            <Tooltip
                                formatter={(v: any) => [v, 'Frequência']}
                                labelFormatter={v => `A partir de ${Number(v).toFixed(2)}`}
                            />
                            {lie && <ReferenceLine x={Number(lie)} stroke="#ef4444" strokeDasharray="4 4" />}
                            {lse && <ReferenceLine x={Number(lse)} stroke="#ef4444" strokeDasharray="4 4" />}
                            <Bar
                                dataKey="frequencia"
                                radius={[3, 3, 0, 0]}
                                onClick={hasHistClick ? handleHistogramaBarClick : undefined}
                                style={{ cursor: hasHistClick ? 'pointer' : 'default' }}
                                isAnimationActive={false}
                            >
                                {histograma.map((entry: any, idx: number) => {
                                    const binStart = Number(entry.bin_inicio);
                                    const binEnd = Number(entry.bin_fim);
                                    const inside = lie != null && lse != null
                                        && !Number.isNaN(binStart)
                                        && binStart >= Number(lie)
                                        && (!Number.isNaN(binEnd) ? binEnd <= Number(lse) || binStart <= Number(lse) : binStart <= Number(lse));
                                    return <Cell key={`cell-${idx}`} fill={inside ? '#16a34a' : '#ef4444'} />;
                                })}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Shewhart I-MR ── eixo X por data, limites LM/LSC/LIC calculados no banco ── */}
            {aba === 'shewhart' && (
                <div>
                    {hasSerieClick && (
                        <p style={{ fontSize: '11px', color: '#71717a', marginBottom: '6px', textAlign: 'center' }}>
                            Clique em um ponto para ver o detalhe da amostra
                        </p>
                    )}
                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={shewhartData} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                            <XAxis
                                dataKey="xLabel"
                                tick={{ fontSize: 10 }}
                                interval="preserveStartEnd"
                            />
                            <YAxis tick={{ fontSize: 11 }} domain={shewhartDomain} />
                            <Tooltip
                                labelFormatter={(_v, payload) => {
                                    const p = payload?.[0]?.payload;
                                    if (!p) return '';
                                    const data = normalizarData(p.data_resultado);
                                    const hora = String(p.hora_resultado ?? '').slice(0, 5);
                                    return `${data} ${hora}`.trim();
                                }}
                                formatter={(v: any, name: any) => [
                                    typeof v === 'number' ? v.toFixed(4) : v,
                                    name === 'valor_num' ? 'Valor' : name,
                                ]}
                            />
                            {/* LSE — limite de especificação (vermelho fino) */}
                            {shewhartLimites?.lse != null && (
                                <ReferenceLine
                                    y={Number(shewhartLimites.lse)}
                                    stroke="#ef4444"
                                    strokeDasharray="3 3"
                                    strokeWidth={1}
                                    label={{ value: 'LSE', fontSize: 10, fill: '#ef4444' }}
                                />
                            )}
                            {/* LIC — limite inferior de controle (laranja tracejado) */}
                            {shewhartLimites?.lic != null && (
                                <ReferenceLine
                                    y={Number(shewhartLimites.lic)}
                                    stroke="#f97316"
                                    strokeDasharray="6 3"
                                    strokeWidth={1.5}
                                    label={{ value: 'LIC', fontSize: 10, fill: '#f97316' }}
                                />
                            )}
                            {/* LSC — limite superior de controle (laranja tracejado) */}
                            {shewhartLimites?.lsc != null && (
                                <ReferenceLine
                                    y={Number(shewhartLimites.lsc)}
                                    stroke="#f97316"
                                    strokeDasharray="6 3"
                                    strokeWidth={1.5}
                                    label={{ value: 'LSC', fontSize: 10, fill: '#f97316' }}
                                />
                            )}
                            {/* LM — linha de média (cinza azulado sólido) */}
                            {shewhartLimites?.lm != null && (
                                <ReferenceLine
                                    y={Number(shewhartLimites.lm)}
                                    stroke="#64748b"
                                    strokeWidth={1.5}
                                    label={{ value: 'LM', fontSize: 10, fill: '#64748b' }}
                                />
                            )}
                            <Line
                                type="linear"
                                dataKey="valor_num"
                                stroke="oklch(0.62 0.19 260)"
                                strokeWidth={1.5}
                                dot={renderShewhartDot}
                                activeDot={false}
                                isAnimationActive={false}
                            />
                        </LineChart>
                    </ResponsiveContainer>

                    {/* Legenda numérica dos limites */}
                    {shewhartLimites && (
                        <div style={{
                            display: 'flex', gap: '16px', justifyContent: 'center',
                            fontSize: '11px', color: '#71717a', marginTop: '8px', flexWrap: 'wrap',
                        }}>
                            <span><span style={{ color: '#64748b', fontWeight: 700 }}>—</span> LM = {Number(shewhartLimites.lm).toFixed(4)}</span>
                            <span><span style={{ color: '#f97316', fontWeight: 700 }}>- -</span> LSC = {Number(shewhartLimites.lsc).toFixed(4)}</span>
                            <span><span style={{ color: '#f97316', fontWeight: 700 }}>- -</span> LIC = {Number(shewhartLimites.lic).toFixed(4)}</span>
                            {shewhartLimites.lse != null && (
                                <span><span style={{ color: '#ef4444', fontWeight: 700 }}>- -</span> LSE = {Number(shewhartLimites.lse).toFixed(4)}</span>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* ── Estatísticas ── */}
            {aba === 'estatisticas' && estat && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    {[
                        { label: 'N', value: estat.n },
                        { label: 'Média', value: Number(estat.media).toFixed(4) },
                        { label: 'Desvio', value: Number(estat.desvio).toFixed(4) },
                        { label: 'Mínimo', value: Number(estat.minimo).toFixed(4) },
                        { label: 'Máximo', value: Number(estat.maximo).toFixed(4) },
                        { label: 'LIE', value: estat.lie ?? '—' },
                        { label: 'LSE', value: estat.lse ?? '—' },
                        { label: 'Cp', value: estat.cp != null ? Number(estat.cp).toFixed(3) : '—' },
                        { label: 'Cpk', value: estat.cpk != null ? Number(estat.cpk).toFixed(3) : '—' },
                    ].map(({ label, value }) => (
                        <div key={label} style={{
                            background: '#f4f4f5', borderRadius: '8px',
                            padding: '12px', display: 'flex', flexDirection: 'column', gap: '4px',
                        }}>
                            <span style={{ fontSize: '11px', color: '#71717a', fontWeight: 500 }}>{label}</span>
                            <span style={{ fontSize: '18px', fontWeight: 700, color: '#18181b' }}>{value}</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}