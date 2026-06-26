// apps/frontend/src/components/contexto/Navbar.tsx
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';
import type { CSSProperties } from 'react';

export default function Navbar() {
    const { usuario, logout } = useAuth();
    if (!usuario) return null;

    function handleLogout() { logout(); }

    const navStyle: CSSProperties = {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: '0 20px',
        height: '52px',
        background: 'var(--clr-nav-bg)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        borderBottom: '1px solid var(--clr-nav-border)',
        boxShadow: 'var(--shadow-nav)',
        position: 'sticky',
        top: 0,
        zIndex: 100,
    };

    return (
        <nav style={navStyle}>
            <Link
                to="/"
                style={{
                    fontSize: '17px',
                    fontWeight: 800,
                    letterSpacing: '-0.03em',
                    textDecoration: 'none',
                    background: 'linear-gradient(135deg, var(--clr-primary) 0%, #7C3AED 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    backgroundClip: 'text',
                }}
            >
                Q/Lab
            </Link>

            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                {usuario?.role === 'admin' && (
                    <Link
                        to="/config"
                        style={{
                            fontSize: '13px',
                            fontWeight: 500,
                            color: 'var(--clr-text-2)',
                            textDecoration: 'none',
                            transition: 'color var(--t-fast)',
                        }}
                        onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-primary)'; }}
                        onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.color = 'var(--clr-text-2)'; }}
                    >
                        Configurações
                    </Link>
                )}
                <button
                    onClick={handleLogout}
                    style={{
                        fontSize: '13px',
                        fontWeight: 600,
                        padding: '5px 14px',
                        border: '1.5px solid var(--clr-border)',
                        borderRadius: 'var(--r-md)',
                        background: 'var(--clr-surface)',
                        color: 'var(--clr-text)',
                        cursor: 'pointer',
                        fontFamily: 'var(--font)',
                        transition: 'background var(--t-fast), border-color var(--t-fast)',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'var(--clr-surface-2)';
                        e.currentTarget.style.borderColor = 'var(--clr-border-strong)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'var(--clr-surface)';
                        e.currentTarget.style.borderColor = 'var(--clr-border)';
                    }}
                >
                    Sair
                </button>
            </div>
        </nav>
    );
}