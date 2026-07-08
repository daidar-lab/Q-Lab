// apps/frontend/src/components/ui/DateRange.tsx
import { useState, type CSSProperties } from 'react';

interface Props {
    dataInicio: string;
    dataFim: string;
    onChange: (campo: 'dataInicio' | 'dataFim', val: string) => void;
    label?: string;
    isMobile?: boolean;
}

export function DateRange({ dataInicio, dataFim, onChange, label, isMobile }: Props) {
    const [focused, setFocused] = useState<'inicio' | 'fim' | null>(null);

    const inputStyle = (field: 'inicio' | 'fim'): CSSProperties => ({
        padding: '10px 12px',
        borderRadius: 'var(--r-md)',
        border: `1.5px solid ${focused === field ? 'var(--clr-primary)' : 'var(--clr-border)'}`,
        fontSize: '15px',
        color: 'var(--clr-text)',
        background: 'var(--clr-surface)',
        width: '100%',
        boxSizing: 'border-box',
        outline: 'none',
        boxShadow: focused === field
            ? '0 0 0 3px var(--clr-primary-ring), var(--shadow-xs)'
            : 'var(--shadow-xs)',
        transition: 'border-color var(--t-fast), box-shadow var(--t-fast)',
        fontFamily: 'var(--font)',
        cursor: 'pointer',
    });

    const labelStyle: CSSProperties = {
        fontSize: '11px',
        fontWeight: 600,
        color: 'var(--clr-text-3)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        marginBottom: '4px',
        display: 'block',
    };

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
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
            <div style={{ display: 'flex', gap: '8px', flexDirection: isMobile ? 'column' : 'row' }}>
                <div style={{ flex: 1 }}>
                    <span style={labelStyle}>De</span>
                    <input
                        type="date"
                        style={inputStyle('inicio')}
                        value={dataInicio}
                        onChange={e => onChange('dataInicio', e.target.value)}
                        onFocus={() => setFocused('inicio')}
                        onBlur={() => setFocused(null)}
                    />
                </div>
                <div style={{ flex: 1 }}>
                    <span style={labelStyle}>Até</span>
                    <input
                        type="date"
                        style={inputStyle('fim')}
                        value={dataFim}
                        onChange={e => onChange('dataFim', e.target.value)}
                        onFocus={() => setFocused('fim')}
                        onBlur={() => setFocused(null)}
                    />
                </div>
            </div>
        </div>
    );
}