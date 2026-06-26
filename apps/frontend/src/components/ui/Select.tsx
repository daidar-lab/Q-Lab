// apps/frontend/src/components/ui/Select.tsx
import { useState, useEffect, type CSSProperties } from 'react';

interface Opcao { label: string; value: string | number; }

interface Props {
    label: string;
    opcoes: Opcao[];
    value: string | number | undefined;
    onChange: (val: string) => void;
    onClear?: () => void;
    disabled?: boolean;
    loading?: boolean;
    placeholder?: string;
}

export function Select({ label, opcoes, value, onChange, onClear, disabled, loading, placeholder = 'Selecione…' }: Props) {
    const [limite, setLimite] = useState(20);
    const [focused, setFocused] = useState(false);

    useEffect(() => {
        setLimite(20);
        const timer = setTimeout(() => setLimite(opcoes.length), 100);
        return () => clearTimeout(timer);
    }, [opcoes]);

    const opcoesVisiveis = opcoes.filter((o, index) => {
        if (value !== undefined && o.value === value) return true;
        return index < limite;
    });

    const opcaoSelecionada = opcoes.find(o => String(o.value) === String(value));

    const selectStyle: CSSProperties = {
        padding: '10px 12px',
        paddingRight: loading ? '36px' : '12px',
        borderRadius: 'var(--r-md)',
        border: `1.5px solid ${focused ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
        fontSize: '15px',
        color: value ? 'var(--clr-text)' : 'var(--clr-text-3)',
        background: disabled ? 'var(--clr-surface-2)' : 'var(--clr-surface)',
        width: '100%',
        boxShadow: focused
            ? '0 0 0 3px var(--clr-primary-ring), var(--shadow-xs)'
            : 'var(--shadow-xs)',
        outline: 'none',
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
        cursor: disabled ? 'not-allowed' : 'pointer',
        fontFamily: 'var(--font)',
        appearance: 'none' as const,
        WebkitAppearance: 'none' as const,
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <label style={{
                    fontSize: '12px', fontWeight: 600,
                    color: 'var(--clr-text-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}>
                    {label}
                </label>
                {onClear && value !== undefined && value !== '' && (
                    <button
                        type="button"
                        onClick={onClear}
                        style={{
                            background: 'none', border: 'none',
                            color: 'var(--clr-danger)', fontSize: '11px',
                            fontWeight: 600, cursor: 'pointer', padding: '2px 4px',
                            fontFamily: 'var(--font)',
                        }}
                    >
                        Limpar
                    </button>
                )}
            </div>

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <select
                    value={value ?? ''}
                    onChange={e => onChange(e.target.value)}
                    disabled={disabled || loading || opcoes.length === 0}
                    style={selectStyle}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                >
                    <option value="" disabled>
                        {loading ? 'Carregando…' : placeholder}
                    </option>
                    {opcoesVisiveis.map(o => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                </select>

                {/* Chevron icon */}
                {!loading && (
                    <div style={{
                        position: 'absolute', right: '10px',
                        pointerEvents: 'none', color: 'var(--clr-text-3)',
                        fontSize: '12px', lineHeight: 1,
                    }}>
                        ▾
                    </div>
                )}

                {loading && (
                    <div style={{
                        position: 'absolute', right: '12px',
                        width: '15px', height: '15px', borderRadius: '50%',
                        border: '2px solid var(--clr-border)',
                        borderTopColor: 'var(--clr-primary)',
                        animation: 'qlab-spin 0.6s linear infinite',
                        pointerEvents: 'none',
                    }} />
                )}
            </div>

            {opcaoSelecionada && (
                <span style={{
                    fontSize: '11px', color: 'var(--clr-primary)',
                    fontWeight: 500, marginTop: '1px',
                }}>
                    ✓ {opcaoSelecionada.label}
                </span>
            )}
        </div>
    );
}