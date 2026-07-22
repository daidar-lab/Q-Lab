import { useState, useEffect } from 'react';
import { detalheApi } from '../../services/detalhe.api';
import { useContexto } from '../../contexts/ContextoProvider';
import { AmostraDetalheDrawer } from '../amostra/AmostraDetalheDrawer';

interface ReanalisesModalProps {
    isOpen: boolean;
    onClose: () => void;
    tipo: string;
    id: string | number;
    titulo: string;
}

const styles = `
.reanalises-modal-overlay {
    position: fixed;
    inset: 0;
    background: rgba(0,0,0,0.5);
    display: flex;
    align-items: flex-end;
    justify-content: center;
    z-index: 1000;
    padding: 0;
}

.reanalises-modal-box {
    background: var(--clr-surface, #ffffff);
    width: 100%;
    max-height: 92dvh;
    border-radius: 16px 16px 0 0;
    display: flex;
    flex-direction: column;
    box-shadow: 0 -4px 24px rgba(0,0,0,0.18);
    overflow: hidden;
}

.reanalises-modal-header {
    padding: 16px 16px 12px 16px;
    border-bottom: 1px solid var(--clr-border, #eee);
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-shrink: 0;
}

.reanalises-modal-title {
    margin: 0;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.3;
    padding-right: 8px;
}

.reanalises-modal-close {
    background: none;
    border: none;
    font-size: 20px;
    cursor: pointer;
    color: var(--clr-text-2, #666);
    flex-shrink: 0;
    line-height: 1;
    padding: 4px;
}

.reanalises-modal-filters {
    padding: 12px 16px;
    border-bottom: 1px solid var(--clr-border, #eee);
    display: flex;
    flex-direction: column;
    gap: 8px;
    background: var(--clr-background, #f9f9f9);
    flex-shrink: 0;
}

.reanalises-modal-filters input,
.reanalises-modal-filters select {
    width: 100%;
    box-sizing: border-box;
    padding: 9px 12px;
    border-radius: 8px;
    border: 1px solid var(--clr-border, #ccc);
    font-size: 14px;
    background: #fff;
    appearance: auto;
}

.reanalises-modal-body {
    padding: 12px 16px;
    overflow-y: auto;
    flex: 1;
    -webkit-overflow-scrolling: touch;
}

/* ── Cards (mobile) ── */
.reanalises-cards {
    display: flex;
    flex-direction: column;
    gap: 10px;
}

.reanalises-card {
    border: 1px solid var(--clr-border, #eee);
    border-radius: 10px;
    padding: 12px 14px;
    cursor: pointer;
    transition: background-color 0.15s;
}

.reanalises-card:active {
    background-color: var(--clr-background, #f4f4f5);
}

.reanalises-card-row {
    display: flex;
    justify-content: space-between;
    align-items: flex-start;
    gap: 8px;
    margin-bottom: 6px;
}

.reanalises-card-row:last-child {
    margin-bottom: 0;
}

.reanalises-card-amostra {
    color: var(--clr-primary, #e07b39);
    font-weight: 600;
    font-size: 14px;
}

.reanalises-card-badge {
    padding: 2px 8px;
    border-radius: 12px;
    font-size: 11px;
    font-weight: 700;
    flex-shrink: 0;
}

.reanalises-card-badge.conforme {
    background: var(--clr-success-light, #dcfce7);
    color: var(--clr-success, #166534);
}

.reanalises-card-badge.nao-conforme {
    background: var(--clr-danger-light, #fee2e2);
    color: var(--clr-danger, #991b1b);
}

.reanalises-card-meta {
    font-size: 12px;
    color: var(--clr-text-2, #666);
    display: flex;
    flex-wrap: wrap;
    gap: 4px 12px;
}

.reanalises-card-ensaio {
    font-size: 13px;
    font-weight: 500;
    color: var(--clr-text, #333);
}

.reanalises-card-valor {
    font-size: 13px;
    font-weight: 700;
    color: var(--clr-text, #333);
}

/* ── Sort bar (mobile) ── */
.reanalises-sort-bar {
    display: flex;
    gap: 6px;
    flex-wrap: wrap;
    margin-bottom: 10px;
}

.reanalises-sort-btn {
    background: var(--clr-background, #f4f4f5);
    border: 1px solid var(--clr-border, #ddd);
    border-radius: 6px;
    padding: 5px 10px;
    font-size: 12px;
    cursor: pointer;
    color: var(--clr-text-2, #555);
    display: flex;
    align-items: center;
    gap: 4px;
}

.reanalises-sort-btn.active {
    background: var(--clr-primary, #e07b39);
    color: #fff;
    border-color: var(--clr-primary, #e07b39);
}

/* ── Table (desktop ≥ 640px) ── */
.reanalises-table-wrapper {
    display: none;
}

@media (min-width: 640px) {
    .reanalises-modal-overlay {
        align-items: center;
        padding: 24px;
    }

    .reanalises-modal-box {
        max-width: 860px;
        max-height: 90vh;
        border-radius: 12px;
    }

    .reanalises-modal-header {
        padding: 20px 24px;
    }

    .reanalises-modal-title {
        font-size: 18px;
    }

    .reanalises-modal-filters {
        flex-direction: row;
        gap: 16px;
        padding: 16px 24px;
    }

    .reanalises-modal-filters input {
        flex: 1;
        width: auto;
    }

    .reanalises-modal-filters select {
        width: auto;
        flex-shrink: 0;
    }

    .reanalises-modal-body {
        padding: 20px 24px;
    }

    /* Show table, hide cards */
    .reanalises-cards,
    .reanalises-sort-bar {
        display: none;
    }

    .reanalises-table-wrapper {
        display: block;
        overflow-x: auto;
    }

    .reanalises-table {
        width: 100%;
        border-collapse: collapse;
        text-align: left;
    }

    .reanalises-table thead tr {
        border-bottom: 2px solid var(--clr-border, #eee);
        color: var(--clr-text-2, #666);
        font-size: 14px;
    }

    .reanalises-table th {
        padding: 12px 10px;
        cursor: pointer;
        user-select: none;
        white-space: nowrap;
    }

    .reanalises-table tbody tr {
        border-bottom: 1px solid var(--clr-border, #eee);
        cursor: pointer;
        transition: background-color 0.15s;
    }

    .reanalises-table tbody tr:hover {
        background-color: var(--clr-background, #f4f4f5);
    }

    .reanalises-table td {
        padding: 12px 10px;
        font-size: 14px;
    }
}
`;

