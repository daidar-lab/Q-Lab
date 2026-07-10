// apps/frontend/src/pages/Login/index.tsx
import { useState, type FormEvent, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthProvider';

export default function Login() {
    const navigate = useNavigate();
    const { login } = useAuth();
    const [form, setForm] = useState({ login: '', senha: '' });
    const [erro, setErro] = useState<string | null>(null);
    const [loading, setLoad] = useState(false);
    const [focusField, setFocusField] = useState<string | null>(null);

    async function handleSubmit(e: FormEvent) {
        e.preventDefault();
        setErro(null);
        setLoad(true);
        try {
            await login(form.login.trim(), form.senha);
            navigate('/', { replace: true });
        } catch (e: any) {
            setErro(e.message ?? 'Credenciais inválidas. Tente novamente.');
        } finally {
            setLoad(false);
        }
    }

    const inputStyle = (field: string): CSSProperties => ({
        padding: '11px 14px',
        borderRadius: 'var(--r-md)',
        border: `1.5px solid ${focusField === field ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
        fontSize: '15px',
        color: 'var(--clr-text)',
        background: 'var(--clr-surface)',
        fontFamily: 'var(--font)',
        width: '100%',
        boxSizing: 'border-box' as const,
        outline: 'none',
        boxShadow: focusField === field
            ? '0 0 0 3px var(--clr-primary-ring), var(--shadow-xs)'
            : 'var(--shadow-xs)',
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
    });

    return (
        <div style={s.container}>
            {/* Background decoration */}
            <div style={s.bgDecor1} />
            <div style={s.bgDecor2} />

            <div style={s.card}>
                {/* Logo mark */}
                <div style={s.logoMark}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                        <img src="/favicon.svg" alt="Q-Lab Logo" style={{ width: '96px', height: '96px' }} />
                        <span style={s.logoText}>Q/Lab</span>
                    </div>
                    <span style={s.logoSub}>Controle de Qualidade</span>
                </div>

                <div style={s.divider} />

                <p style={s.orgLabel}>Cervejaria Cidade Imperial</p>

                <form onSubmit={handleSubmit} style={s.form}>
                    <div style={s.field}>
                        <label style={s.label}>Usuário</label>
                        <input
                            style={inputStyle('login')}
                            type="text"
                            autoCapitalize="off"
                            autoComplete="username"
                            value={form.login}
                            placeholder="seu.usuario"
                            onChange={e => setForm(f => ({ ...f, login: e.target.value }))}
                            onFocus={() => setFocusField('login')}
                            onBlur={() => setFocusField(null)}
                            required
                        />
                    </div>

                    <div style={s.field}>
                        <label style={s.label}>Senha</label>
                        <input
                            style={inputStyle('senha')}
                            type="password"
                            autoComplete="current-password"
                            placeholder="••••••••"
                            value={form.senha}
                            onChange={e => setForm(f => ({ ...f, senha: e.target.value }))}
                            onFocus={() => setFocusField('senha')}
                            onBlur={() => setFocusField(null)}
                            required
                        />
                    </div>

                    {erro && (
                        <div style={s.erroBox}>
                            <span style={{ fontSize: '14px' }}>⚠</span>
                            <span>{erro}</span>
                        </div>
                    )}

                    <button
                        style={{
                            ...s.btn,
                            opacity: loading ? 0.7 : 1,
                            cursor: loading ? 'not-allowed' : 'pointer',
                        }}
                        type="submit"
                        disabled={loading}
                    >
                        {loading ? (
                            <>
                                <span style={s.spinner} />
                                Entrando…
                            </>
                        ) : 'Entrar'}
                    </button>
                </form>
            </div>
        </div>
    );
}

const s: Record<string, CSSProperties> = {
    container: {
        minHeight: '100dvh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'var(--clr-bg)',
        padding: '16px',
        position: 'relative',
        overflow: 'hidden',
    },
    bgDecor1: {
        position: 'fixed',
        top: '-120px',
        right: '-120px',
        width: '420px',
        height: '420px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(79,70,229,0.12) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    bgDecor2: {
        position: 'fixed',
        bottom: '-100px',
        left: '-100px',
        width: '360px',
        height: '360px',
        borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(124,58,237,0.10) 0%, transparent 70%)',
        pointerEvents: 'none',
    },
    card: {
        background: 'var(--clr-surface)',
        borderRadius: 'var(--r-xl)',
        padding: '36px 28px',
        width: '100%',
        maxWidth: '380px',
        boxShadow: 'var(--shadow-xl)',
        border: '1px solid var(--clr-border)',
        position: 'relative',
        zIndex: 1,
    },
    logoMark: {
        display: 'flex',
        flexDirection: 'column',
        gap: '2px',
        marginBottom: '0',
    },
    logoText: {
        fontSize: '30px',
        fontWeight: 800,
        letterSpacing: '-0.04em',
        color: 'var(--clr-primary)',
        lineHeight: 1.1,
    },
    logoSub: {
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--clr-text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.08em',
    },
    divider: {
        height: '1px',
        background: 'var(--clr-border)',
        margin: '20px 0 16px',
    },
    orgLabel: {
        margin: '0 0 24px',
        fontSize: '13px',
        fontWeight: 500,
        color: 'var(--clr-text-2)',
    },
    form: {
        display: 'flex',
        flexDirection: 'column',
        gap: '16px',
    },
    field: {
        display: 'flex',
        flexDirection: 'column',
        gap: '5px',
    },
    label: {
        fontSize: '12px',
        fontWeight: 600,
        color: 'var(--clr-text-2)',
        textTransform: 'uppercase',
        letterSpacing: '0.04em',
    },
    erroBox: {
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        fontSize: '13px',
        color: 'var(--clr-danger)',
        background: 'var(--clr-danger-bg)',
        padding: '10px 14px',
        borderRadius: 'var(--r-md)',
        border: '1px solid rgba(220,38,38,0.2)',
    },
    btn: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '8px',
        padding: '13px',
        borderRadius: 'var(--r-md)',
        border: 'none',
        background: 'linear-gradient(230deg, var(--clr-primary) 100%',
        color: '#fff',
        fontSize: '15px',
        fontWeight: 700,
        fontFamily: 'var(--font)',
        cursor: 'pointer',
        marginTop: '4px',
        boxShadow: '0 2px 8px rgba(79,70,229,0.35)',
        transition: 'opacity var(--t-fast), transform var(--t-fast)',
        letterSpacing: '-0.01em',
    },
    spinner: {
        display: 'inline-block',
        width: '14px',
        height: '14px',
        border: '2px solid rgba(255,255,255,0.35)',
        borderTopColor: '#fff',
        borderRadius: '50%',
        animation: 'qlab-spin 0.7s linear infinite',
    },
};