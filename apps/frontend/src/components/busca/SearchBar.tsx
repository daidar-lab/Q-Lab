// apps/frontend/src/components/busca/SearchBar.tsx
//
// Campo de busca com dropdown de sugestões agrupadas por tipo.
// Design: full-width, borda âmbar no foco, badges de tipo nas sugestões.
// Comportamento: clicar em sugestão APPENDA ao input (permite combinações progressivas).

import { useRef, useState, useCallback, useEffect, type KeyboardEvent } from 'react';
import { useSearch } from '../../hooks/useSearch';
import type { Catalogo } from '../../services/busca.api';
import type { Sugestao } from '../../lib/search-parser';

interface SearchBarProps {
  catalogo: Catalogo | null;
  loading?: boolean;
  initialValue?: string;
  /** Chamado com o valor final ao submeter (Enter / botão). Se não passado, navega para /busca. */
  onSubmit?: (valor: string) => void;
  placeholder?: string;
}

const TIPO_CONFIG: Record<Sugestao['tipo'], { badge: string; cor: string; bg: string }> = {
  processo: { badge: 'PROCESSO', cor: '#92400E', bg: '#FEF3C7' },
  produto: { badge: 'PRODUTO', cor: '#7C2D12', bg: '#FFEDD5' },
  ensaio: { badge: 'ENSAIO', cor: '#1E3A5F', bg: '#DBEAFE' },
};

