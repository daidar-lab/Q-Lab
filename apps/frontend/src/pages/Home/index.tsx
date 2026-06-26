// apps/frontend/src/pages/Home/index.tsx
import { useState, type CSSProperties } from 'react';
import { EntradaDireta } from '../../components/contexto/EntradaDireta';
import { DrawerAnalitica } from '../../components/contexto/DrawerAnalitica';
import { useContexto } from '../../contexts/ContextoProvider';
import type { ContextoAnalise } from '@qlab/types';

type Aba = 'direta';

export default function HomePage() {
    const [aba] = useState<Aba>('direta');
    const [drawerOpen, setDrawer] = useState(false);
    const { ctx } = useContexto();

    function handleAnalisar() { setDrawer(true); }

    const tabStyle = (active: boolean): CSSProperties => ({
        flex: 1,
        padding: '10px',
        textAlign: 'center',
        fontSize: '13px',
        fontWeight: 600,
        cursor: 'pointer',
        background: 'none',
        border: 'none',
        borderBottom: active ? '2px solid var(--clr-primary)' : '2px solid transparent',
        color: active ? 'var(--clr-primary)' : 'var(--clr-text-3)',
        transition: 'color var(--t-fast), border-color var(--t-fast)',
        fontFamily: 'var(--font)',
        letterSpacing: '-0.01em',
    });

    return (
        <div style={{
            padding: '20px 16px 40px',
            maxWidth: '520px',
            margin: '0 auto',
        }}>
            {/* Page header */}
            <div style={{ marginBottom: '20px' }}>
                <h1 style={{
                    margin: '0 0 4px',
                    fontSize: '22px',
                    fontWeight: 800,
                    color: 'var(--clr-text)',
                    letterSpacing: '-0.03em',
                    lineHeight: 1.2,
                }}>
                    Análise
                </h1>
                <p style={{
                    margin: 0,
                    fontSize: '13px',
                    color: 'var(--clr-text-3)',
                }}>
                    Configure os filtros e execute a análise
                </p>
            </div>

            {/* Card wrapper */}
            <div style={{
                background: 'var(--clr-surface)',
                border: '1px solid var(--clr-border)',
                borderRadius: 'var(--r-xl)',
                boxShadow: 'var(--shadow-md)',
                overflow: 'hidden',
            }}>
                {/* Tabs */}
                <div style={{
                    display: 'flex',
                    borderBottom: '1px solid var(--clr-border)',
                    padding: '0 4px',
                }}>
                    <button style={tabStyle(aba === 'direta')} onClick={() => ('direta')}>
                        Filtros
                    </button>
                </div>

                {/* Form content */}
                <div style={{ padding: '20px 16px' }}>
                    <EntradaDireta onAnalisar={handleAnalisar} />
                </div>
            </div>

            <DrawerAnalitica
                open={drawerOpen}
                ctx={ctx as ContextoAnalise}
                onClose={() => setDrawer(false)}
            />
        </div>
    );
}