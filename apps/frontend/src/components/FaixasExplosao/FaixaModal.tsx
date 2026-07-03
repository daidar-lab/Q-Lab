import React, { useState, useEffect } from 'react';
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ReferenceLine,
    Legend,
} from 'recharts';
import { detalheApi } from '../../services/detalhe.api';
import { useContexto } from '../../contexts/ContextoProvider';
import FaixasContainer from './FaixasContainer';
import { AmostraDetalheDrawer } from '../amostra/AmostraDetalheDrawer';
import styles from './FaixaModal.module.css';

// ─── Types ───────────────────────────────────────────────────────────────────

interface FaixaModalProps {
    isOpen: boolean;
    onClose: () => void;
    id: string | number;
    codEnsaio: string;
    ensaioNome: string;
    dataInicio: string;
    dataFim: string;
}

interface SamplePoint {
    cod_produto: string;
    produto: string;
    cod_amostra?: string;
    numero_de_controle?: string;
    data_resultado: string | Date;
    hora_resultado: string;
    timestamp: string;
    valor: number;
    valor_original?: string;
    lie?: number;
    lse?: number;
}

// ─── Utilities (resgatadas do AmostraDetalheDrawer) ──────────────────────────

/**
 * Normaliza data_resultado para string 'YYYY-MM-DD'.
 * mysql2 pode retornar DATE como Date object ou string ISO dependendo do driver.
 */
function normalizarData(raw: unknown): string {
    if (!raw) return '';
    if (raw instanceof Date) return raw.toISOString().slice(0, 10);
    const s = String(raw);
    // ISO string como '2025-01-12T03:00:00.000Z' → pega só os 10 primeiros chars
    return s.slice(0, 10);
}

/**
 * Formata o label do eixo X de forma adaptativa ao range de datas — exatamente
 * como era feito no Shewhart antigo do AmostraDetalheDrawer.
 *
 * - diffDias <= 7  → "dd/mm hh:mm"
 * - diffDias <= 90 → "dd/mm"
 * - acima           → "mm/yyyy"
 */
function formatarDataShewhart(dataRaw: unknown, horaRaw: unknown, diffDias: number): string {
    const dateStr = normalizarData(dataRaw);
    if (dateStr.length < 10) return '';
    const ano = dateStr.slice(0, 4);
    const mes = dateStr.slice(5, 7);
    const dia = dateStr.slice(8, 10);
    const hhmm = String(horaRaw ?? '').slice(0, 5);
    if (diffDias <= 7) return `${dia}/${mes} ${hhmm}`.trim();
    if (diffDias <= 90) return `${dia}/${mes}`;
    return `${mes}/${ano}`;
}

/** Calcula diferença em dias entre duas strings YYYY-MM-DD */
function calcDiffDias(inicio: string, fim: string): number {
    const ms = new Date(fim).getTime() - new Date(inicio).getTime();
    return Math.max(1, Math.ceil(ms / (1000 * 60 * 60 * 24)));
}

/**
 * Extrai data e hora de um campo `timestamp` que pode ser:
 *   - string "YYYY-MM-DD HH:MM:SS"   (retorno do CONCAT no MySQL)
 *   - string ISO "YYYY-MM-DDTHH:MM:SS.000Z"
 */
function splitTimestamp(ts: string): { data: string; hora: string } {
    if (!ts) return { data: '', hora: '' };
    // ISO com T
    if (ts.includes('T')) {
        return { data: ts.slice(0, 10), hora: ts.slice(11, 19) };
    }
    const [data = '', hora = ''] = ts.split(' ');
    return { data, hora };
}

// ─── Colors ──────────────────────────────────────────────────────────────────

const COLORS = [
    '#3b82f6', // blue
    '#10b981', // emerald
    '#f59e0b', // amber
    '#8b5cf6', // violet
    '#ec4899', // pink
    '#06b6d4', // cyan
    '#f97316', // orange
];

const LIMIT_COLORS = [
    '#ef4444', // Red
    '#d97706', // Amber/Orange
    '#7c3aed', // Violet
    '#0891b2', // Cyan/Teal
    '#ec4899', // Pink
];

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

