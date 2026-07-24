import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import { useContexto } from '../contexts/ContextoProvider';
import { useCatalogo } from '../hooks/useCatalogo';
import { LABELS_CATEGORIA } from '../lib/search-parser';
import { PeriodSelector } from '../components/ui/PeriodSelector';
import { FilialSelector } from '../components/ui/FilialSelector';
import type { CSSProperties } from 'react';

// Breadcrumb inteligente baseado na URL + Catálogo + Labels bonitos
function useBreadcrumb() {
  const location = useLocation();
  const { filialId } = useContexto();
  const { catalogo } = useCatalogo(filialId);
  
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const labels: Record<string, string> = {
    categoria: '', processos: 'Processos', produtos: 'Produtos', ensaios: 'Ensaios',
    detalhe: '', config: 'Configurações',
  };

  return parts
    .map(p => {
      // 1. É um caminho mapeado fixo?
      if (labels[p] !== undefined) return labels[p];
      
      const decoded = decodeURIComponent(p);
      
      // 2. É um slug de processo conhecido?
      if (LABELS_CATEGORIA[decoded]) return LABELS_CATEGORIA[decoded];
      
      // 3. Tenta descobrir via catálogo se for ID numérico
      if (catalogo) {
        if (parts.includes('produtos')) {
          const prod = catalogo.produtos.find(x => x.id === Number(decoded));
          if (prod) return prod.nome;
        }
        if (parts.includes('ensaios')) {
          const ens = catalogo.ensaios.find(x => x.id === Number(decoded));
          if (ens) return ens.nome;
        }
      }

      // 4. Fallback: mostra como veio
      return decoded;
    })
    .filter(Boolean);
}

export default function MainLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isBuscaPage = location.pathname.startsWith('/busca');
  const breadcrumb = useBreadcrumb();
  const isAdmin = usuario?.role === 'admin';

  const ghostBtn: CSSProperties = {
    padding: '5px 12px',
    borderRadius: 'var(--r-md)',
    fontSize: '12px', fontWeight: 600,
    cursor: 'pointer',
    border: '1px solid rgba(255,255,255,0.15)',
    background: 'rgba(255,255,255,0.08)',
    color: 'var(--clr-nav-text)',
    fontFamily: 'var(--font)',
    transition: 'background var(--t-fast)',
    whiteSpace: 'nowrap' as const,
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--clr-bg)' }}>
      <style>{`
        /* ── MainLayout Mobile Responsive ──────────────────── */

        .ml-header {
          background: var(--clr-nav-bg);
          border-bottom: 1px solid var(--clr-nav-border);
          position: sticky;
          top: 0;
          z-index: 50;
        }

        /* ── Desktop: linha única ──────────────────────────── */
        .ml-header-top {
          padding: 0 24px;
          height: 56px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }

        .ml-selectors {
          flex: 1;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 16px;
          padding: 0 24px;
        }

        .ml-header-sub {
          display: none;
        }

        /* ── Mobile: 2 linhas (≤640px) ─────────────────────── */
        @media (max-width: 640px) {
          .ml-header-top {
            padding: 0 16px;
            height: 52px;
          }

          /* Esconde seletores do centro em mobile */
          .ml-selectors {
            display: none;
          }

          /* Sub-header: linha 2 com seletores */
          .ml-header-sub {
            display: flex;
            align-items: center;
            gap: 8px;
            padding: 8px 12px;
            border-top: 1px solid var(--clr-nav-border);
            background: var(--clr-nav-bg);
          }

          .ml-header-sub > * {
            flex: 1;
            min-width: 0;
          }

          /* Oculta o nome do usuário em mobile (economiza espaço) */
          .ml-username {
            display: none;
          }
        }

        /* ── Breadcrumb ─────────────────────────────────────── */
        .ml-breadcrumb {
          padding: 10px 24px;
          border-bottom: 1px solid var(--clr-border);
          background: var(--clr-surface);
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 13px;
          color: var(--clr-text-3);
          flex-wrap: wrap;
        }

        @media (max-width: 640px) {
          .ml-breadcrumb {
            padding: 8px 16px;
            font-size: 12px;
          }
        }
      `}</style>

      <header className="ml-header">
        {/* Linha 1: Logo + ações */}
        <div className="ml-header-top">
          {/* Esquerda — logo */}
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
            <img src="/favicon.svg" alt="Q-Lab Logo" style={{ width: '32px', height: '32px', flexShrink: 0 }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1px' }}>
              <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--clr-nav-text)', lineHeight: 1 }}>
                Q/Lab
              </span>
              <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--clr-nav-text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Laboratório · Cervejaria
              </span>
            </div>
          </Link>

          {/* Centro — seletores (desktop only) */}
          <div className="ml-selectors">
            <FilialSelector />
            {!isBuscaPage && <PeriodSelector />}
          </div>

          {/* Direita — usuário + ações */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {usuario && (
              <span className="ml-username" style={{ fontSize: '13px', color: 'var(--clr-nav-text-2)' }}>
                {usuario.nome}
              </span>
            )}
            {isAdmin && (
              <button style={ghostBtn} onClick={() => navigate('/config')}
                onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.14)')}
                onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
                Config
              </button>
            )}
            <button style={{ ...ghostBtn, border: '1px solid rgba(220,38,38,0.4)', color: '#FCA5A5' }}
              onClick={logout}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(220,38,38,0.15)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.08)')}>
              Sair
            </button>
          </div>
        </div>

        {/* Linha 2 (mobile only): seletores full-width */}
        <div className="ml-header-sub">
          <FilialSelector />
          {!isBuscaPage && <PeriodSelector />}
        </div>
      </header>

      {/* Breadcrumb — só aparece quando não está na home */}
      {breadcrumb && (
        <div className="ml-breadcrumb">
          <span style={{ cursor: 'pointer', color: 'var(--clr-text-3)' }} onClick={() => navigate('/')}>Visão geral</span>
          {breadcrumb.map((b, i) => (
            <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
              <span>›</span>
              <span style={{ color: i === breadcrumb.length - 1 ? 'var(--clr-text)' : 'var(--clr-text-3)', fontWeight: i === breadcrumb.length - 1 ? 600 : 400 }}>
                {b}
              </span>
            </span>
          ))}
        </div>
      )}

      <main style={{ flex: 1 }}>
        <Outlet />
      </main>
    </div>
  );
}