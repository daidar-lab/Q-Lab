import { useEffect, useState, type CSSProperties } from 'react';
import { detalheApi } from '../../services/detalhe.api';

interface AmostraEnsaioRow {
    cod_ensaio: string;
    ensaio: string;
    valor: string;
    lie: string | null;
    lse: string | null;
    conformidade: string;
    data_resultado: string;
    hora_resultado: string;
    laboratorio: string;
    equipamento: string;
    numero_de_controle: string;
    lote_de_controle_de_qualidade: string | null;
    destaque: number;
    is_reanalise: number;
}

interface Props {
    open: boolean;
    onClose: () => void;
    codAmostra: string | null;
    codEnsaioAtual?: string;
}

function parseBR(value?: string | number) {
    if (value === null || value === undefined) return null;
    if (typeof value === 'number') return value;

    const num = Number(value.replace(',', '.'));
    return isNaN(num) ? null : num;
}



export function AmostraDetalheDrawer({ open, onClose, codAmostra, codEnsaioAtual }: Props) {
    const [ensaios, setEnsaios] = useState<AmostraEnsaioRow[]>([]);
    const [carregando, setCarregando] = useState<boolean>(false);
    const [erro, setErro] = useState<string | null>(null);

    useEffect(() => {
        if (!open || !codAmostra) {
            setEnsaios([]);
            return;
        }

        let cancelado = false;
        async function fetchDetalhes() {
            setCarregando(true);
            setErro(null);
            try {
                const res = await detalheApi.getDetalheAmostra(codAmostra, codEnsaioAtual);
                if (!cancelado) {
                    setEnsaios(res || []);
                }
            } catch (err: any) {
                if (!cancelado) {
                    console.error('Erro ao buscar detalhes da amostra:', err);
                    setErro('Ocorreu um erro ao carregar os dados da amostra.');
                }
            } finally {
                if (!cancelado) {
                    setCarregando(false);
                }
            }
        }

        fetchDetalhes();

        return () => {
            cancelado = true;
        };
    }, [open, codAmostra, codEnsaioAtual]);

    const overlay: CSSProperties = {
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.4)',
        backdropFilter: 'blur(3px)',
        zIndex: 1200,
        display: open ? 'flex' : 'none',
        justifyContent: 'flex-end',
        transition: 'opacity 0.25s ease',
    };

    const drawer: CSSProperties = {
        width: 'min(520px, 100%)',
        height: '100%',
        background: 'var(--clr-surface, #ffffff)',
        padding: '28px 24px',
        boxSizing: 'border-box',
        overflowY: 'auto',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.15)',
        display: 'flex',
        flexDirection: 'column',
        gap: '20px',
    };

    return (
        <div
            style={overlay}
            onClick={e => {
                e.stopPropagation();
                if (e.target === e.currentTarget) {
                    onClose();
                }
            }}
        >
            <div style={drawer} onClick={e => e.stopPropagation()}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e4e4e7', paddingBottom: '16px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 700, color: 'var(--clr-text, #18181b)' }}>
                            Detalhes da Amostra
                        </h3>
                        {codAmostra && (
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                                <p style={{ margin: 0, color: 'var(--clr-text-2, #71717a)', fontSize: '13px', fontWeight: 500 }}>
                                    ID Amostra: #{codAmostra}
                                </p>
                                {ensaios.length > 0 && ensaios[0].is_reanalise === 1 && (
                                    <span style={{
                                        background: '#fef3c7',
                                        color: '#d97706',
                                        fontSize: '10px',
                                        fontWeight: 700,
                                        padding: '2px 6px',
                                        borderRadius: '4px',
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.05em'
                                    }}>
                                        Reanálise
                                    </span>
                                )}
                            </div>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '22px', cursor: 'pointer', color: '#71717a', padding: '4px', lineHeight: 1 }}
                        aria-label="Fechar"
                    >
                        ✕
                    </button>
                </div>

                {carregando && (
                    <div style={{ color: 'var(--clr-text-2, #71717a)', textAlign: 'center', padding: '60px 0', fontSize: '14px', fontWeight: 500 }}>
                        Carregando ensaios da amostra...
                    </div>
                )}

                {erro && (
                    <div style={{ color: '#dc2626', background: '#fef2f2', padding: '14px 16px', borderRadius: '10px', fontSize: '14px', border: '1px solid #fee2e2' }}>
                        {erro}
                    </div>
                )}

                {!carregando && !erro && ensaios.length === 0 && codAmostra && (
                    <p style={{ color: 'var(--clr-text-2, #71717a)', textAlign: 'center', padding: '60px 0', fontSize: '14px' }}>
                        Nenhum ensaio encontrado para esta amostra.
                    </p>
                )}

                {!carregando && !erro && ensaios.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', flex: 1 }}>

                        {/* Metadados gerais (pega do primeiro item) */}
                        {(() => {
                            const sample = ensaios[0];
                            return (
                                <div style={{
                                    background: 'var(--clr-background, #fafaf9)',
                                    border: '1px solid var(--clr-border, #e4e4e7)',
                                    borderRadius: '12px',
                                    padding: '16px',
                                    display: 'grid',
                                    gridTemplateColumns: '1fr 1fr',
                                    gap: '12px 16px',
                                    fontSize: '13px'
                                }}>
                                    <div>
                                        <span style={{ display: 'block', color: 'var(--clr-text-2, #71717a)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Data / Hora</span>
                                        <strong style={{ color: '#18181b' }}>{sample.data_resultado} {sample.hora_resultado.slice(0, 5)}</strong>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', color: 'var(--clr-text-2, #71717a)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Nº de Controle</span>
                                        <strong style={{ color: '#18181b' }}>{sample.numero_de_controle || '—'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', color: 'var(--clr-text-2, #71717a)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Laboratório</span>
                                        <strong style={{ color: '#18181b' }}>{sample.laboratorio || '—'}</strong>
                                    </div>
                                    <div>
                                        <span style={{ display: 'block', color: 'var(--clr-text-2, #71717a)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Equipamento</span>
                                        <strong style={{ color: '#18181b' }}>{sample.equipamento || '—'}</strong>
                                    </div>
                                    {sample.lote_de_controle_de_qualidade && (
                                        <div style={{ gridColumn: 'span 2' }}>
                                            <span style={{ display: 'block', color: 'var(--clr-text-2, #71717a)', fontWeight: 500, fontSize: '11px', textTransform: 'uppercase', marginBottom: '2px' }}>Lote QC</span>
                                            <strong style={{ color: '#18181b' }}>{sample.lote_de_controle_de_qualidade}</strong>
                                        </div>
                                    )}
                                </div>
                            );
                        })()}

                        {/* Título da Lista */}
                        <h4 style={{ margin: '10px 0 0 0', fontSize: '14px', fontWeight: 700, color: 'var(--clr-text, #18181b)' }}>
                            Ensaios Realizados ({ensaios.length})
                        </h4>

                        {/* Lista de Ensaios */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', paddingBottom: '20px' }}>
                            {ensaios.map((item, idx) => {
                                const isDestaque = item.destaque === 1;
                                const conforme = item.conformidade === 'CONFORME';

                                return (
                                    <div
                                        key={`${item.cod_ensaio}-${idx}`}
                                        style={{
                                            padding: '14px 16px',
                                            borderRadius: '12px',
                                            border: isDestaque
                                                ? '2px solid var(--clr-primary, #3b82f6)'
                                                : '1px solid var(--clr-border, #e4e4e7)',
                                            background: isDestaque
                                                ? 'rgba(59, 130, 246, 0.03)'
                                                : 'var(--clr-surface, #ffffff)',
                                            boxShadow: isDestaque ? '0 4px 12px rgba(59, 130, 246, 0.08)' : 'none',
                                            display: 'flex',
                                            flexDirection: 'column',
                                            gap: '10px',
                                            position: 'relative',
                                        }}
                                    >
                                        {isDestaque && (
                                            <span style={{
                                                position: 'absolute',
                                                top: '-10px',
                                                right: '16px',
                                                background: 'var(--clr-primary, #3b82f6)',
                                                color: '#fff',
                                                fontSize: '10px',
                                                fontWeight: 700,
                                                padding: '2px 8px',
                                                borderRadius: '10px',
                                                textTransform: 'uppercase',
                                                letterSpacing: '0.05em'
                                            }}>
                                                Filtro Ativo
                                            </span>
                                        )}

                                        {/* Cabeçalho do Ensaio */}
                                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                                            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--clr-text, #18181b)' }}>
                                                {item.ensaio}
                                            </span>
                                            <span style={{
                                                padding: '2px 8px',
                                                borderRadius: '999px',
                                                fontSize: '11px',
                                                fontWeight: 700,
                                                background: conforme ? '#dcfce7' : '#fee2e2',
                                                color: conforme ? '#15803d' : '#dc2626',
                                                textTransform: 'uppercase'
                                            }}>
                                                {item.conformidade}
                                            </span>
                                        </div>

                                        {/* Valores / Limites */}
                                        <div style={{ display: 'flex', gap: '20px', fontSize: '13px', color: 'var(--clr-text-2, #52525b)' }}>
                                            <div>
                                                <span>Valor: </span>
                                                <strong style={{ color: 'var(--clr-text, #18181b)', fontSize: '14px' }}>
                                                    {item.valor}
                                                </strong>
                                            </div>
                                            {(item.lie || item.lse) && (
                                                <div style={{ borderLeft: '1px solid #e4e4e7', paddingLeft: '20px' }}>
                                                    <span>Esp: </span>
                                                    {item.lie ? parseBR(item.lie)?.toFixed(2).replace('.', ',') : '—'}
                                                    {' '}a{' '}
                                                    {item.lse ? parseBR(item.lse)?.toFixed(2).replace('.', ',') : '—'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}