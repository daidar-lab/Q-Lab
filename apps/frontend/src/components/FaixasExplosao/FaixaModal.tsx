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
import { useExportPDF } from '../../hooks/useExport';
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
    operacao?: string;
    bem?: string;
    codProduto?: string;
    processoNome?: string;
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

// ─── Legenda: trunca nomes longos para nao empilhar no mobile ─────────────────
/**
 * Retorna no maximo `maxLen` caracteres + '…' se o nome for mais longo.
 * O tooltip do grafico continua mostrando o nome completo.
 */
function truncarNomeLegenda(nome: any, maxLen = 25): string {
    const nomeStr = String(nome || '');
    if (nomeStr.length <= maxLen) return nomeStr;
    return nomeStr.substring(0, maxLen) + '\u2026'; // U+2026 = …
}

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
    productNamesMap: Record<string, string>;  // cod_produto → nome completo
}

function CustomTooltip({ active, payload, label, diffDias, rawTimestampMap, productNamesMap }: CustomTooltipProps) {
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
            maxWidth: 260,
        }}>
            <p style={{ margin: '0 0 8px', fontWeight: 700, fontSize: 12, color: 'var(--clr-text-2, #78716c)' }}>
                {dataFormatada} {diffDias <= 7 ? '' : `— ${hora.slice(0, 5)}`}
            </p>
            {payload.map((entry) => {
                const originalVal = entry.payload?.[`valor_original_${entry.dataKey}`];
                // Usa nome completo no tooltip (sem truncagem)
                const nomeCompleto = productNamesMap[entry.dataKey] || entry.name;
                return (
                    <div key={entry.dataKey} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginBottom: 4 }}>
                        <span style={{ color: entry.color, fontWeight: 600, fontSize: 12, lineHeight: '1.3' }}>
                            {nomeCompleto}
                        </span>
                        <span style={{ fontWeight: 700, flexShrink: 0 }}>
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
    operacao,
    bem,
    codProduto,
    processoNome,
}) => {
    const { filialId, filialLabel } = useContexto();
    const [selectedSkus, setSelectedSkus] = useState<string[]>(codProduto ? [codProduto] : []);
    const [activeFaixas, setActiveFaixas] = useState<{ lie: number; lse: number }[]>([]);
    const [samples, setSamples] = useState<SamplePoint[]>([]);
    const [loadingChart, setLoadingChart] = useState<boolean>(false);

    // Modo sem-faixa: ensaio de processo ou produto sem LIE/LSE
    const [modoSemFaixa, setModoSemFaixa] = useState<boolean>(false);

    // Detecta mobile para adaptar estilos do gráfico
    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 640;

    // Snapshot para o modo mobile: só atualiza quando o usuário confirma
    const [committedSkus, setCommittedSkus] = useState<string[]>([]);
    const [committedFaixas, setCommittedFaixas] = useState<{ lie: number; lse: number }[]>([]);

    // States para o detalhe da amostra (Drawer)
    const [drawerOpen, setDrawerOpen] = useState<boolean>(false);
    const [selectedCodAmostra, setSelectedCodAmostra] = useState<string | null>(null);

    const isGraficoGerado = committedSkus.length > 0;

    const handleToggleGrafico = () => {
        if (isGraficoGerado) {
            setCommittedSkus([]);
            setCommittedFaixas([]);
        } else {
            setCommittedSkus([...selectedSkus]);
            setCommittedFaixas([...activeFaixas]);
        }
    };

    const { exportar, exportando } = useExportPDF('faixa');

    // Diferença de dias entre o range filtrado — define o formato do label X
    const diffDias = calcDiffDias(dataInicio, dataFim);

    // Fetch: dispara sempre que SKUs selecionados ou faixas ativas mudam
    useEffect(() => {
        const skusParaFetch = isMobile ? committedSkus : selectedSkus;
        const faixasParaFetch = isMobile ? committedFaixas : activeFaixas;

        // Modo sem-faixa: não precisa de faixasParaFetch para buscar
        if (modoSemFaixa) {
            if (skusParaFetch.length === 0) {
                setSamples([]);
                return;
            }
        } else {
            if (skusParaFetch.length === 0 || faixasParaFetch.length === 0) {
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
                        skusParaFetch,
                        filialId,
                        operacao,
                        bem
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
                        skusParaFetch,
                        filialId,
                        operacao,
                        bem
                    );
                }

                if (cancelled) return;

                // Ordena cronologicamente pelo timestamp bruto
                let sorted = (response || []).sort((a: any, b: any) => {
                    const { data: da, hora: ha } = splitTimestamp(a.timestamp ?? '');
                    const { data: db, hora: hb } = splitTimestamp(b.timestamp ?? '');
                    return `${da} ${ha}`.localeCompare(`${db} ${hb}`);
                });

                if (!modoSemFaixa && faixasParaFetch.length > 0) {
                    sorted = sorted.filter(sample => {
                        const sLie = Number(sample.lie);
                        const sLse = Number(sample.lse);
                        return faixasParaFetch.some(f => Number(f.lie) === sLie && Number(f.lse) === sLse);
                    });
                }

                setSamples(sorted);
            } catch (err) {
                console.error('Erro ao buscar histórico dos produtos:', err);
            } finally {
                if (!cancelled) setLoadingChart(false);
            }
        };

        fetchHistory();
        return () => { cancelled = true; };
    }, [id, codEnsaio, committedFaixas, committedSkus, activeFaixas, selectedSkus, dataInicio, dataFim, modoSemFaixa, operacao, isMobile]);

    // Reset ao abrir modal ou trocar ensaio
    useEffect(() => {
        if (isOpen) {
            setSelectedSkus(codProduto ? [codProduto] : []);
            setActiveFaixas([]);
            setCommittedSkus(codProduto ? [codProduto] : []);
            setCommittedFaixas([]);
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
                        <p className={styles.headerSubtitle}>
                            {operacao ? `${operacao} · ` : ''}Explosão de SKUs e histórico cronológico de amostras
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <button
                            onClick={() => exportar({
                                id,
                                codEnsaio,
                                ensaioNome,
                                lie: activeFaixas.length === 1 ? activeFaixas[0].lie : null,
                                lse: activeFaixas.length === 1 ? activeFaixas[0].lse : null,
                                codProdutos: selectedSkus,
                                filialId,
                                dataInicio,
                                dataFim,
                                filialNome: filialLabel || 'Filial Q/Lab',
                                processoNome: processoNome || (typeof id === 'string' && isNaN(Number(id)) ? id : 'Centro de Custo ' + id),
                                operacao,
                                bem
                            })}
                            disabled={exportando}
                            style={{
                                padding: '6px 12px', background: 'var(--clr-primary)', color: '#fff',
                                border: 'none', borderRadius: '4px', cursor: 'pointer',
                                fontWeight: 600, opacity: exportando ? 0.7 : 1, fontSize: '13px'
                            }}
                        >
                            {exportando ? 'Exportando...' : 'Exportar PDF'}
                        </button>
                        <button className={styles.closeBtn} onClick={onClose} aria-label="Fechar modal">
                            &times;
                        </button>
                    </div>
                </div>

                <div className={styles.body}>

                    {/* Coluna Esquerda: Faixas + SKUs */}
                    <div className={styles.leftCol}>
                        <FaixasContainer
                            id={id}
                            codEnsaio={codEnsaio}
                            dataInicio={dataInicio}
                            dataFim={dataFim}
                            operacao={operacao}
                            bem={bem}
                            codProduto={codProduto}
                            selectedSkus={selectedSkus}
                            onSelectedSkusChange={setSelectedSkus}
                            onActiveFaixasChange={setActiveFaixas}
                            onModoSemFaixaChange={setModoSemFaixa}
                        />

                        {/* Botão Gerar/Fechar Gráfico — apenas mobile */}
                        {isMobile && (
                            <div style={{ padding: '12px 0 4px' }}>
                                <button
                                    onClick={handleToggleGrafico}
                                    disabled={!isGraficoGerado && selectedSkus.length === 0}
                                    style={{
                                        width: '100%',
                                        padding: '12px',
                                        background: (!isGraficoGerado && selectedSkus.length === 0)
                                            ? 'var(--clr-border, #e7e5e4)'
                                            : isGraficoGerado
                                                ? 'var(--clr-text-2, #78716c)' // Cinza escuro para 'Fechar'
                                                : 'var(--clr-primary, #1c1917)', // Cor principal para 'Gerar'
                                        color: (!isGraficoGerado && selectedSkus.length === 0)
                                            ? 'var(--clr-text-2, #78716c)'
                                            : '#ffffff',
                                        border: 'none',
                                        borderRadius: '8px',
                                        fontWeight: 700,
                                        fontSize: '14px',
                                        cursor: (!isGraficoGerado && selectedSkus.length === 0) ? 'not-allowed' : 'pointer',
                                        transition: 'background 0.15s',
                                    }}
                                >
                                    {loadingChart
                                        ? 'Carregando...'
                                        : isGraficoGerado
                                            ? 'Fechar Gráfico'
                                            : `Gerar Gráfico (${selectedSkus.length} produto${selectedSkus.length !== 1 ? 's' : ''})`
                                    }
                                </button>
                            </div>
                        )}
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
                                <div className={isMobile ? styles.chartWrapperMobile : styles.chartWrapper}>
                                    {isMobile ? (
                                        /* Virtual landscape: container com scroll horizontal */
                                        <div className={styles.chartScrollOuter}>
                                            <div className={styles.chartScrollInner}>
                                                <LineChart
                                                    width={700}
                                                    height={260}
                                                    data={chartData}
                                                    margin={{ top: 16, right: 24, left: 16, bottom: diffDias <= 7 ? 60 : 30 }}
                                                >
                                                    <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border, #E7E5E4)" />
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
                                                                productNamesMap={productNames}
                                                            />
                                                        }
                                                    />
                                                    <Legend
                                                        wrapperStyle={
                                                            isMobile
                                                                ? { fontSize: 10, paddingTop: 4, lineHeight: '14px' }
                                                                : { fontSize: 12, paddingTop: 8 }
                                                        }
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
                                                            name={truncarNomeLegenda(productNames[sku] || sku, isMobile ? 18 : 25)}
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
                                            </div>
                                        </div>
                                    ) : (
                                        <ResponsiveContainer width="100%" height="100%">
                                            <LineChart
                                                data={chartData}
                                                margin={{ top: 20, right: 30, left: 20, bottom: diffDias <= 7 ? 80 : 40 }}
                                            >
                                                <CartesianGrid strokeDasharray="3 3" stroke="var(--clr-border, #E7E5E4)" />
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
                                                            productNamesMap={productNames}
                                                        />
                                                    }
                                                />
                                                <Legend
                                                    wrapperStyle={
                                                        isMobile
                                                            ? { fontSize: 10, paddingTop: 4, lineHeight: '14px' }
                                                            : { fontSize: 12, paddingTop: 8 }
                                                    }
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
                                                        name={truncarNomeLegenda(productNames[sku] || sku, isMobile ? 18 : 25)}
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
                                    )}
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
