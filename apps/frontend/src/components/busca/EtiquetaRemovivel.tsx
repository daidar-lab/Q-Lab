// apps/frontend/src/components/busca/EtiquetaRemovivel.tsx
//
// Tag com ícone por tipo e botão de remoção.
// Ao remover, reconstrói o `q` sem o label e navega.

import { useNavigate } from 'react-router-dom';
import type { Etiqueta } from '../../lib/search-parser';

const ICONE: Record<Etiqueta['tipo'], string> = {
  processo:    '⚙️',
  produto:     '📦',
  ensaio:      '🔬',
  periodo:     '📅',
  'tipo-produto': '🏷️',
  desconhecido: '❓',
};

const COR_BG: Record<Etiqueta['tipo'], string> = {
  processo:    '#FEF3C7',
  produto:     '#FFEDD5',
  ensaio:      '#DBEAFE',
  periodo:     '#F3F4F6',
  'tipo-produto': '#F3E8FF',
  desconhecido: '#FEE2E2',
};

const COR_TEXTO: Record<Etiqueta['tipo'], string> = {
  processo:    '#92400E',
  produto:     '#7C2D12',
  ensaio:      '#1E3A5F',
  periodo:     '#374151',
  'tipo-produto': '#6B21A8',
  desconhecido: '#991B1B',
};

interface EtiquetaRemovivelProps {
  etiqueta: Etiqueta;
  qAtual: string;
}

export function EtiquetaRemovivel({ etiqueta, qAtual }: EtiquetaRemovivelProps) {
  const navigate = useNavigate();

  function remover() {
    const textoRemover = etiqueta.rawText ?? etiqueta.label;
    const novoQ = qAtual
      .replace(textoRemover, '')
      .replace(/[,·]\s*[,·]/g, ',')
      .replace(/^[\s,·]+|[\s,·]+$/g, '')
      .trim();

    if (!novoQ) {
      navigate('/');
    } else {
      navigate(`/busca?q=${encodeURIComponent(novoQ)}`);
    }
  }

  const bg     = COR_BG[etiqueta.tipo];
  const cor    = COR_TEXTO[etiqueta.tipo];

  return (
    <span style={{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '5px',
      padding: '4px 8px 4px 10px',
      borderRadius: '20px',
      background: bg,
      color: cor,
      fontSize: '13px',
      fontWeight: 500,
      whiteSpace: 'nowrap',
    }}>
      <span style={{ fontSize: '12px' }}>{ICONE[etiqueta.tipo]}</span>
      {etiqueta.label}
      <button
        onClick={remover}
        aria-label={`Remover filtro ${etiqueta.label}`}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: '16px',
          height: '16px',
          border: 'none',
          background: 'rgba(0,0,0,0.1)',
          borderRadius: '50%',
          cursor: 'pointer',
          color: 'inherit',
          fontSize: '11px',
          lineHeight: 1,
          padding: 0,
          marginLeft: '2px',
          transition: 'background 0.1s',
        }}
        onMouseEnter={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.2)')}
        onMouseLeave={e => (e.currentTarget.style.background = 'rgba(0,0,0,0.1)')}
      >×</button>
    </span>
  );
}
