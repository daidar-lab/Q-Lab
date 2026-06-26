import { useState, type CSSProperties } from 'react';
import { useContexto } from '../../contexts/ContextoProvider';
import { DateRange } from './DateRange';

function calcularPeriodo(
  tipo: 'ultima_semana' | 'ultimos_30' | 'ultimos_90' | 'mes_atual'
): { inicio: string; fim: string } {
  const hoje = new Date();
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  let inicio = new Date(hoje);
  const fim = fmt(hoje);

  switch (tipo) {
    case 'ultima_semana':
      inicio.setDate(hoje.getDate() - 7);
      return { inicio: fmt(inicio), fim };
    case 'ultimos_30':
      inicio.setDate(hoje.getDate() - 30);
      return { inicio: fmt(inicio), fim };
    case 'ultimos_90':
      inicio.setDate(hoje.getDate() - 90);
      return { inicio: fmt(inicio), fim };
    case 'mes_atual':
      inicio.setDate(1);
      return { inicio: fmt(inicio), fim };
    default:
      return { inicio: fmt(inicio), fim };
  }
}

export function PeriodSelector() {
  const { ctx, set } = useContexto();
  const [aberto, setAberto] = useState(false);
  const [customInicio, setCustomInicio] = useState(ctx.dataInicio ?? '');
  const [customFim, setCustomFim] = useState(ctx.dataFim ?? '');

  const aplicarAtalho = (tipo: string) => {
    const periodo = calcularPeriodo(tipo as any);
    set('dataInicio', periodo.inicio);
    set('dataFim', periodo.fim);
    setAberto(false);
  };

  const aplicarCustom = () => {
    if (customInicio && customFim) {
      set('dataInicio', customInicio);
      set('dataFim', customFim);
      setAberto(false);
    }
  };

  const formatarData = (d: string) => {
    if (!d) return '';
    const [ano, mes, dia] = d.split('-');
    return `${dia}/${mes}/${ano}`;
  };

  const btnStyle: CSSProperties = {
    padding: '8px 12px',
    borderRadius: 'var(--r-md)',
    fontSize: '13px',
    fontWeight: 600,
    border: '1.5px solid var(--clr-border)',
    background: 'var(--clr-surface)',
    color: 'var(--clr-text)',
    cursor: 'pointer',
    transition: 'all var(--t-fast)',
    fontFamily: 'var(--font)',
  };

  const btnAtalhStyle: CSSProperties = {
    width: '100%',
    justifyContent: 'flex-start',
    textAlign: 'left',
    background: 'transparent',
    border: 'none',
    padding: '8px 0',
    color: 'var(--clr-text-2)',
    cursor: 'pointer',
    fontSize: '13px',
    fontWeight: 500,
    fontFamily: 'var(--font)',
    transition: 'color var(--t-fast)',
  };

  return (
    <div style={{ position: 'relative', display: 'flex', alignItems: 'center', gap: '8px' }}>
      <button
        onClick={() => setAberto(!aberto)}
        style={btnStyle}
        onMouseEnter={e => {
          e.currentTarget.style.background = 'var(--clr-surface-2)';
          e.currentTarget.style.borderColor = 'var(--clr-border-strong)';
        }}
        onMouseLeave={e => {
          e.currentTarget.style.background = 'var(--clr-surface)';
          e.currentTarget.style.borderColor = 'var(--clr-border)';
        }}
      >
        {formatarData(ctx.dataInicio ?? '')} – {formatarData(ctx.dataFim ?? '')}
      </button>

      {aberto && (
        <div
          style={{
            position: 'absolute',
            top: '100%',
            left: 0,
            marginTop: '8px',
            background: 'var(--clr-surface)',
            border: '1.5px solid var(--clr-border)',
            borderRadius: 'var(--r-lg)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
            zIndex: 100,
            padding: '12px',
            minWidth: '280px',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px',
          }}
        >
          {/* Atalhos */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--clr-text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Atalhos
            </label>
            <button
              onClick={() => aplicarAtalho('ultima_semana')}
              style={btnAtalhStyle}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--clr-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--clr-text-2)')}
            >
              Últimos 7 dias
            </button>
            <button
              onClick={() => aplicarAtalho('ultimos_30')}
              style={btnAtalhStyle}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--clr-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--clr-text-2)')}
            >
              Últimos 30 dias
            </button>
            <button
              onClick={() => aplicarAtalho('ultimos_90')}
              style={btnAtalhStyle}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--clr-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--clr-text-2)')}
            >
              Últimos 90 dias
            </button>
            <button
              onClick={() => aplicarAtalho('mes_atual')}
              style={btnAtalhStyle}
              onMouseEnter={e => (e.currentTarget.style.color = 'var(--clr-primary)')}
              onMouseLeave={e => (e.currentTarget.style.color = 'var(--clr-text-2)')}
            >
              Mês atual
            </button>
          </div>

          {/* Divisor */}
          <div style={{ height: '1px', background: 'var(--clr-border)' }} />

          {/* Range customizado */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            <label
              style={{
                fontSize: '11px',
                fontWeight: 600,
                color: 'var(--clr-text-3)',
                textTransform: 'uppercase',
                letterSpacing: '0.04em',
              }}
            >
              Personalizado
            </label>
            <DateRange
              dataInicio={customInicio}
              dataFim={customFim}
              onChange={(campo, val) => {
                if (campo === 'dataInicio') setCustomInicio(val);
                else setCustomFim(val);
              }}
            />
            {customInicio && customFim && customInicio > customFim && (
              <span style={{ color: 'var(--clr-danger, #ef4444)', fontSize: '11px', fontWeight: 500 }}>
                A data de início não pode ser maior que a data de fim.
              </span>
            )}
            <button
              onClick={aplicarCustom}
              disabled={!customInicio || !customFim || customInicio > customFim}
              style={{
                padding: '8px 12px',
                borderRadius: 'var(--r-md)',
                fontSize: '13px',
                fontWeight: 600,
                background:
                  customInicio && customFim && customInicio <= customFim ? 'var(--clr-primary)' : 'var(--clr-surface-2)',
                color: customInicio && customFim && customInicio <= customFim ? '#fff' : 'var(--clr-text-3)',
                border: 'none',
                cursor: customInicio && customFim && customInicio <= customFim ? 'pointer' : 'not-allowed',
                transition: 'all var(--t-fast)',
                fontFamily: 'var(--font)',
              }}
              onMouseEnter={e => {
                if (customInicio && customFim && customInicio <= customFim) {
                  e.currentTarget.style.background = 'var(--clr-primary-dark)';
                }
              }}
              onMouseLeave={e => {
                if (customInicio && customFim && customInicio <= customFim) {
                  e.currentTarget.style.background = 'var(--clr-primary)';
                }
              }}
            >
              Aplicar
            </button>
          </div>

          {/* Fechar */}
          <div style={{ height: '1px', background: 'var(--clr-border)' }} />
          <button
            onClick={() => setAberto(false)}
            style={{
              padding: '8px 12px',
              borderRadius: 'var(--r-md)',
              fontSize: '13px',
              fontWeight: 600,
              background: 'transparent',
              color: 'var(--clr-text-3)',
              border: '1.5px solid var(--clr-border)',
              cursor: 'pointer',
              fontFamily: 'var(--font)',
              transition: 'all var(--t-fast)',
            }}
            onMouseEnter={e => {
              e.currentTarget.style.background = 'var(--clr-surface-2)';
              e.currentTarget.style.borderColor = 'var(--clr-border-strong)';
            }}
            onMouseLeave={e => {
              e.currentTarget.style.background = 'transparent';
              e.currentTarget.style.borderColor = 'var(--clr-border)';
            }}
          >
            Fechar
          </button>
        </div>
      )}
    </div>
  );
}