interface TooltipPayloadItem {
    dataKey: string;
    name: string;
    value: number;
    color: string;
    payload?: any;
}

interface CustomTooltipProps {
    active?: boolean;
    payload?: TooltipPayloadItem[];
    label?: string;
    diffDias: number;
    rawTimestampMap: Record<string, string>; // formattedTimestamp → rawTimestamp
}

function CustomTooltip({ active, payload, label, diffDias, rawTimestampMap }: CustomTooltipProps) {
    if (!active || !payload || payload.length === 0) return null;

    const rawTs = label ? rawTimestampMap[label] ?? label : '';
    const { data, hora } = splitTimestamp(rawTs);
    const dataFormatada = formatarDataShewhart(data, hora, diffDias);

    return (
        <div style={{
            background: 'var(--clr-surface, #ffffff)',
            border: '1px solid var(--clr-border, #e7e5e4)',
            borderRadius: '8px',
            padding: '10px 14px',
            fontSize: 13,
            color: 'var(--clr-text, #1c1917)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            minWidth: 180,
        }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12, color: 'var(--clr-text-2, #78716c)' }}>
                {dataFormatada} {diffDias <= 7 ? '' : `— ${hora.slice(0, 5)}`}
            </p>
            {payload.map((entry) => {
                const originalVal = entry.payload?.[`valor_original_${entry.dataKey}`];
                return (
                    <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginBottom: 4 }}>
                        <span style={{ color: entry.color, fontWeight: 600 }}>
                            {entry.name}
                        </span>
                        <span style={{ fontWeight: 700 }}>
                            {originalVal !== undefined ? originalVal : (typeof entry.value === 'number' ? entry.value.toFixed(4) : entry.value)}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export const FaixaModal: React.FC<FaixaModalProps> = ({
    isOpen,
    onClose,
    id,
    codEnsaio,
    ensaioNome,
    dataInicio,
    dataFim,
}) => {
    const { filialId } = useContexto();
    const [selectedSkus, setSelectedSkus] = useState<string[]>([]);
    const [activeFaixas, setActiveFaixas] = useState<{ lie: number; lse: number }[]>([]);
    const [samples, setSamples] = useState<SamplePoint[]>([]);
    const [loadingChart, setLoadingChart] = useState<boolean>(false);

    // Modo sem-faixa: ensaio de processo ou produto sem LIE/LSE
    const [modoSemFaixa, setModoSemFaixa] = useState<boolean>(false);

    // States para o detalhe da amostra (Drawer)
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [selectedCodAmostra, setSelectedCodAmostra] = useState<string | null>(null);

    // Diferença de dias entre o range filtrado — define o formato do label X
    const diffDias = calcDiffDias(dataInicio, dataFim);

    // Fetch: dispara sempre que SKUs selecionados ou faixas ativas mudam
    useEffect(() => {
        // Modo sem-faixa: não precisa de activeFaixas para buscar
        if (modoSemFaixa) {
            if (selectedSkus.length === 0) {
                setSamples([]);
                return;
            }
        } else {
            if (selectedSkus.length === 0 || activeFaixas.length === 0) {
                setSamples([]);
                return;
            }
        }

        let cancelled = false;

        const fetchHistory = async () => {
            setLoadingChart(true);
            try {
                let response: any[];

                if (modoSemFaixa) {
                    // Ensaio sem LIE/LSE: usa endpoint de conformidade
                    response = await detalheApi.getHistoricoProdutosSemFaixa(
                        id,
                        codEnsaio,
                        dataInicio,
                        dataFim,
                        selectedSkus,
                        filialId,
                    );
                } else {
                    // Ensaio com LIE/LSE: usa endpoint original sem especificar uma única faixa para carregar todas
                    response = await detalheApi.getHistoricoProdutosFaixa(
                        id,
                        codEnsaio,
                        undefined,
                        undefined,
                        dataInicio,
                        dataFim,
                        selectedSkus,
                        filialId,
                    );
                }

                if (cancelled) return;

                // Ordena cronologicamente pelo timestamp bruto
                const sorted = (response || []).sort((a: any, b: any) => {
                    const { data: da, hora: ha } = splitTimestamp(a.timestamp ?? '');
                    const { data: db, hora: hb } = splitTimestamp(b.timestamp ?? '');
                    return `${da} ${ha}`.localeCompare(`${db} ${hb}`);
                });

                setSamples(sorted);
            } catch (err) {
                console.error('Erro ao buscar histórico dos produtos:', err);
            } finally {
                if (!cancelled) setLoadingChart(false);
            }
        };

        fetchHistory();
        return () => { cancelled = true; };
    }, [id, codEnsaio, activeFaixas, selectedSkus, dataInicio, dataFim, modoSemFaixa]);

    // Reset ao abrir modal ou trocar ensaio
    useEffect(() => {
        if (isOpen) {
            setSelectedSkus([]);
            setActiveFaixas([]);
            setSamples([]);
            setModoSemFaixa(false);
            setDrawerOpen(false);
            setSelectedCodAmostra(null);
        }
    }, [isOpen, codEnsaio]);

    if (!isOpen) return null;

    // ── Mapa: cod_produto → nome do produto ──────────────────────────────────
    const productNames: Record<string, string> = {};
    samples.forEach(s => {
        productNames[s.cod_produto] = s.produto;
    });

    // ── Mapa: formattedTimestamp → rawTimestamp (para tooltip) ───────────────
    const rawTimestampMap: Record<string, string> = {};

    // ── Pivot: linha por timestamp único, colunas por SKU ────────────────────
    // Cada timestamp é formatado adaptativamente e servirá de dataKey do XAxis.
    const uniqueTimestamps = Array.from(new Set(samples.map(s => s.timestamp))).sort(
        (a, b) => {
            const { data: da, hora: ha } = splitTimestamp(a);
            const { data: db, hora: hb } = splitTimestamp(b);
            return `${da} ${ha}`.localeCompare(`${db} ${hb}`);
        }
    );

    const chartData = uniqueTimestamps.map(ts => {
        const { data, hora } = splitTimestamp(ts);
        const label = formatarDataShewhart(data, hora, diffDias);

        // Registra no mapa para o tooltip conseguir recuperar o timestamp bruto
        rawTimestampMap[label] = ts;

        const row: Record<string, unknown> = {
            _rawTs: ts,
            formattedTimestamp: label,
        };
        samples
            .filter(s => s.timestamp === ts)
            .forEach(s => {
                row[s.cod_produto] = Number(s.valor);
                row[`valor_original_${s.cod_produto}`] = s.valor_original || String(s.valor);
                if (s.cod_amostra) {
                    row[`cod_amostra_${s.cod_produto}`] = String(s.cod_amostra);
                }
                if (s.numero_de_controle) {
                    row[`numero_de_controle_${s.cod_produto}`] = String(s.numero_de_controle);
                }
            });
        return row;
    });

    // ── Domínio dinâmico do eixo Y ────────────────────────────────────────────
    let yDomain: [number, number] | undefined;
    if (modoSemFaixa) {
        // Conformidade: 0 = NC, 1 = CONFORME — pequeno padding
        yDomain = [-0.3, 1.3];
    } else if (activeFaixas.length > 0) {
        const lies = activeFaixas.map(f => Number(f.lie));
        const lses = activeFaixas.map(f => Number(f.lse));
        const minLimit = Math.min(...lies);
        const maxLimit = Math.max(...lses);
        const values = samples.map(s => Number(s.valor)).filter(v => !isNaN(v));
        if (values.length > 0) {
            const minVal = Math.min(...values, minLimit);
            const maxVal = Math.max(...values, maxLimit);
            const pad = (maxVal - minVal) * 0.12 || 1;
            yDomain = [+(minVal - pad).toFixed(4), +(maxVal + pad).toFixed(4)];
        } else {
            const diff = maxLimit - minLimit;
            const pad = diff * 0.2 || 1;
            yDomain = [+(minLimit - pad).toFixed(4), +(maxLimit + pad).toFixed(4)];
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className={styles.overlay} onClick={onClose}>
            <div className={styles.modal} onClick={e => e.stopPropagation()}>

                {/* Header */}
                <div className={styles.header}>
                    <div>
                        <h2 className={styles.headerTitle}>{ensaioNome}</h2>
                        <p className={styles.headerSubtitle}>Explosão de SKUs e histórico cronológico de amostras</p>
                    </div>
                    <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar modal">
                        &times;
                    </button>
                </div>

                <div className={styles.body}>

                    {/* Coluna Esquerda: Faixas + SKUs */}
                    <div className={styles.leftCol}>
                        <FaixasContainer
                            id={id}
                            codEnsaio={codEnsaio}
                            dataInicio={dataInicio}
                            dataFim={dataFim}
                            selectedSkus={selectedSkus}
                            onSelectedSkusChange={setSelectedSkus}
                            onActiveFaixasChange={setActiveFaixas}
                            onModoSemFaixaChange={setModoSemFaixa}
                        />
                    </div>

                    {/* Coluna Direita: Gráfico de série temporal por amostra */}
                    <div className={styles.rightCol}>
                        <div className={styles.chartContainer}>
                            <div className={styles.chartHeader}>
                                <h3 className={styles.chartTitle}>Histórico por Amostra Individual</h3>
                                <p className={styles.chartSubtitle}>
                                    {modoSemFaixa
                                        ? 'Conformidade por amostra (Conforme = 1 · Não Conforme = 0)'
                                        : activeFaixas.length > 0
                                            ? `Faixas ativas: ${activeFaixas.map(f => `LIE ${Number(f.lie).toLocaleString('pt-BR')} / LSE ${Number(f.lse).toLocaleString('pt-BR')}`).join('  ·  ')}`
                                            : 'Selecione uma faixa para ativar os limites de referência'}
                                </p>
                            </div>

                            {/* Estados do gráfico */}
                            {loadingChart ? (
                                <div className={styles.loadingChart}>
                                    <span>Carregando histórico de amostras...</span>
                                </div>

                            ) : selectedSkus.length === 0 ? (
                                <div className={styles.noData}>
                                    <span className={styles.noDataTitle}>Nenhum SKU selecionado</span>
                                    <span className={styles.noDataText}>
                                        {modoSemFaixa
                                            ? 'Selecione um ou mais produtos na lista ao lado para ver o histórico de conformidade.'
                                            : 'Expanda uma faixa ao lado e marque um ou mais SKUs para ver a série.'}
                                    </span>
                                </div>

                            ) : !modoSemFaixa && activeFaixas.length === 0 ? (
                                <div className={styles.noData}>
                                    <span className={styles.noDataTitle}>Nenhuma faixa ativa</span>
                                    <span className={styles.noDataText}>
                                        Clique no cabeçalho de uma faixa para ativá-la e carregar os dados.
                                    </span>
                                </div>

                            ) : samples.length === 0 ? (
                                <div className={styles.noData}>
                                    <span className={styles.noDataTitle}>Sem amostras nesta faixa</span>
                                    <span className={styles.noDataText}>
                                        Não há medições para os SKUs selecionados dentro deste intervalo de especificação.
                                    </span>
                                </div>

                            ) : (
                                <div className={styles.chartWrapper}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <LineChart
                                            data={chartData}
                                            margin={{ top: 20, right: 30, left: 20, bottom: diffDias <= 7 ? 80 : 40 }}
                                        >
                                            <CartesianGrid
                                                strokeDasharray="3 3"
                                                stroke="var(--clr-border, #E7E5E4)"
                                            />
                                            <XAxis
                                                dataKey="formattedTimestamp"
                                                tick={{ fontSize: 11, fill: 'var(--clr-text-2, #57534E)' }}
                                                angle={diffDias <= 7 ? -35 : 0}
                                                textAnchor={diffDias <= 7 ? 'end' : 'middle'}
                                                interval="preserveStartEnd"
                                            />
                                            <YAxis
                                                domain={yDomain}
                                                tick={{ fontSize: 11, fill: 'var(--clr-text-2, #57534E)' }}
                                                tickFormatter={(v: number) =>
                                                    modoSemFaixa
                                                        ? (v === 1 ? 'Conforme' : v === 0 ? 'NC' : '')
                                                        : v.toFixed(2)
                                                }
                                            />
                                            <Tooltip
                                                content={
                                                    <CustomTooltip
                                                        diffDias={diffDias}
                                                        rawTimestampMap={rawTimestampMap}
                                                    />
                                                }
                                            />
                                            <Legend
                                                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                                            />

                                             {/* Linhas de especificação LIE / LSE — apenas no modo com faixa */}
                                             {!modoSemFaixa && activeFaixas.map((limits, idx) => {
                                                 const color = LIMIT_COLORS[idx % LIMIT_COLORS.length];
                                                 return (
                                                     <React.Fragment key={`${limits.lie}_${limits.lse}`}>
                                                         <ReferenceLine
                                                             y={Number(limits.lie)}
                                                             stroke={color}
                                                             strokeDasharray="5 3"
                                                             strokeWidth={1.5}
                                                             label={{
                                                                 value: `LIE: ${Number(limits.lie)}`,
                                                                 position: 'insideBottomLeft',
                                                                 fill: color,
                                                                 fontSize: 10,
                                                                 fontWeight: 600,
                                                             }}
                                                         />
                                                         <ReferenceLine
                                                             y={Number(limits.lse)}
                                                             stroke={color}
                                                             strokeDasharray="5 3"
                                                             strokeWidth={1.5}
                                                             label={{
                                                                 value: `LSE: ${Number(limits.lse)}`,
                                                                 position: 'insideTopLeft',
                                                                 fill: color,
                                                                 fontSize: 10,
                                                                 fontWeight: 600,
                                                             }}
                                                         />
                                                     </React.Fragment>
                                                 );
                                             })}

                                            {/* Linha de referência de conformidade — apenas no modo sem faixa */}
                                            {modoSemFaixa && (
                                                <ReferenceLine
                                                    y={0.5}
                                                    stroke="#F59E0B"
                                                    strokeDasharray="4 3"
                                                    strokeWidth={1.5}
                                                    label={{
                                                        value: 'Limite',
                                                        position: 'insideRight',
                                                        fill: '#F59E0B',
                                                        fontSize: 10,
                                                        fontWeight: 600,
                                                    }}
                                                />
                                            )}

                                            {/* Uma linha por SKU selecionado */}
                                            {selectedSkus.map((sku, index) => (
                                                <Line
                                                    key={sku}
                                                    type="linear"
                                                    dataKey={sku}
                                                    name={productNames[sku] || sku}
                                                    stroke={COLORS[index % COLORS.length]}
                                                    strokeWidth={2}
                                                    dot={(dotProps: any) => {
                                                        const { cx, cy, index: dotIdx, payload } = dotProps;
                                                        if (cx == null || cy == null) return <g key={`dot-empty-${sku}-${dotIdx}`} />;
                                                        const codAmostra = payload[`cod_amostra_${sku}`];
                                                        const hasClick = !!codAmostra;
                                                        return (
                                                            <circle
                                                                key={`dot-${sku}-${dotIdx}`}
                                                                cx={cx}
                                                                cy={cy}
                                                                r={4}
                                                                fill={COLORS[index % COLORS.length]}
                                                                stroke="#fff"
                                                                strokeWidth={1.5}
                                                                style={{ cursor: hasClick ? 'pointer' : 'default' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    if (!hasClick) return;
                                                                    setSelectedCodAmostra(String(codAmostra));
                                                                    setDrawerOpen(true);
                                                                }}
                                                            />
                                                        );
                                                    }}
                                                    activeDot={false}
                                                    connectNulls={true}
                                                />
                                            ))}
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {/* Drawer de detalhamento da amostra ao clicar em um ponto do gráfico */}
            <AmostraDetalheDrawer
                open={drawerOpen}
                onClose={() => {
                    setDrawerOpen(false);
                    setSelectedCodAmostra(null);
                }}
                codAmostra={selectedCodAmostra}
                codEnsaioAtual={codEnsaio}
            />
        </div>
    );
};

export default FaixaModal;
