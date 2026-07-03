// apps/frontend/src/components/ui/FilialSelector.tsx

import { useEffect, useState, useRef, type CSSProperties } from 'react';
import { useContexto } from '../../contexts/ContextoProvider';
import { useFiliais } from '../../hooks/useFiliais';

export function FilialSelector() {
  const { filialId, filialLabel, setFilial } = useContexto();
  const { filiais, loading, error } = useFiliais();
  const [aberto, setAberto] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Efeito para auto-seleção se houver apenas 1 filial
  useEffect(() => {
    if (!loading && filiais.length === 1 && filialId !== filiais[0].cod_filial) {
      const f = filiais[0];
      setFilial(f.cod_filial, f.abreviatura || f.filial);
    }
  }, [filiais, loading, filialId, setFilial]);

  // Fecha o dropdown se clicar fora
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setAberto(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (loading) {
    return (
      <div style={containerStyle}>
        <span style={textStyle}>Carregando filiais...</span>
      </div>
    );
  }

  if (error) {
    return (
      <div style={containerStyle}>
        <span style={{ ...textStyle, color: '#f87171' }}>Erro filiais</span>
      </div>
    );
  }

  // Oculta se houver apenas 1 filial
  if (filiais.length <= 1) {
    return null;
  }

  const handleSelect = (cod_filial: number, label: string) => {
    setFilial(cod_filial, label);
    setAberto(false);
  };

  return (
    <div ref={containerRef} style={containerStyle}>
      <button 
        style={buttonStyle} 
        onClick={() => setAberto(!aberto)}
        title="Selecionar Filial"
      >
        <svg 
          width="16" 
          height="16" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ marginRight: '6px' }}
        >
          <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
          <circle cx="12" cy="10" r="3" />
        </svg>
        <span>{filialLabel || 'Selecione uma filial'}</span>
        <svg 
          width="14" 
          height="14" 
          viewBox="0 0 24 24" 
          fill="none" 
          stroke="currentColor" 
          strokeWidth="2" 
          strokeLinecap="round" 
          strokeLinejoin="round"
          style={{ 
            marginLeft: '8px',
            transform: aberto ? 'rotate(180deg)' : 'none',
            transition: 'transform 0.2s ease'
          }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {aberto && (
        <div style={dropdownStyle}>
          {filiais.map((f) => {
            const label = f.abreviatura || f.filial;
            const ativo = filialId === f.cod_filial;
            return (
              <div
                key={f.cod_filial}
                onClick={() => handleSelect(f.cod_filial, label)}
                style={{
                  ...itemStyle,
                  backgroundColor: ativo ? 'rgba(59, 130, 246, 0.15)' : 'transparent',
                  color: ativo ? '#60a5fa' : '#e2e8f0',
                  fontWeight: ativo ? '600' : 'normal',
                }}
              >
                {label}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Estilos Inline Estilo Q/Lab Premium (Aesthetics) ─────────────────────────

const containerStyle: CSSProperties = {
  position: 'relative',
  display: 'inline-block',
  zIndex: 1000,
};

const buttonStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  backgroundColor: '#1e293b',
  border: '1px solid #334155',
  color: '#f8fafc',
  padding: '8px 14px',
  borderRadius: '8px',
  cursor: 'pointer',
  fontSize: '14px',
  fontWeight: '500',
  outline: 'none',
  transition: 'all 0.15s ease',
  boxShadow: '0 1px 2px 0 rgba(0, 0, 0, 0.05)',
  userSelect: 'none',
};

const textStyle: CSSProperties = {
  fontSize: '13px',
  color: '#94a3b8',
  padding: '8px 12px',
};

const dropdownStyle: CSSProperties = {
  position: 'absolute',
  top: 'calc(100% + 6px)',
  left: '0',
  width: '220px',
  backgroundColor: '#0f172a',
  border: '1px solid #1e293b',
  borderRadius: '8px',
  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3), 0 4px 6px -2px rgba(0, 0, 0, 0.05)',
  padding: '4px',
  display: 'flex',
  flexDirection: 'column',
  gap: '2px',
};

const itemStyle: CSSProperties = {
  padding: '8px 12px',
  fontSize: '13.5px',
  borderRadius: '6px',
  cursor: 'pointer',
  transition: 'background-color 0.1s ease, color 0.1s ease',
  textAlign: 'left',
};
