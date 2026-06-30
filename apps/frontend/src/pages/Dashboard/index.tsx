import { useState, type CSSProperties } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContexto } from '../../contexts/ContextoProvider';
import { useDashboard } from '../../hooks/useDashboard';
import ResumoAutomatico from '../../components/dashboard/ResumoAutomatico';

const CATEGORIAS_META = [
  { tipo: 'processos', label: 'Macro Processos', icon: '≡' },
  { tipo: 'produtos', label: 'Produtos', icon: '⬡' },
  { tipo: 'ensaios', label: 'Ensaios', icon: '⬡' },
] as const;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { ctx } = useContexto();
  const periodo = { dataInicio: ctx.dataInicio ?? '', dataFim: ctx.dataFim ?? '' };
  const { kpis, processos, produtos, ensaios, carregando, erro } = useDashboard(periodo);
  const [expandedMacro, setExpandedMacro] = useState<string | null>(null);
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});

  const dadosPorTipo: Record<string, typeof processos> = { processos, produtos, ensaios };

  const kpiCard: CSSProperties = {
    background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
    borderRadius: 'var(--r-lg)', padding: '20px 24px', flex: 1,
  };

  const catCard: CSSProperties = {
    background: 'var(--clr-surface)', border: '1px solid var(--clr-border)',
    borderRadius: 'var(--r-lg)', overflow: 'hidden', flex: 1, minWidth: 0,
  };

  if (carregando) {
    return (
      <div style={{ padding: '60px', textAlign: 'center', color: 'var(--clr-text-3)' }}>
        Carregando dashboard…
      </div>
    );
  }

  if (erro) {
    return (
      <div style={{ padding: '40px', maxWidth: '600px', margin: '0 auto' }}>
        <div style={{ background: 'var(--clr-danger-bg)', color: 'var(--clr-danger)', padding: '16px', borderRadius: 'var(--r-md)' }}>
          {erro}
        </div>
      </div>
    );
  }

  function formatDelta(deltaPct: number | null, invertido = false) {
    if (deltaPct == null) return { texto: '—', cor: 'var(--clr-text-3)' };
    const positivo = invertido ? deltaPct < 0 : deltaPct > 0;
    const seta = deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '—';
    return {
      texto: `${seta} ${Math.abs(deltaPct)}% vs. período anterior`,
      cor: positivo ? 'var(--clr-success)' : 'var(--clr-danger)',
    };
  }

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* KPIs reais */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {kpis && [
          { label: 'AMOSTRAS ANALISADAS', value: kpis.amostras.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.amostras.deltaPct) },
          { label: 'ENSAIOS REALIZADOS', value: kpis.ensaios.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.ensaios.deltaPct) },
          { label: 'ENSAIOS INFORMATIVOS', value: kpis.informativos.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.informativos.deltaPct) },
          { label: 'NÃO CONFORMIDADES', value: kpis.naoConformidades.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.naoConformidades.deltaPct, true) },
          {
            label: 'CONFORMIDADE', value: `${kpis.conformidade.valor}%`,
            delta: { texto: `— meta ${kpis.conformidade.meta}%`, cor: 'var(--clr-text-3)' }
          },
        ].map(k => (
          <div key={k.label} style={kpiCard}>
            <div style={{ fontSize: '11px', fontWeight: 600, color: 'var(--clr-text-3)', letterSpacing: '0.06em', marginBottom: '8px' }}>
              {k.label}
            </div>
            <div style={{ fontSize: '32px', fontWeight: 800, color: 'var(--clr-text)', lineHeight: 1, marginBottom: '8px' }}>
              {k.value}
            </div>
            <div style={{ fontSize: '12px', color: k.delta.cor }}>{k.delta.texto}</div>
          </div>
        ))}
      </div>
      <div style={{ marginBottom: '28px' }}>
        <ResumoAutomatico dataInicio={periodo.dataInicio} dataFim={periodo.dataFim} />
      </div>
      {/* Categorias com dados reais */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <h2 style={{ margin: 0, fontSize: '16px', fontWeight: 700, color: 'var(--clr-text)' }}>Explorar por categoria</h2>
        <span style={{ fontSize: '13px', color: 'var(--clr-text-3)' }}>Clique em qualquer item para abrir o histórico</span>
      </div>

      <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
        {CATEGORIAS_META.map(cat => {
          const itens = dadosPorTipo[cat.tipo] ?? [];
          const ncTotal = itens.reduce((s, i) => s + Number(i.nc), 0);
          const isCategoryExpanded = !!expandedCategories[cat.tipo];
          const visibleItens = isCategoryExpanded ? itens.slice(0, 10) : itens.slice(0, 3);

          return (
            <div key={cat.tipo} style={catCard}>
              <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--clr-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ fontSize: '16px', color: 'var(--clr-text-2)' }}>{cat.icon}</span>
                  <span style={{ fontSize: '15px', fontWeight: 700, color: 'var(--clr-text)' }}>{cat.label}</span>
                </div>
                <span style={{ fontSize: '12px', fontWeight: 600, color: 'var(--clr-danger)', background: 'var(--clr-danger-bg)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                  {ncTotal} NC
                </span>
              </div>

              {visibleItens.length === 0 && (
                <div style={{ padding: '20px', textAlign: 'center', fontSize: '13px', color: 'var(--clr-text-3)' }}>
                  Sem dados no período
                </div>
              )}

              {visibleItens.map((item, i) => {
                const isExpanded = cat.tipo === 'processos' && expandedMacro === item.nome;
                return (
                  <div key={item.id}>
                    <div
                      onClick={() => {
                        if (cat.tipo === 'processos') {
                          const temProduto = item.tem_produto !== false;
                          const temProcesso = item.tem_processo === true;
                          if (temProduto && temProcesso) {
                            setExpandedMacro(prev => prev === item.nome ? null : item.nome);
                          } else if (temProcesso) {
                            navigate(`/detalhe/Macro-Processo/${item.nome}/processo`);
                          } else {
                            navigate(`/detalhe/Macro-Processo/${item.nome}/produto`);
                          }
                        } else {
                          navigate(`/detalhe/${cat.tipo}/${item.id}`);
                        }
                      }}
                      style={{
                        padding: '14px 20px',
                        borderBottom: (!isExpanded && i < visibleItens.length - 1) ? '1px solid var(--clr-border)' : 'none',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', transition: 'background var(--t-fast)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--clr-text)' }}>{item.nome}</div>
                        <div style={{ fontSize: '12px', color: 'var(--clr-text)', marginTop: '2px' }}>{item.amostras} amostras</div>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {cat.tipo === 'processos' && (item.tem_produto !== false && item.tem_processo === true) && (
                          <span style={{
                            fontSize: '10px',
                            color: 'var(--clr-text)',
                            transition: 'transform var(--t-fast)',
                            transform: isExpanded ? 'rotate(90deg)' : 'rotate(0deg)',
                            display: 'inline-block',
                            marginRight: '4px'
                          }}>
                            ▶
                          </span>
                        )}
                        <span style={{ minWidth: '28px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', background: item.nc > 10 ? 'var(--clr-danger)' : 'var(--clr-warning)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                          {item.nc}
                        </span>
                      </div>
                    </div>

                    {isExpanded && (
                      <div style={{
                        background: 'var(--clr-border)',
                        borderBottom: i < visibleItens.length - 1 ? '1px solid var(--clr-border)' : 'none'
                      }}>
                        <div
                          onClick={() => navigate(`/detalhe/macro-processo/${item.nome}/produto`)}
                          style={{
                            padding: '10px 20px 10px 36px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--clr-text-2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background var(--t-fast)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-surface-3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontSize: '14px' }}></span> Produto
                        </div>
                        <div
                          onClick={() => navigate(`/detalhe/macro-processo/${item.nome}/processo`)}
                          style={{
                            padding: '10px 20px 10px 36px',
                            cursor: 'pointer',
                            fontSize: '13px',
                            fontWeight: 600,
                            color: 'var(--clr-text-2)',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'background var(--t-fast)',
                          }}
                          onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-surface-3)')}
                          onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                        >
                          <span style={{ fontSize: '14px' }}></span> Processo
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}

              {itens.length > 3 && (
                <div
                  onClick={() => {
                    setExpandedCategories(prev => ({
                      ...prev,
                      [cat.tipo]: !prev[cat.tipo]
                    }));
                  }}
                  style={{ padding: '12px 20px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: 'var(--clr-primary)', cursor: 'pointer', borderTop: '1px solid var(--clr-border)' }}
                >
                  {isCategoryExpanded ? 'Ver menos ↑' : `Ver todos os ${cat.label.toLowerCase()} →`}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}