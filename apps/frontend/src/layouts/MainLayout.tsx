import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthProvider';
import { PeriodSelector } from '../components/ui/PeriodSelector';
import type { CSSProperties } from 'react';

// Breadcrumb simples baseado na URL
function useBreadcrumb() {
  const location = useLocation();
  const parts = location.pathname.split('/').filter(Boolean);
  if (parts.length === 0) return null;

  const labels: Record<string, string> = {
    categoria: '', processos: 'Processos', produtos: 'Produtos', ensaios: 'Ensaios',
    detalhe: '', config: 'Configurações',
  };

  return parts
    .map(p => labels[p] ?? decodeURIComponent(p))
    .filter(Boolean);
}

export default function MainLayout() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const breadcrumb = useBreadcrumb();
  const isAdmin = usuario?.role === 'admin';

  const header: CSSProperties = {
    background: 'var(--clr-nav-bg)',
    borderBottom: '1px solid var(--clr-nav-border)',
    padding: '0 24px',
    height: '56px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    position: 'sticky',
    top: 0,
    zIndex: 50,
  };

  const logoIcon: CSSProperties = {
    width: '32px', height: '32px',
    background: 'var(--clr-primary)',
    borderRadius: '8px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontSize: '15px', fontWeight: 800, color: '#fff',
    flexShrink: 0,
  };

  const logoText: CSSProperties = {
    display: 'flex', flexDirection: 'column', gap: '1px',
  };

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
  };

  return (
    <div style={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column', background: 'var(--clr-bg)' }}>
      <header style={header}>
        {/* Esquerda — logo */}
        <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: '10px', textDecoration: 'none' }}>
          <div style={logoIcon}>Q</div>
          <div style={logoText}>
            <span style={{ fontSize: '14px', fontWeight: 700, color: 'var(--clr-nav-text)', lineHeight: 1 }}>
              Controle de Qualidade
            </span>
            <span style={{ fontSize: '10px', fontWeight: 500, color: 'var(--clr-nav-text-2)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              Laboratório · Cervejaria
            </span>
          </div>
        </Link>

        {/* Centro — seletor de período */}
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center', paddingLeft: '24px', paddingRight: '24px' }}>
          <PeriodSelector />
        </div>

        {/* Direita — usuário + ações */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {usuario && (
            <span style={{ fontSize: '13px', color: 'var(--clr-nav-text-2)' }}>
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
      </header>

      {/* Breadcrumb — só aparece quando não está na home */}
      {breadcrumb && (
        <div style={{ padding: '10px 24px', borderBottom: '1px solid var(--clr-border)', background: 'var(--clr-surface)', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: 'var(--clr-text-3)' }}>
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