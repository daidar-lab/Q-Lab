import { useState, useMemo, useEffect } from 'react';
import type { SearchResultRow } from '../../services/busca.api';

interface TabelaResultadosProps {
  rows: SearchResultRow[];
}

const PAGE_SIZE = 20;

type SortKey = 'data_resultado' | 'produto' | 'ensaio' | 'lote_de_controle_de_qualidade' | 'valor' | 'conformidade';

export function TabelaResultados({ rows }: TabelaResultadosProps) {
  const [pagina, setPagina] = useState(1);
  const [buscaGeral, setBuscaGeral] = useState('');
  const [filtroProduto, setFiltroProduto] = useState('');
  const [filtroEnsaio, setFiltroEnsaio] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<'ALL' | 'OK' | 'NC'>('ALL');
  
  const [sortConfig, setSortConfig] = useState<{ key: SortKey | null, direction: 'asc' | 'desc' }>({ key: null, direction: 'asc' });

  // 1. Filtragem
  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      // Status
      const isNC = row.conformidade === 'NÃO CONFORME';
      if (filtroStatus === 'OK' && isNC) return false;
      if (filtroStatus === 'NC' && !isNC) return false;

      // Produto
      if (filtroProduto && !(row.produto || '').toLowerCase().includes(filtroProduto.toLowerCase())) return false;
      
      // Ensaio
      if (filtroEnsaio && !(row.ensaio || '').toLowerCase().includes(filtroEnsaio.toLowerCase())) return false;

      // Busca Geral
      if (buscaGeral) {
        const term = buscaGeral.toLowerCase();
        const rowText = `${row.produto || ''} ${row.ensaio || ''} ${row.lote_de_controle_de_qualidade || ''} ${row.valor || ''} ${row.operacao || ''}`.toLowerCase();
        if (!rowText.includes(term)) return false;
      }

      return true;
    });
  }, [rows, buscaGeral, filtroProduto, filtroEnsaio, filtroStatus]);

  // 2. Ordenação
  const sortedRows = useMemo(() => {
    const sortableItems = [...filteredRows];
    if (sortConfig.key !== null) {
      sortableItems.sort((a, b) => {
        let aValue: any = a[sortConfig.key!];
        let bValue: any = b[sortConfig.key!];

        // Se for valor numérico, tentar converter
        if (sortConfig.key === 'valor') {
          aValue = parseFloat(aValue.toString().replace(',', '.')) || 0;
          bValue = parseFloat(bValue.toString().replace(',', '.')) || 0;
        }

        if (aValue < bValue) {
          return sortConfig.direction === 'asc' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'asc' ? 1 : -1;
        }
        return 0;
      });
    }
    return sortableItems;
  }, [filteredRows, sortConfig]);

  // 3. Paginação
  const totalPaginas = Math.ceil(sortedRows.length / PAGE_SIZE) || 1;
  
  // Reseta para a página 1 sempre que os filtros mudarem a quantidade de resultados
  useEffect(() => {
    setPagina(1);
  }, [filteredRows.length]);
  
  const inicio = (pagina - 1) * PAGE_SIZE;
  const fatia  = sortedRows.slice(inicio, inicio + PAGE_SIZE);

  if (rows.length === 0) return null;

  const handleSort = (key: SortKey) => {
    let direction: 'asc' | 'desc' = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const thStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '11px',
    fontWeight: 700,
    color: 'var(--clr-text-3)',
    textTransform: 'uppercase',
    letterSpacing: '0.06em',
    textAlign: 'left',
    background: 'var(--clr-surface-2)',
    borderBottom: '1px solid var(--clr-border)',
    whiteSpace: 'nowrap',
    cursor: 'pointer',
    userSelect: 'none',
    minWidth: '120px', // Garante tamanho mínimo para as colunas não esmagarem
  };

  const tdStyle: React.CSSProperties = {
    padding: '12px 16px',
    fontSize: '13px',
    color: 'var(--clr-text)',
    borderBottom: '1px solid var(--clr-border)',
    whiteSpace: 'nowrap',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
  };

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '6px 8px',
    fontSize: '11px',
    border: '1px solid var(--clr-border)',
    borderRadius: '4px',
    background: 'var(--clr-surface)',
    color: 'var(--clr-text)',
    marginTop: '4px',
    fontWeight: 'normal',
    textTransform: 'none',
    boxSizing: 'border-box',
  };

  const renderSortIndicator = (key: SortKey) => {
    if (sortConfig.key !== key) return <span style={{ opacity: 0.3, marginLeft: '4px' }}>↕</span>;
    return <span style={{ marginLeft: '4px' }}>{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>;
  };

  return (
    <div style={{
      background: 'var(--clr-surface)',
      border: '1px solid var(--clr-border)',
      borderRadius: 'var(--r-lg)',
      overflow: 'hidden',
      marginBottom: '32px',
    }}>
      <div style={{
        padding: '16px 20px',
        borderBottom: '1px solid var(--clr-border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '16px'
      }}>
        <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 700, color: 'var(--clr-text)' }}>
          Amostras
        </h3>
        
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: '12px',
          flexWrap: 'wrap',
          width: '100%',
          justifyContent: 'flex-start',
          flex: 1
        }}>
          <input
            type="text"
            placeholder="Buscar em todos os campos..."
            value={buscaGeral}
            onChange={e => setBuscaGeral(e.target.value)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--clr-surface-2)',
              color: 'var(--clr-text)',
              flex: '1 1 200px',
              minWidth: '180px',
              maxWidth: '350px'
            }}
          />
          
          <select 
            value={filtroStatus}
            onChange={e => setFiltroStatus(e.target.value as any)}
            style={{
              padding: '8px 12px',
              fontSize: '13px',
              border: '1px solid var(--clr-border)',
              borderRadius: 'var(--r-md)',
              background: 'var(--clr-surface-2)',
              color: 'var(--clr-text)',
              cursor: 'pointer'
            }}
          >
            <option value="ALL">Status: Todos</option>
            <option value="OK">Conformes</option>
            <option value="NC">Não Conformes</option>
          </select>
          
          <div style={{ flex: 1 }}></div>

          <span style={{ fontSize: '12px', color: 'var(--clr-text-3)', whiteSpace: 'nowrap' }}>
            {sortedRows.length.toLocaleString('pt-BR')} resultados
            {rows.length >= 5000 && ' (limitado)'}
          </span>
        </div>
      </div>

      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '750px' }}>
          <thead>
            <tr>
              <th style={{ ...thStyle, minWidth: '90px' }} onClick={() => handleSort('data_resultado')}>
                Data {renderSortIndicator('data_resultado')}
              </th>
              <th style={{ ...thStyle, minWidth: '220px' }}>
                <div onClick={() => handleSort('produto')}>Produto {renderSortIndicator('produto')}</div>
                <input 
                  type="text" 
                  placeholder="Filtrar produto..." 
                  value={filtroProduto}
                  onChange={e => setFiltroProduto(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={inputStyle}
                />
              </th>
              <th style={{ ...thStyle, minWidth: '150px' }}>
                <div onClick={() => handleSort('ensaio')}>Ensaio {renderSortIndicator('ensaio')}</div>
                <input 
                  type="text" 
                  placeholder="Filtrar ensaio..." 
                  value={filtroEnsaio}
                  onChange={e => setFiltroEnsaio(e.target.value)}
                  onClick={e => e.stopPropagation()}
                  style={inputStyle}
                />
              </th>
              <th style={{ ...thStyle, minWidth: '130px' }} onClick={() => handleSort('lote_de_controle_de_qualidade')}>
                Lote QC {renderSortIndicator('lote_de_controle_de_qualidade')}
              </th>
              <th style={{ ...thStyle, minWidth: '90px' }} onClick={() => handleSort('valor')}>
                Valor {renderSortIndicator('valor')}
              </th>
            </tr>
          </thead>
          <tbody>
            {fatia.map((row, i) => {
              const isNC = row.conformidade === 'NÃO CONFORME';
              return (
                <tr
                  key={`${row.cod_amostra}-${row.cod_ensaio}-${i}`}
                  style={{ 
                    transition: 'background 0.1s',
                    background: isNC ? 'var(--clr-danger-bg)' : 'transparent'
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = isNC ? 'rgba(220, 38, 38, 0.15)' : 'var(--clr-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = isNC ? 'var(--clr-danger-bg)' : 'transparent')}
                >
                  <td style={tdStyle}>
                    {row.data_resultado.split(' ')[0].split('-').reverse().join('/')}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--clr-text-2)', maxWidth: '280px' }}>
                    <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {(row.produto || '').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())}
                    </div>
                    {row.operacao && (
                      <div style={{ fontSize: '11px', color: 'var(--clr-text-3)', marginTop: '2px', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {row.operacao}
                      </div>
                    )}
                  </td>
                  <td style={{ ...tdStyle, color: 'var(--clr-text-2)' }}>{row.ensaio}</td>
                  <td style={{ ...tdStyle, color: 'var(--clr-text-3)', fontFamily: 'monospace', fontSize: '12px' }}>
                    {row.lote_de_controle_de_qualidade}
                  </td>
                  <td style={{ ...tdStyle, fontWeight: 600, color: isNC ? 'var(--clr-danger)' : 'inherit' }}>{row.valor}</td>
                </tr>
              );
            })}
            {fatia.length === 0 && (
              <tr>
                <td colSpan={5} style={{ padding: '24px', textAlign: 'center', color: 'var(--clr-text-3)', fontSize: '13px' }}>
                  Nenhum resultado encontrado com os filtros atuais.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      {totalPaginas > 1 && (
        <div style={{
          padding: '12px 20px',
          borderTop: '1px solid var(--clr-border)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: '8px',
          flexWrap: 'wrap'
        }}>
          <span style={{ fontSize: '12px', color: 'var(--clr-text-3)' }}>
            Página {pagina} de {totalPaginas}
          </span>
          <div style={{ display: 'flex', gap: '6px' }}>
            <button
              onClick={() => setPagina(p => Math.max(1, p - 1))}
              disabled={pagina === 1}
              style={{
                padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--r-md)',
                background: pagina === 1 ? 'var(--clr-surface-2)' : 'var(--clr-surface)',
                color: pagina === 1 ? 'var(--clr-text-3)' : 'var(--clr-text)',
                cursor: pagina === 1 ? 'default' : 'pointer',
              }}
            >← Anterior</button>
            <button
              onClick={() => setPagina(p => Math.min(totalPaginas, p + 1))}
              disabled={pagina === totalPaginas}
              style={{
                padding: '4px 12px', fontSize: '12px', fontWeight: 600,
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--r-md)',
                background: pagina === totalPaginas ? 'var(--clr-surface-2)' : 'var(--clr-surface)',
                color: pagina === totalPaginas ? 'var(--clr-text-3)' : 'var(--clr-text)',
                cursor: pagina === totalPaginas ? 'default' : 'pointer',
              }}
            >Próxima →</button>
          </div>
        </div>
      )}
    </div>
  );
}
