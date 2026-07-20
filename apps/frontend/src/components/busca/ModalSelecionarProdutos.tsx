// apps/frontend/src/components/busca/ModalSelecionarProdutos.tsx
//
// Modal que lista os produtos de um tipo específico de produto.
// Abre quando o usuário seleciona uma etiqueta "tipo-produto" na BuscaPage.
// Permite busca interna e seleção por checkbox. Confirmar devolve os IDs via callback.

import { useState, useMemo, useEffect } from 'react';
import type { CatalogoItem } from '../../services/busca.api';

interface ModalSelecionarProdutosProps {
  tipo: string;
  produtos: CatalogoItem[];
  /** IDs já selecionados previamente (para manter estado entre aberturas) */
  selecionadosIniciais?: number[];
  onConfirmar: (ids: number[]) => void;
  onFechar: () => void;
}

function norm(s: string): string {
  return s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

export function ModalSelecionarProdutos({
  tipo,
  produtos,
  selecionadosIniciais = [],
  onConfirmar,
  onFechar,
}: ModalSelecionarProdutosProps) {
  const [busca, setBusca] = useState('');
  const [selecionados, setSelecionados] = useState<Set<number>>(
    new Set(selecionadosIniciais),
  );

  // Fecha com Escape
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onFechar();
    }
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onFechar]);

  const produtosFiltrados = useMemo(() => {
    const chave = norm(busca.trim());
    if (!chave) return produtos;
    return produtos.filter(p => norm(p.nome).includes(chave));
  }, [busca, produtos]);

  function toggleProduto(id: number) {
    setSelecionados(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleTodos() {
    if (produtosFiltrados.every(p => selecionados.has(p.id))) {
      // Desmarca todos os filtrados
      setSelecionados(prev => {
        const next = new Set(prev);
        produtosFiltrados.forEach(p => next.delete(p.id));
        return next;
      });
    } else {
      // Marca todos os filtrados
      setSelecionados(prev => {
        const next = new Set(prev);
        produtosFiltrados.forEach(p => next.add(p.id));
        return next;
      });
    }
  }

  const todosChecados =
    produtosFiltrados.length > 0 &&
    produtosFiltrados.every(p => selecionados.has(p.id));
  const count = selecionados.size;

  return (
    // Overlay
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Selecionar produtos — ${tipo}`}
      onClick={e => {
        if (e.target === e.currentTarget) onFechar();
      }}
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0, 0, 0, 0.45)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 200,
        padding: '24px',
        backdropFilter: 'blur(2px)',
      }}
    >
      {/* Card */}
      <div
        style={{
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: '14px',
          boxShadow: 'var(--shadow-lg)',
          width: '100%',
          maxWidth: '520px',
          maxHeight: '80vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '18px 20px 14px',
            borderBottom: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'flex-start',
            gap: '12px',
          }}
        >
          <div style={{ flex: 1 }}>
            <div
              style={{
                fontSize: '11px',
                fontWeight: 700,
                letterSpacing: '0.08em',
                color: '#4C1D95',
                background: '#EDE9FE',
                display: 'inline-block',
                padding: '2px 8px',
                borderRadius: '4px',
                marginBottom: '6px',
                textTransform: 'uppercase',
              }}
            >
              TIPO
            </div>
            <h2
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--clr-text)',
                lineHeight: 1.3,
              }}
            >
              {tipo}
            </h2>
            <p style={{ margin: '4px 0 0', fontSize: '12px', color: 'var(--clr-text-3)' }}>
              {produtos.length} produto{produtos.length !== 1 ? 's' : ''} disponível
              {produtos.length !== 1 ? 'is' : ''}
            </p>
          </div>
          <button
            onClick={onFechar}
            aria-label="Fechar modal"
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--clr-text-3)',
              fontSize: '20px',
              lineHeight: 1,
              padding: '2px',
              flexShrink: 0,
            }}
          >
            ×
          </button>
        </div>

        {/* ── Busca interna ───────────────────────────────────────────────────── */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--clr-border)' }}>
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              padding: '0 12px',
              height: '36px',
              background: 'var(--clr-surface-2)',
              border: '1px solid var(--clr-border)',
              borderRadius: '8px',
            }}
          >
            <svg
              width="13"
              height="13"
              viewBox="0 0 24 24"
              fill="none"
              stroke="var(--clr-text-3)"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              style={{ flexShrink: 0 }}
            >
              <circle cx="11" cy="11" r="8" />
              <line x1="21" y1="21" x2="16.65" y2="16.65" />
            </svg>
            <input
              id="modal-busca-produto"
              type="text"
              value={busca}
              onChange={e => setBusca(e.target.value)}
              placeholder="Filtrar produtos..."
              autoFocus
              style={{
                flex: 1,
                border: 'none',
                outline: 'none',
                background: 'transparent',
                fontSize: '13px',
                color: 'var(--clr-text)',
                fontFamily: 'var(--font)',
              }}
            />
            {busca && (
              <button
                onClick={() => setBusca('')}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  color: 'var(--clr-text-3)',
                  fontSize: '16px',
                  lineHeight: 1,
                  padding: 0,
                }}
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* ── Toggle todos ────────────────────────────────────────────────────── */}
        {produtosFiltrados.length > 1 && (
          <div
            onClick={toggleTodos}
            style={{
              padding: '8px 20px',
              borderBottom: '1px solid var(--clr-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '10px',
              cursor: 'pointer',
              background: todosChecados ? 'var(--clr-surface-2)' : 'transparent',
              transition: 'background 0.1s',
            }}
          >
            <div
              style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                border: `2px solid ${todosChecados ? '#4C1D95' : 'var(--clr-border)'}`,
                background: todosChecados ? '#4C1D95' : 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
                transition: 'all 0.15s',
              }}
            >
              {todosChecados && (
                <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                  <polyline
                    points="2,6 5,9 10,3"
                    stroke="white"
                    strokeWidth="1.8"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </div>
            <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-text-2)' }}>
              {todosChecados ? 'Desmarcar todos' : 'Selecionar todos'}
              {busca && ` (${produtosFiltrados.length} filtrados)`}
            </span>
          </div>
        )}

        {/* ── Lista de produtos ───────────────────────────────────────────────── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '4px 0' }}>
          {produtosFiltrados.length === 0 ? (
            <div
              style={{
                padding: '24px 20px',
                textAlign: 'center',
                color: 'var(--clr-text-3)',
                fontSize: '13px',
              }}
            >
              Nenhum produto encontrado
            </div>
          ) : (
            produtosFiltrados.map(produto => {
              const checked = selecionados.has(produto.id);
              return (
                <div
                  key={produto.id}
                  onClick={() => toggleProduto(produto.id)}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px',
                    padding: '9px 20px',
                    cursor: 'pointer',
                    background: checked ? '#F5F3FF' : 'transparent',
                    borderBottom: '1px solid var(--clr-border)',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => {
                    if (!checked) e.currentTarget.style.background = 'var(--clr-surface-2)';
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.background = checked ? '#F5F3FF' : 'transparent';
                  }}
                >
                  {/* Checkbox visual */}
                  <div
                    style={{
                      width: '16px',
                      height: '16px',
                      borderRadius: '4px',
                      border: `2px solid ${checked ? '#4C1D95' : 'var(--clr-border)'}`,
                      background: checked ? '#4C1D95' : 'transparent',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      transition: 'all 0.15s',
                    }}
                  >
                    {checked && (
                      <svg width="10" height="10" viewBox="0 0 12 12" fill="none">
                        <polyline
                          points="2,6 5,9 10,3"
                          stroke="white"
                          strokeWidth="1.8"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                        />
                      </svg>
                    )}
                  </div>
                  <span
                    style={{
                      fontSize: '13px',
                      color: checked ? '#4C1D95' : 'var(--clr-text)',
                      fontWeight: checked ? 600 : 400,
                      lineHeight: 1.4,
                    }}
                  >
                    {produto.nome}
                  </span>
                </div>
              );
            })
          )}
        </div>

        {/* ── Footer ─────────────────────────────────────────────────────────── */}
        <div
          style={{
            padding: '14px 20px',
            borderTop: '1px solid var(--clr-border)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '12px',
            background: 'var(--clr-surface)',
          }}
        >
          <span
            style={{
              fontSize: '12px',
              color: count > 0 ? '#4C1D95' : 'var(--clr-text-3)',
              fontWeight: count > 0 ? 600 : 400,
            }}
          >
            {count > 0
              ? `${count} produto${count !== 1 ? 's' : ''} selecionado${count !== 1 ? 's' : ''}`
              : 'Nenhum selecionado'}
          </span>

          <div style={{ display: 'flex', gap: '8px' }}>
            <button
              onClick={onFechar}
              style={{
                padding: '8px 16px',
                background: 'var(--clr-surface-2)',
                border: '1px solid var(--clr-border)',
                borderRadius: '8px',
                color: 'var(--clr-text-2)',
                fontSize: '13px',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'var(--font)',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={() => onConfirmar(Array.from(selecionados))}
              disabled={count === 0}
              style={{
                padding: '8px 20px',
                background: count > 0 ? '#4C1D95' : 'var(--clr-surface-2)',
                border: `1px solid ${count > 0 ? '#4C1D95' : 'var(--clr-border)'}`,
                borderRadius: '8px',
                color: count > 0 ? '#fff' : 'var(--clr-text-3)',
                fontSize: '13px',
                fontWeight: 700,
                cursor: count > 0 ? 'pointer' : 'default',
                opacity: count > 0 ? 1 : 0.7,
                transition: 'all 0.15s',
                fontFamily: 'var(--font)',
              }}
            >
              Buscar com esses produtos
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
