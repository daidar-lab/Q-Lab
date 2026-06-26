// apps/frontend/src/components/ui/AutocompleteInput.tsx
import { useState, useRef, useEffect, type CSSProperties } from 'react';

interface Opcao { label: string; value: number; }

interface Props {
    label?:       string;
    placeholder?: string;
    disabled?:    boolean;
    loading?:     boolean;
    value:        string;
    opcoes:       Opcao[];
    onInputChange: (termo: string) => void;
    onSelect:      (opcao: Opcao) => void;
}

export function AutocompleteInput({
    label, placeholder = 'Digite para buscar…', disabled, loading = false,
    value, opcoes, onInputChange, onSelect,
}: Props) {
    const [open, setOpen] = useState(false);
    const [focused, setFocused] = useState(false);
    const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
    const wrapperRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wrapperRef.current && !wrapperRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener('mousedown', handleClick);
        return () => document.removeEventListener('mousedown', handleClick);
    }, []);

    const inputStyle: CSSProperties = {
        padding: '10px 12px',
        paddingRight: loading ? '36px' : '12px',
        borderRadius: 'var(--r-md)',
        border: `1.5px solid ${focused ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
        fontSize: '15px',
        width: '100%',
        boxSizing: 'border-box',
        color: disabled ? 'var(--clr-text-3)' : 'var(--clr-text)',
        background: disabled ? 'var(--clr-surface-2)' : 'var(--clr-surface)',
        outline: 'none',
        boxShadow: focused
            ? '0 0 0 3px var(--clr-primary-ring), var(--shadow-xs)'
            : 'var(--shadow-xs)',
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
        fontFamily: 'var(--font)',
        cursor: disabled ? 'not-allowed' : 'text',
    };

    return (
        <div ref={wrapperRef} style={{ position: 'relative', display: 'flex', flexDirection: 'column', gap: '5px' }}>
            {label && (
                <label style={{
                    fontSize: '12px', fontWeight: 600,
                    color: 'var(--clr-text-2)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                }}>
                    {label}
                </label>
            )}

            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                    style={inputStyle}
                    placeholder={placeholder}
                    disabled={disabled}
                    value={value}
                    onChange={e => { onInputChange(e.target.value); setOpen(true); }}
                    onFocus={() => {
                        setFocused(true);
                        if (opcoes.length > 0 || loading) setOpen(true);
                    }}
                    onBlur={() => setFocused(false)}
                />
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
                {!loading && value && (
                    <div style={{
                        position: 'absolute', right: '10px',
                        color: 'var(--clr-text-3)', fontSize: '12px', pointerEvents: 'none',
                    }}>
                        ▾
                    </div>
                )}
            </div>

            {open && (opcoes.length > 0 || loading) && (
                <div style={{
                    position: 'absolute',
                    top: label ? 'calc(100% + 2px)' : 'calc(100% + 4px)',
                    left: 0, right: 0,
                    background: 'var(--clr-surface)',
                    border: '1.5px solid var(--clr-border)',
                    borderRadius: 'var(--r-lg)',
                    boxShadow: 'var(--shadow-lg)',
                    overflow: 'hidden',
                    maxHeight: '220px',
                    overflowY: 'auto',
                    zIndex: 20,
                }}>
                    {opcoes.length > 0 ? opcoes.map((o, i) => (
                        <div
                            key={o.value}
                            style={{
                                padding: '10px 14px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                color: hoveredIndex === i ? 'var(--clr-primary)' : 'var(--clr-text)',
                                background: hoveredIndex === i ? 'var(--clr-primary-light)' : 'transparent',
                                borderBottom: i < opcoes.length - 1 ? '1px solid var(--clr-border)' : 'none',
                                transition: 'background var(--t-fast), color var(--t-fast)',
                                fontWeight: hoveredIndex === i ? 500 : 400,
                            }}
                            onMouseEnter={() => setHoveredIndex(i)}
                            onMouseLeave={() => setHoveredIndex(null)}
                            onClick={() => { onSelect(o); setOpen(false); }}
                            onMouseDown={e => e.preventDefault()}
                        >
                            {o.label}
                        </div>
                    )) : (
                        <div style={{
                            padding: '12px 14px', fontSize: '13px',
                            color: 'var(--clr-text-3)', cursor: 'default',
                            display: 'flex', alignItems: 'center', gap: '8px',
                        }}>
                            <span style={{
                                display: 'inline-block', width: '13px', height: '13px',
                                border: '2px solid var(--clr-border)',
                                borderTopColor: 'var(--clr-primary)',
                                borderRadius: '50%',
                                animation: 'qlab-spin 0.6s linear infinite',
                            }} />
                            Carregando…
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}