export function SearchBar({ catalogo, loading, initialValue = '', onSubmit, placeholder }: SearchBarProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [aberto, setAberto] = useState(false);
  const [focado, setFocado] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const { inputValue, setInputValue, sugestoes, submitBusca, limparSugestoes } = useSearch(catalogo);

  // Inicializa com o valor da URL — apenas uma vez após a montagem
  const [inicializado, setInicializado] = useState(false);
  useEffect(() => {
    if (!inicializado && initialValue) {
      setInputValue(initialValue);
      setInicializado(true);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialValue]);

  const handleSubmit = useCallback(() => {
    setAberto(false);
    limparSugestoes();
    if (onSubmit) onSubmit(inputValue);
    else submitBusca(inputValue);
  }, [inputValue, onSubmit, submitBusca, limparSugestoes]);

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') { e.preventDefault(); handleSubmit(); }
    if (e.key === 'Escape') { setAberto(false); limparSugestoes(); }
  }

  function handleSugestaoClick(s: Sugestao) {
    // Appenda o termo ao input após a última vírgula
    const partes = inputValue.trimEnd().split(/[,·]/);
    partes[partes.length - 1] = ' ' + s.label;
    const novoInput = partes.join(',');
    setInputValue(novoInput);
    inputRef.current?.focus();
    // Mantém dropdown aberto para combinações progressivas
  }

  const mostrarCarregando = aberto && focado && !!loading && inputValue.trim().length > 1;
  const mostrarDropdown = aberto && focado && (sugestoes.length > 0 || mostrarCarregando);

  return (
    <div
      ref={wrapperRef}
      style={{ position: 'relative', width: '100%' }}
    >
      {/* ── Campo ─────────────────────────────────────────────────────────── */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '10px',
        padding: '0 16px',
        height: '48px',
        background: 'var(--clr-surface)',
        border: `1.5px solid ${focado ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
        borderRadius: mostrarDropdown ? '10px 10px 0 0' : '10px',
        boxShadow: focado ? '0 0 0 3px var(--clr-primary-ring)' : '0 1px 3px rgba(0,0,0,0.06)',
        transition: 'border-color 0.15s, box-shadow 0.15s',
      }}>
        {/* Ícone lupa */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--clr-text-3)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>

        <input
          ref={inputRef}
          id="search-bar-input"
          type="text"
          value={inputValue}
          onChange={e => { setInputValue(e.target.value); setAberto(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => { setFocado(true); setAberto(true); }}
          onBlur={() => {
            // Delay para permitir clique nas sugestões antes de fechar
            setTimeout(() => { setFocado(false); setAberto(false); }, 150);
          }}
          placeholder={placeholder ?? 'Buscar — Ex: Pilsen · pH · últimos 6 meses'}
          aria-label="Campo de busca"
          aria-autocomplete="list"
          aria-expanded={mostrarDropdown}
          aria-controls="search-suggestions-list"
          autoComplete="off"
          style={{
            flex: 1,
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: '14px',
            color: 'var(--clr-text)',
            fontFamily: 'var(--font)',
          }}
        />



        {/* Botão limpar */}
        {inputValue && (
          <button
            onClick={() => { setInputValue(''); limparSugestoes(); inputRef.current?.focus(); }}
            aria-label="Limpar busca"
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              color: 'var(--clr-text-3)', fontSize: '18px', padding: '2px',
              flexShrink: 0, lineHeight: 1,
            }}
          >×</button>
        )}

        {/* Botão de Ajuda */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            setShowHelp(prev => !prev);
          }}
          aria-label="Ajuda sobre a busca"
          style={{
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--clr-text-3)', padding: '2px',
            flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
            marginLeft: '4px'
          }}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3"></path>
            <line x1="12" y1="17" x2="12.01" y2="17"></line>
          </svg>
        </button>
      </div>

      {/* Popover de Ajuda */}
      {showHelp && (
        <div style={{
          position: 'absolute',
          top: '100%',
          right: 0,
          marginTop: '8px',
          width: '320px',
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: 'var(--r-md)',
          boxShadow: 'var(--shadow-lg)',
          zIndex: 60,
          padding: '16px',
          fontSize: '13px',
          color: 'var(--clr-text)',
          textAlign: 'left'
        }}>
          <h4 style={{ margin: '0 0 12px 0', fontSize: '14px', color: 'var(--clr-text)' }}>Como pesquisar?</h4>
          <p style={{ margin: '0 0 8px 0', color: 'var(--clr-text-2)' }}>Você pode digitar livremente combinando filtros separados por vírgula:</p>
          <ul style={{ margin: '0 0 12px 0', paddingLeft: '20px', color: 'var(--clr-text-2)', lineHeight: 1.5 }}>
            <li><strong>Produtos:</strong> "Imperio Pilsen"</li>
            <li><strong>Processos:</strong> "Brassagem", "Filtração"</li>
            <li><strong>Ensaios:</strong> "pH", "Extrato", "Cor"</li>
            <li><strong>Datas:</strong> "22/01/2026", "últimos 7 dias", "09/08/2025 - 10/09/2025"</li>
          </ul>
          <div style={{ background: 'var(--clr-surface-2)', padding: '10px', borderRadius: '4px', border: '1px solid var(--clr-border)' }}>
            <span style={{ fontSize: '11px', color: 'var(--clr-text-3)', display: 'block', marginBottom: '4px', fontWeight: 600, textTransform: 'uppercase' }}>Exemplo completo:</span>
            <code style={{ color: 'var(--clr-text)', fontSize: '12px' }}>brassagem, ph, MOSTO IMPERIO HELLES, ultimos 6 meses</code>
          </div>
        </div>
      )}

      {/* ── Dropdown de sugestões ──────────────────────────────────────────── */}
      {mostrarDropdown && (
        <div
          id="search-suggestions-list"
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            right: 0,
            background: 'var(--clr-surface)',
            border: '1.5px solid var(--clr-primary)',
            borderTop: 'none',
            borderRadius: '0 0 10px 10px',
            boxShadow: '0 8px 24px rgba(0,0,0,0.12)',
            zIndex: 100,
            overflow: 'hidden',
          }}
        >
          <div style={{
            padding: '8px 16px 4px',
            fontSize: '10px',
            fontWeight: 700,
            letterSpacing: '0.1em',
            color: 'var(--clr-text-3)',
            textTransform: 'uppercase',
          }}>
            Sugestões
          </div>

          {mostrarCarregando && (
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '16px', fontSize: '13px', color: 'var(--clr-text-3)', gap: '8px' }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'qlab-spin 1s linear infinite' }}>
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Carregando catálogo de sugestões...
            </div>
          )}

          {(['processo', 'produto', 'ensaio'] as const).map(tipo => {
            const grupo = sugestoes.filter(s => s.tipo === tipo);
            if (grupo.length === 0) return null;
            const cfg = TIPO_CONFIG[tipo];
            return (
              <div key={tipo}>
                {grupo.map((s, idx) => (
                  <div
                    key={`${s.tipo}-${s.valor}-${idx}`}
                    role="option"
                    aria-selected="false"
                    onMouseDown={e => { e.preventDefault(); handleSugestaoClick(s); }}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '10px',
                      padding: '9px 16px',
                      cursor: 'pointer',
                      transition: 'background 0.1s',
                      borderTop: '1px solid var(--clr-border)',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-surface-2)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    <span style={{
                      fontSize: '10px',
                      fontWeight: 700,
                      letterSpacing: '0.06em',
                      color: cfg.cor,
                      background: cfg.bg,
                      padding: '2px 7px',
                      borderRadius: '4px',
                      flexShrink: 0,
                    }}>
                      {cfg.badge}
                    </span>
                    <span style={{ fontSize: '14px', color: 'var(--clr-text)' }}>
                      {s.label}
                    </span>
                  </div>
                ))}
              </div>
            );
          })}

          {/* Rodapé — Enter para buscar */}
          <div style={{
            padding: '8px 16px',
            borderTop: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'flex-end',
            gap: '6px',
          }}>
            <span style={{ fontSize: '11px', color: 'var(--clr-text-3)' }}>
              Pressione
            </span>
            <kbd style={{
              fontSize: '10px',
              background: 'var(--clr-surface-2)',
              border: '1px solid var(--clr-border)',
              borderRadius: '4px',
              padding: '1px 5px',
              color: 'var(--clr-text-2)',
            }}>Enter</kbd>
            <span style={{ fontSize: '11px', color: 'var(--clr-text-3)' }}>
              para buscar
            </span>
          </div>
        </div>
      )}
    </div>
  );
}
