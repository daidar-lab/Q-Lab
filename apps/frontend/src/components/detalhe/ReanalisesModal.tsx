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

export default function ReanalisesModal({ isOpen, onClose, tipo, id, titulo }: ReanalisesModalProps) {
    const { ctx, filialId } = useContexto();
    const dataInicio = ctx.dataInicio ?? '';
    const dataFim = ctx.dataFim ?? '';

    const [amostras, setAmostras] = useState<any[]>([]);
    const [carregando, setCarregando] = useState(false);
    
    // Filtros locais
    const [busca, setBusca] = useState('');
    const [statusFiltro, setStatusFiltro] = useState('TODOS'); // TODOS, CONFORME, NAO_CONFORME
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

    return (
        <>
            <div
                style={{
                    position: 'fixed',
                    inset: 0,
                    background: 'rgba(0,0,0,0.5)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    zIndex: 1000,
                    padding: '24px'
                }}
                onClick={onClose}
            >
                <div
                    style={{
                        background: 'var(--clr-surface, #ffffff)',
                        width: '100%',
                        maxWidth: '800px',
                        maxHeight: '90vh',
                        borderRadius: '12px',
                        display: 'flex',
                        flexDirection: 'column',
                        boxShadow: '0 10px 25px rgba(0,0,0,0.2)'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--clr-border, #eee)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <h3 style={{ margin: 0, fontSize: '18px', fontWeight: 600 }}>Reanálises - {titulo}</h3>
                        <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: 'var(--clr-text-2, #666)' }}>✕</button>
                    </div>

                    <div style={{ padding: '16px 24px', borderBottom: '1px solid var(--clr-border, #eee)', display: 'flex', gap: '16px', background: 'var(--clr-background, #f9f9f9)' }}>
                        <input 
                            type="text" 
                            placeholder="Buscar amostra, produto ou ensaio..." 
                            value={busca}
                            onChange={e => setBusca(e.target.value)}
                            style={{ flex: 1, padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--clr-border, #ccc)', fontSize: '14px' }}
                        />
                        <select 
                            value={statusFiltro}
                            onChange={e => setStatusFiltro(e.target.value)}
                            style={{ padding: '8px 12px', borderRadius: '6px', border: '1px solid var(--clr-border, #ccc)', fontSize: '14px', background: '#fff' }}
                        >
                            <option value="TODOS">Todos os Status</option>
                            <option value="CONFORME">Conforme</option>
                            <option value="NAO_CONFORME">Não Conforme</option>
                        </select>
                    </div>
                    
                    <div style={{ padding: '20px 24px', overflowY: 'auto', flex: 1 }}>
                        {carregando ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--clr-text-2, #666)' }}>Carregando amostras...</div>
                        ) : amostras.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--clr-text-2, #666)' }}>Nenhuma reanálise encontrada neste período.</div>
                        ) : (
                            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
                                <thead>
                                    <tr style={{ borderBottom: '2px solid var(--clr-border, #eee)', color: 'var(--clr-text-2, #666)', fontSize: '14px' }}>
                                        <th style={{ padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('cod_amostra')}>
                                            Amostra {renderSortIcon('cod_amostra')}
                                        </th>
                                        <th style={{ padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('data')}>
                                            Data / Hora {renderSortIcon('data')}
                                        </th>
                                        <th style={{ padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('produto')}>
                                            Produto {renderSortIcon('produto')}
                                        </th>
                                        <th style={{ padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('ensaio')}>
                                            Ensaio {renderSortIcon('ensaio')}
                                        </th>
                                        <th style={{ padding: '12px 8px', cursor: 'pointer', userSelect: 'none' }} onClick={() => handleSort('valor')}>
                                            Resultado {renderSortIcon('valor')}
                                        </th>
                                        <th style={{ padding: '12px 8px' }}>Status</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {amostrasOrdenadas.length === 0 ? (
                                        <tr>
                                            <td colSpan={6} style={{ textAlign: 'center', padding: '24px', color: 'var(--clr-text-2, #666)' }}>
                                                Nenhuma amostra corresponde aos filtros.
                                            </td>
                                        </tr>
                                    ) : (
                                        amostrasOrdenadas.map((a: any) => (
                                            <tr 
                                                key={`${a.cod_amostra}-${a.ensaio}`} 
                                                style={{ borderBottom: '1px solid var(--clr-border, #eee)', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                                onClick={() => setAmostraDetalheAberta({ codAmostra: String(a.cod_amostra) })}
                                                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--clr-background, #f4f4f5)'}
                                                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                                            >
                                                <td style={{ padding: '12px 8px', color: 'var(--clr-primary, #3b82f6)', fontWeight: 500 }}>#{a.cod_amostra}</td>
                                                <td style={{ padding: '12px 8px', fontSize: '14px' }}>{a.data_resultado} {a.hora_resultado?.slice(0, 5)}</td>
                                                <td style={{ padding: '12px 8px', fontSize: '14px' }}>{a.produto}</td>
                                                <td style={{ padding: '12px 8px', fontSize: '14px' }}>{a.ensaio}</td>
                                                <td style={{ padding: '12px 8px', fontSize: '14px', fontWeight: 600 }}>{a.valor}</td>
                                                <td style={{ padding: '12px 8px', fontSize: '12px' }}>
                                                    <span style={{ 
                                                        padding: '4px 8px', 
                                                        borderRadius: '12px', 
                                                        background: a.conformidade === 'CONFORME' ? 'var(--clr-success-light, #dcfce7)' : 'var(--clr-danger-light, #fee2e2)', 
                                                        color: a.conformidade === 'CONFORME' ? 'var(--clr-success, #166534)' : 'var(--clr-danger, #991b1b)',
                                                        fontWeight: 600
                                                    }}>
                                                        {a.conformidade === 'CONFORME' ? 'C' : 'NC'}
                                                    </span>
                                                </td>
                                            </tr>
                                        ))
                                    )}
                                </tbody>
                            </table>
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
