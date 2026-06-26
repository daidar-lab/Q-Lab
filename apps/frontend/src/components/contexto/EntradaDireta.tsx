// apps/frontend/src/components/contexto/EntradaDireta.tsx
import { useState, useMemo, useEffect, type CSSProperties } from 'react';
import { useContexto } from '../../contexts/ContextoProvider';
import { useOpcoes } from '../../hooks/useOpcoes';
import { useOpcoesLocais } from '../../hooks/useOpcoesLocais';
import { Select } from '../ui/Select';
import { DateRange } from '../ui/DateRange';
import { Button } from '../ui/Button';
import { AutocompleteInput } from '../ui/AutocompleteInput';

interface Props { onAnalisar: () => void; }

const MODOS = ['individual', 'ranges', 'granularidade'] as const;
const MODO_LABEL: Record<string, string> = {
    individual: 'Individual',
    ranges: 'Comparar',
    granularidade: 'Evolução',
};

export function EntradaDireta({ onAnalisar }: Props) {
    const { ctx, set, reset, contextoOk, periodoOk, modoAnalyse, setModoAnalyse, periodo2, setPeriodo2, granularidade, setGranularidade } = useContexto();

    const { produtos: produtosLocal, ensaios: ensaiosLocal } = useOpcoesLocais({
        dataInicio: ctx.dataInicio,
        dataFim: ctx.dataFim,
    });

    const [termoProduto, setTermoProduto] = useState('');
    const [termoEnsaio, setTermoEnsaio]   = useState('');

    const produtosFiltrados = useMemo(() => {
        if (!termoProduto) return produtosLocal.dados;
        const lower = termoProduto.toLowerCase();
        return produtosLocal.dados.filter(p => p.label.toLowerCase().includes(lower));
    }, [produtosLocal.dados, termoProduto]);

    const ensaiosFiltrados = useMemo(() => {
        if (!termoEnsaio) return ensaiosLocal.dados;
        const lower = termoEnsaio.toLowerCase();
        return ensaiosLocal.dados.filter(e => e.label.toLowerCase().includes(lower));
    }, [ensaiosLocal.dados, termoEnsaio]);

    const { centros, bens, skipLotes } = useOpcoes({
        dataInicio: ctx.dataInicio,
        dataFim: ctx.dataFim,
        codProduto: ctx.codProduto,
        codCentroCusto: ctx.codCentroCusto,
    });

    const opcoesCentros = useMemo(() =>
        (centros.dados ?? []).map(c => ({ label: c.centroCusto, value: c.codCentroCusto })),
        [centros.dados]);

    const opcoesBens = useMemo(() =>
        (bens.dados ?? []).map(b => ({ label: b.bem, value: b.codBem })),
        [bens.dados]);

    const opcoesSkipLotes = useMemo(() =>
        (skipLotes.dados ?? []).map(s => ({ label: s.skipLote, value: s.codSkipLote })),
        [skipLotes.dados]);

    useEffect(() => {
        setTermoProduto('');
        setTermoEnsaio('');
    }, [ctx.dataInicio, ctx.dataFim]);

    const carregandoOpcoes = produtosLocal.carregando || ensaiosLocal.carregando;

    // ── Styles ────────────────────────────────────────────────────────────────
    const sectionStyle: CSSProperties = {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    };

    const clearBtnStyle: CSSProperties = {
        background: 'none',
        border: 'none',
        color: 'var(--clr-danger)',
        fontSize: '11px',
        fontWeight: 600,
        cursor: 'pointer',
        padding: '2px 4px',
        fontFamily: 'var(--font)',
    };

    const fieldLabelStyle: CSSProperties = {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--clr-text-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>

            {/* ── Tipo de Análise ─────────────────────────────────────────── */}
            <div style={sectionStyle}>
                <label style={fieldLabelStyle}>Tipo de Análise</label>
                <div style={{
                    display: 'flex',
                    gap: '3px',
                    background: 'var(--clr-surface-2)',
                    padding: '3px',
                    borderRadius: 'var(--r-lg)',
                    border: '1px solid var(--clr-border)',
                }}>
                    {MODOS.map(m => (
                        <button
                            key={m}
                            type="button"
                            onClick={() => setModoAnalyse(m)}
                            style={{
                                flex: 1,
                                padding: '7px 10px',
                                borderRadius: 'var(--r-md)',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer',
                                border: 'none',
                                fontFamily: 'var(--font)',
                                background: modoAnalyse === m ? 'var(--clr-surface)' : 'transparent',
                                color: modoAnalyse === m ? 'var(--clr-primary)' : 'var(--clr-text-3)',
                                boxShadow: modoAnalyse === m ? 'var(--shadow-sm)' : 'none',
                                transition: 'all var(--t-normal)',
                                letterSpacing: '-0.01em',
                            }}
                        >
                            {MODO_LABEL[m]}
                        </button>
                    ))}
                </div>
            </div>

            {/* ── Período ─────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <DateRange
                    label={modoAnalyse === 'ranges' ? 'Período 1' : 'Período'}
                    dataInicio={ctx.dataInicio ?? ''}
                    dataFim={ctx.dataFim ?? ''}
                    onChange={(campo, val) => set(campo, val)}
                />
                {ctx.dataInicio && ctx.dataFim && ctx.dataInicio > ctx.dataFim && (
                    <span style={{ color: 'var(--clr-danger, #ef4444)', fontSize: '12px', fontWeight: 500 }}>
                        A data de início do Período 1 não pode ser posterior à data de fim.
                    </span>
                )}
            </div>

            {modoAnalyse === 'ranges' && (
                <div style={{
                    display: 'flex', flexDirection: 'column', gap: '10px',
                    padding: '14px', background: 'var(--clr-surface-2)',
                    borderRadius: 'var(--r-lg)', border: '1.5px dashed var(--clr-border-strong)',
                }}>
                    <DateRange
                        label="Período 2 (Comparação)"
                        dataInicio={periodo2.inicio}
                        dataFim={periodo2.fim}
                        onChange={(campo, val) => setPeriodo2(prev => ({ ...prev, [campo === 'dataInicio' ? 'inicio' : 'fim']: val }))}
                    />
                    {periodo2.inicio && periodo2.fim && periodo2.inicio > periodo2.fim && (
                        <span style={{ color: 'var(--clr-danger, #ef4444)', fontSize: '12px', fontWeight: 500 }}>
                            A data de início do Período 2 não pode ser posterior à data de fim.
                        </span>
                    )}
                </div>
            )}

            {modoAnalyse === 'granularidade' && (
                <Select
                    label="Agrupar por"
                    value={granularidade}
                    opcoes={[
                        { label: 'Dia',       value: 'dia' },
                        { label: 'Semana',    value: 'semana' },
                        { label: 'Mês',       value: 'mes' },
                        { label: 'Trimestre', value: 'trimestre' },
                        { label: 'Ano',       value: 'ano' },
                    ]}
                    onChange={val => setGranularidade(val as any)}
                />
            )}

            {/* ── Produto ─────────────────────────────────────────────────── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={fieldLabelStyle}>Produto</label>
                    {ctx.codProduto && (
                        <button type="button" style={clearBtnStyle}
                            onClick={() => { set('codProduto', undefined); setTermoProduto(''); }}>
                            Limpar
                        </button>
                    )}
                </div>
                <AutocompleteInput
                    disabled={!periodoOk || carregandoOpcoes}
                    placeholder={
                        !periodoOk ? 'Defina o período primeiro'
                        : carregandoOpcoes ? 'Carregando opções…'
                        : 'Digite para filtrar…'
                    }
                    value={termoProduto}
                    opcoes={produtosFiltrados}
                    loading={produtosLocal.carregando}
                    onInputChange={setTermoProduto}
                    onSelect={p => { set('codProduto', p.value); setTermoProduto(p.label); }}
                />
            </div>

            {/* ── Centro de custo ─────────────────────────────────────────── */}
            <Select
                label="Centro de custo"
                disabled={!ctx.codProduto}
                loading={centros.carregando}
                value={ctx.codCentroCusto}
                opcoes={opcoesCentros}
                onChange={val => set('codCentroCusto', Number(val))}
                onClear={() => set('codCentroCusto', undefined)}
            />

            {/* ── Bem opcional ────────────────────────────────────────────── */}
            {!bens.dados?.length && !bens.carregando ? null : (
                <Select
                    label="Bem (opcional)"
                    loading={bens.carregando}
                    disabled={!ctx.codCentroCusto}
                    value={ctx.codBem}
                    placeholder="Todos os bens"
                    opcoes={opcoesBens}
                    onChange={val => set('codBem', val ? Number(val) : undefined)}
                    onClear={() => set('codBem', undefined)}
                />
            )}

            {/* ── Skip lote ───────────────────────────────────────────────── */}
            <Select
                label="Skip lote (opcional)"
                disabled={!ctx.codCentroCusto}
                loading={skipLotes.carregando}
                value={Array.isArray(ctx.codSkipLote) ? ctx.codSkipLote[0] : ctx.codSkipLote}
                placeholder="Todos"
                opcoes={opcoesSkipLotes}
                onChange={val => set('codSkipLote', val || undefined)}
                onClear={() => set('codSkipLote', undefined)}
            />

            {/* ── Ensaio ──────────────────────────────────────────────────── */}
            <div style={sectionStyle}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <label style={fieldLabelStyle}>Ensaio</label>
                    {ctx.codEnsaio && (
                        <button type="button" style={clearBtnStyle}
                            onClick={() => { set('codEnsaio', undefined); setTermoEnsaio(''); }}>
                            Limpar
                        </button>
                    )}
                </div>
                <AutocompleteInput
                    disabled={!periodoOk || carregandoOpcoes}
                    placeholder={
                        !periodoOk ? 'Defina o período primeiro'
                        : carregandoOpcoes ? 'Carregando opções…'
                        : 'Digite para filtrar…'
                    }
                    value={termoEnsaio}
                    opcoes={ensaiosFiltrados}
                    loading={ensaiosLocal.carregando}
                    onInputChange={setTermoEnsaio}
                    onSelect={e => { set('codEnsaio', e.value); setTermoEnsaio(e.label); }}
                />
            </div>

            {/* ── Ações ───────────────────────────────────────────────────── */}
            <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
                <Button disabled={!contextoOk} onClick={onAnalisar} style={{ flex: 2 }}>
                    Analisar
                </Button>
                <Button
                    variant="ghost"
                    style={{ flex: 1 }}
                    onClick={() => {
                        reset();
                        setTermoProduto('');
                        setTermoEnsaio('');
                    }}
                >
                    Limpar Tudo
                </Button>
            </div>
        </div>
    );
}