export default function ReanalisesModal({ isOpen, onClose, tipo, id, titulo }: ReanalisesModalProps) {
    const { ctx, filialId } = useContexto();
    const dataInicio = ctx.dataInicio ?? '';
    const dataFim = ctx.dataFim ?? '';

    const [amostras, setAmostras] = useState<any[]>([]);
    const [carregando, setCarregando] = useState(false);

    // Filtros locais
    const [busca, setBusca] = useState('');
    const [statusFiltro, setStatusFiltro] = useState('TODOS');
    const [ordem, setOrdem] = useState<{ coluna: string; asc: boolean }>({ coluna: 'data', asc: false });

    // Amostra detalhe state
    const [amostraDetalheAberta, setAmostraDetalheAberta] = useState<{ codAmostra: string; codEnsaio?: string } | null>(null);

    // Amostras filtradas
    const amostrasFiltradas = amostras.filter(a => {
        if (statusFiltro === 'CONFORME' && a.conformidade !== 'CONFORME') return false;
        if (statusFiltro === 'NAO_CONFORME' && a.conformidade === 'CONFORME') return false;

        if (busca.trim()) {
            const termo = busca.toLowerCase();
            return String(a.cod_amostra).includes(termo) ||
                   a.produto?.toLowerCase().includes(termo) ||
                   a.ensaio?.toLowerCase().includes(termo);
        }
        return true;
    });

    // Amostras ordenadas
    const amostrasOrdenadas = [...amostrasFiltradas].sort((a, b) => {
        let valA = a[ordem.coluna];
        let valB = b[ordem.coluna];

        if (ordem.coluna === 'data') {
            valA = `${a.data_resultado} ${a.hora_resultado}`;
            valB = `${b.data_resultado} ${b.hora_resultado}`;
        } else if (ordem.coluna === 'valor') {
            valA = Number(String(a.valor).replace(',', '.'));
            valB = Number(String(b.valor).replace(',', '.'));
            if (isNaN(valA)) valA = String(a.valor);
            if (isNaN(valB)) valB = String(b.valor);
        }

        if (valA < valB) return ordem.asc ? -1 : 1;
        if (valA > valB) return ordem.asc ? 1 : -1;
        return 0;
    });

    const handleSort = (coluna: string) => {
        if (ordem.coluna === coluna) {
            setOrdem({ coluna, asc: !ordem.asc });
        } else {
            setOrdem({ coluna, asc: true });
        }
    };

    const renderSortIcon = (coluna: string) => {
        if (ordem.coluna !== coluna) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
        return <span style={{ marginLeft: '4px' }}>{ordem.asc ? '↑' : '↓'}</span>;
    };

    useEffect(() => {
        if (isOpen && filialId) {
            setCarregando(true);
            detalheApi.getReanalises(tipo, String(id), dataInicio, dataFim, filialId)
                .then(res => setAmostras(res || []))
                .catch(err => console.error('Erro ao buscar reanálises:', err))
                .finally(() => setCarregando(false));
        } else {
            setAmostras([]);
        }
    }, [isOpen, filialId, tipo, id, dataInicio, dataFim]);

    if (!isOpen) return null;

    const sortLabels: { coluna: string; label: string }[] = [
        { coluna: 'data', label: 'Data' },
        { coluna: 'cod_amostra', label: 'Amostra' },
        { coluna: 'produto', label: 'Produto' },
        { coluna: 'ensaio', label: 'Ensaio' },
        { coluna: 'valor', label: 'Resultado' },
    ];

    return (
        <>
            <style>{styles}</style>
            <div className="reanalises-modal-overlay" onClick={onClose}>
                <div className="reanalises-modal-box" onClick={e => e.stopPropagation()}>

                    {/* Header */}
                    <div className="reanalises-modal-header">
                        <h3 className="reanalises-modal-title">Reanálises - {titulo}</h3>
                        <button className="reanalises-modal-close" onClick={onClose}>✕</button>
                    </div>

                    {/* Filters */}
                    <div className="reanalises-modal-filters">
                        <input
                            type="text"
                            placeholder="Buscar amostra, produto ou ensaio..."
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                        />
                        <select value={statusFiltro} onChange={e => setStatusFiltro(e.target.value)}>
                            <option value="TODOS">Todos os Status</option>
                            <option value="CONFORME">Conforme</option>
                            <option value="NAO_CONFORME">Não Conforme</option>
                        </select>
                    </div>

                    {/* Body */}
                    <div className="reanalises-modal-body">
                        {carregando ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--clr-text-2, #666)' }}>
                                Carregando amostras...
                            </div>
                        ) : amostras.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--clr-text-2, #666)' }}>
                                Nenhuma reanálise encontrada neste período.
                            </div>
                        ) : (
                            <>
                                {/* ── Mobile: sort bar + cards ── */}
                                <div className="reanalises-sort-bar">
                                    {sortLabels.map(s => (
                                        <button
                                            key={s.coluna}
                                            className={`reanalises-sort-btn${ordem.coluna === s.coluna ? ' active' : ''}`}
                                            onClick={() => handleSort(s.coluna)}
                                        >
                                            {s.label}
                                            {ordem.coluna === s.coluna && (
                                                <span>{ordem.asc ? '↑' : '↓'}</span>
                                            )}
                                        </button>
                                    ))}
                                </div>

                                {amostrasOrdenadas.length === 0 ? (
                                    <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--clr-text-2, #666)', fontSize: '14px' }}>
                                        Nenhuma amostra corresponde aos filtros.
                                    </div>
                                ) : (
                                    <>
                                        {/* Cards (mobile) */}
                                        <div className="reanalises-cards">
                                            {amostrasOrdenadas.map((a: any) => (
                                                <div
                                                    key={`${a.cod_amostra}-${a.ensaio}`}
                                                    className="reanalises-card"
                                                    onClick={() => setAmostraDetalheAberta({ codAmostra: String(a.cod_amostra) })}
                                                >
                                                    <div className="reanalises-card-row">
                                                        <span className="reanalises-card-amostra">#{a.cod_amostra}</span>
                                                        <span className={`reanalises-card-badge ${a.conformidade === 'CONFORME' ? 'conforme' : 'nao-conforme'}`}>
                                                            {a.conformidade === 'CONFORME' ? 'Conforme' : 'Não Conforme'}
                                                        </span>
                                                    </div>
                                                    <div className="reanalises-card-row">
                                                        <span className="reanalises-card-ensaio">{a.ensaio}</span>
                                                        <span className="reanalises-card-valor">{a.valor}</span>
                                                    </div>
                                                    <div className="reanalises-card-meta">
                                                        <span>{a.data_resultado} {a.hora_resultado?.slice(0, 5)}</span>
                                                        <span>{a.produto}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>

                                        {/* Table (desktop) */}
                                        <div className="reanalises-table-wrapper">
                                            <table className="reanalises-table">
                                                <thead>
                                                    <tr>
                                                        <th onClick={() => handleSort('cod_amostra')}>Amostra {renderSortIcon('cod_amostra')}</th>
                                                        <th onClick={() => handleSort('data')}>Data / Hora {renderSortIcon('data')}</th>
                                                        <th onClick={() => handleSort('produto')}>Produto {renderSortIcon('produto')}</th>
                                                        <th onClick={() => handleSort('ensaio')}>Ensaio {renderSortIcon('ensaio')}</th>
                                                        <th onClick={() => handleSort('valor')}>Resultado {renderSortIcon('valor')}</th>
                                                        <th>Status</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {amostrasOrdenadas.map((a: any) => (
                                                        <tr
                                                            key={`${a.cod_amostra}-${a.ensaio}`}
                                                            onClick={() => setAmostraDetalheAberta({ codAmostra: String(a.cod_amostra) })}
                                                        >
                                                            <td style={{ color: 'var(--clr-primary, #e07b39)', fontWeight: 500 }}>#{a.cod_amostra}</td>
                                                            <td>{a.data_resultado} {a.hora_resultado?.slice(0, 5)}</td>
                                                            <td>{a.produto}</td>
                                                            <td>{a.ensaio}</td>
                                                            <td style={{ fontWeight: 600 }}>{a.valor}</td>
                                                            <td>
                                                                <span style={{
                                                                    padding: '4px 8px',
                                                                    borderRadius: '12px',
                                                                    background: a.conformidade === 'CONFORME' ? 'var(--clr-success-light, #dcfce7)' : 'var(--clr-danger-light, #fee2e2)',
                                                                    color: a.conformidade === 'CONFORME' ? 'var(--clr-success, #166534)' : 'var(--clr-danger, #991b1b)',
                                                                    fontWeight: 600,
                                                                    fontSize: '12px',
                                                                    whiteSpace: 'nowrap',
                                                                }}>
                                                                    {a.conformidade === 'CONFORME' ? 'C' : 'NC'}
                                                                </span>
                                                            </td>
                                                        </tr>
                                                    ))}
                                                </tbody>
                                            </table>
                                        </div>
                                    </>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            <AmostraDetalheDrawer
                open={!!amostraDetalheAberta}
                onClose={() => setAmostraDetalheAberta(null)}
                codAmostra={amostraDetalheAberta?.codAmostra || null}
            />
        </>
    );
}
