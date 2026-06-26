import type { CSSProperties } from 'react';

interface Props {
    open: boolean;
    onClose: () => void;
    range: { inicio: number; fim: number } | null;
    amostras: unknown[] | null;
    carregando: boolean;
    erro: string | null;
    /** Chamado quando o usuário clica em "Ver" em uma amostra da lista */
    onVerAmostra: (codAmostra: string) => void;
}

export function BinAmostrasDrawer({ open, onClose, range, amostras, carregando, erro, onVerAmostra }: Props) {
    const overlay: CSSProperties = {
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.35)',
        zIndex: 110, display: open ? 'flex' : 'none', justifyContent: 'flex-end',
    };
    const drawer: CSSProperties = {
        width: 'min(480px, 100%)', height: '100%', background: '#fff',
        padding: '24px', boxSizing: 'border-box',
        overflowY: 'auto', boxShadow: '-8px 0 32px rgba(0,0,0,0.12)',
    };

    const lista = (amostras ?? []) as any[];

    return (
        <div style={overlay} onClick={e => e.target === e.currentTarget && onClose()}>
            <div style={drawer}>
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
                    <div>
                        <h3 style={{ margin: 0, fontSize: '17px', fontWeight: 700, color: '#18181b' }}>
                            Amostras no Intervalo
                        </h3>
                        {range && (
                            <p style={{ margin: '4px 0 0', color: '#71717a', fontSize: '13px' }}>
                                De {Number(range.inicio).toFixed(4)} até {Number(range.fim).toFixed(4)}
                            </p>
                        )}
                    </div>
                    <button
                        onClick={onClose}
                        style={{ border: 'none', background: 'transparent', fontSize: '20px', cursor: 'pointer', color: '#71717a', padding: '4px', marginLeft: '8px' }}
                    >
                        ✕
                    </button>
                </div>

                {carregando && (
                    <p style={{ color: '#71717a', textAlign: 'center', padding: '40px 0' }}>
                        Buscando amostras…
                    </p>
                )}

                {erro && (
                    <div style={{ color: '#dc2626', background: '#fef2f2', padding: '14px', borderRadius: '10px', fontSize: '14px' }}>
                        {erro}
                    </div>
                )}

                {!carregando && !erro && lista.length === 0 && (
                    <p style={{ color: '#71717a', textAlign: 'center', padding: '40px 0' }}>
                        Nenhuma amostra encontrada neste intervalo.
                    </p>
                )}

                {!carregando && !erro && lista.length > 0 && (
                    <div style={{ display: 'grid', gap: '10px' }}>
                        {/* Contador */}
                        <p style={{ margin: '0 0 4px', fontSize: '13px', color: '#52525b', fontWeight: 500 }}>
                            {lista.length} amostra(s) encontrada(s)
                        </p>

                        {lista.map((item: any, idx: number) => {
                            const conforme = item.conformidade === 'CONFORME';
                            return (
                                <div
                                    key={`${item.cod_amostra}-${idx}`}
                                    style={{
                                        padding: '14px 16px',
                                        borderRadius: '12px',
                                        border: '1px solid #e4e4e7',
                                        background: '#fafafa',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        gap: '12px',
                                    }}
                                >
                                    <div style={{ flex: 1, minWidth: 0 }}>
                                        {/* Linha 1: amostra + conformidade */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '6px' }}>
                                            <span style={{ fontSize: '13px', fontWeight: 700, color: '#18181b' }}>
                                                Amostra #{item.cod_amostra}
                                            </span>
                                            <span style={{
                                                padding: '2px 8px', borderRadius: '999px', fontSize: '11px', fontWeight: 600,
                                                background: conforme ? '#dcfce7' : '#fee2e2',
                                                color: conforme ? '#15803d' : '#dc2626',
                                            }}>
                                                {item.conformidade ?? '—'}
                                            </span>
                                        </div>
                                        {/* Linha 2: valor + data */}
                                        <div style={{ display: 'flex', gap: '16px', fontSize: '12px', color: '#52525b' }}>
                                            <span>Valor: <strong style={{ color: '#18181b' }}>{item.valor ?? '—'}</strong></span>
                                            <span>{item.data_resultado ?? '—'}</span>
                                            {item.numero_de_controle && (
                                                <span>NC: {item.numero_de_controle}</span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Botão Ver */}
                                    <button
                                        onClick={() => onVerAmostra(String(item.cod_amostra))}
                                        style={{
                                            padding: '7px 14px',
                                            borderRadius: '8px',
                                            background: '#18181b',
                                            color: '#fff',
                                            border: 'none',
                                            fontSize: '12px',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            flexShrink: 0,
                                        }}
                                    >
                                        Ver →
                                    </button>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}
