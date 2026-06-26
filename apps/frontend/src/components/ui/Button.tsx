// apps/frontend/src/components/ui/Button.tsx
import type { CSSProperties, ButtonHTMLAttributes, ReactNode, MouseEvent } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'ghost' | 'danger';
    loading?: boolean;
    children?: ReactNode;
    style?: CSSProperties;
    disabled?: boolean;
    onClick?: (event: MouseEvent<HTMLButtonElement>) => void;
}

export function Button({ variant = 'primary', loading, children, disabled, style, ...rest }: Props) {
    const variantClass: Record<string, CSSProperties> = {
        primary: {
            background: 'var(--clr-primary)',
            color: '#fff',
            border: 'none',
            boxShadow: '0 1px 3px rgba(79,70,229,0.28)',
        },
        ghost: {
            background: 'var(--clr-surface)',
            color: 'var(--clr-text)',
            border: '1.5px solid var(--clr-border)',
            boxShadow: 'var(--shadow-xs)',
        },
        danger: {
            background: 'var(--clr-danger)',
            color: '#fff',
            border: 'none',
        },
    };

    const base: CSSProperties = {
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '7px',
        padding: '10px 18px',
        borderRadius: 'var(--r-md)',
        fontSize: '14px',
        fontWeight: 600,
        fontFamily: 'var(--font)',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        transition: 'background var(--t-fast), box-shadow var(--t-fast), transform var(--t-fast), opacity var(--t-fast)',
        opacity: disabled || loading ? 0.45 : 1,
        letterSpacing: '-0.01em',
        ...variantClass[variant],
        ...style,
    };

    return (
        <button
            style={base}
            disabled={disabled || loading}
            onMouseEnter={e => {
                if (disabled || loading) return;
                if (variant === 'primary') {
                    e.currentTarget.style.background = 'var(--clr-primary-dark)';
                    e.currentTarget.style.boxShadow = '0 4px 12px rgba(79,70,229,0.35)';
                    e.currentTarget.style.transform = 'translateY(-1px)';
                } else if (variant === 'ghost') {
                    e.currentTarget.style.background = 'var(--clr-surface-2)';
                    e.currentTarget.style.borderColor = 'var(--clr-border-strong)';
                } else if (variant === 'danger') {
                    e.currentTarget.style.background = '#B91C1C';
                }
            }}
            onMouseLeave={e => {
                if (disabled || loading) return;
                Object.assign(e.currentTarget.style, variantClass[variant] as Record<string, string>);
                e.currentTarget.style.transform = '';
            }}
            onMouseDown={e => {
                if (disabled || loading) return;
                e.currentTarget.style.transform = 'translateY(0px)';
            }}
            {...rest}
        >
            {loading ? (
                <>
                    <span style={{
                        display: 'inline-block',
                        width: '13px', height: '13px',
                        border: '2px solid rgba(255,255,255,0.3)',
                        borderTopColor: variant === 'ghost' ? 'var(--clr-text)' : '#fff',
                        borderRadius: '50%',
                        animation: 'qlab-spin 0.7s linear infinite',
                    }} />
                    Aguarde…
                </>
            ) : children}
        </button>
    );
}