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

// Agrupamento dos macro-processos para visualização em árvore
const MACRO_GRUPOS_CONFIG = [
  {
    id: 'cip',
    label: 'CIP',
    subids: ['cip-processo', 'cip-envasamento-novo', 'cip-envasamento-antigo'],
  },
  {
    id: 'envase',
    label: 'Envase',
    subids: [
      'envase-produto-acabado',
      'envase-chopp',
      'envase-arrolhamento',
      'envase-provas-horarias',
      'envase-assoprador',
      'envase-lubrificante',
      'envase-recravacao',
      'envase-pasteurizador',
      'envase-interunidades',
    ],
  },
  {
    id: 'fermento',
    label: 'Fermento',
    subids: ['fermento'],
  },
  {
    id: 'fisico',
    label: 'Físico',
    subids: ['fisico-embalagem', 'fisico-materia-prima', 'fisico-quimicos'],
  },
  {
    id: 'microbiologia',
    label: 'Microbiologia',
    subids: [
      'microbiologia-estabilidade-micro',
      'microbiologia-estabilidade-envase',
      'microbiologia-resultados',
      'microbiologia-agua-enxague',
      'microbiologia-swab',
      'microbiologia-analise-microbiologia',
    ],
  },
  {
    id: 'processo-produtivo',
    label: 'Processo',
    subids: [
      'fermentacao',
      'filtracao',
      'brassagem',
      'maturacao',
      'desalcoolizacao',
      'captacao',
      'residuos',
      'ar-co2',
      'co2-beneficiado',
      'tratamento-efluentes',
    ],
  },
];

export default function DashboardPage() {
  const navigate = useNavigate();
  const { ctx } = useContexto();
  const periodo = { dataInicio: ctx.dataInicio ?? '', dataFim: ctx.dataFim ?? '' };
  const { kpis, processos, produtos, ensaios, carregando, erro } = useDashboard(periodo);
  const dadosPorTipo: Record<string, typeof processos> = { processos, produtos, ensaios };
  const [expandedCategories, setExpandedCategories] = useState<Record<string, boolean>>({});
  const [expandedMacros, setExpandedMacros] = useState<Record<string, boolean>>({});

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
    if (deltaPct == null) return { texto: '', cor: 'var(--clr-text-3)' };
    const positivo = invertido ? deltaPct < 0 : deltaPct > 0;
    const seta = deltaPct > 0 ? '▲' : deltaPct < 0 ? '▼' : '—';
    return {
      texto: `${seta} ${Math.abs(deltaPct)}% vs. período anterior`,
      cor: positivo ? 'var(--clr-success)' : 'var(--clr-danger)',
    };
  }

  // Prepara os macro grupos aglutinados a partir da lista plana de processos vinda da API
  const macroGruposAglutinados = MACRO_GRUPOS_CONFIG.map(grupo => {
    const subitens = processos.filter(p => grupo.subids.includes(String(p.id)));
    const amostras = subitens.reduce((s, i) => s + i.amostras, 0);
    const nc = subitens.reduce((s, i) => s + i.nc, 0);
    return {
      id: grupo.id,
      nome: grupo.label,
      amostras,
      nc,
      subitens
    };
  }).filter(g => g.subitens.length > 0 || g.nc > 0 || g.amostras > 0)
    .sort((a, b) => b.nc - a.nc);

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* KPIs reais */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '28px', flexWrap: 'wrap' }}>
        {kpis && [
          { label: 'AMOSTRAS ANALISADAS', value: kpis.amostras.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.amostras.deltaPct) },
          { label: 'ENSAIOS REALIZADOS', value: kpis.ensaios.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.ensaios.deltaPct) },
          { label: 'ENSAIOS INFORMATIVOS', value: kpis.informativos.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.informativos.deltaPct) },
          { label: 'NÃO CONFORME', value: kpis.naoConformidades.valor.toLocaleString('pt-BR'), delta: formatDelta(kpis.naoConformidades.deltaPct, true) },
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
          const isProcessos = cat.tipo === 'processos';
          const totalItens = isProcessos ? macroGruposAglutinados : (dadosPorTipo[cat.tipo] ?? []);
          const ncTotal = totalItens.reduce((s, i) => s + Number(i.nc), 0);
          const isCategoryExpanded = !!expandedCategories[cat.tipo];
          const visibleItens = isCategoryExpanded ? totalItens : totalItens.slice(0, 3);

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

              {/* Renderização de Processos (Estrutura de Árvore) */}
              {isProcessos && (visibleItens as typeof macroGruposAglutinados).map((macro, i) => {
                const isMacroExpanded = !!expandedMacros[macro.id];
                return (
                  <div key={macro.id} style={{ borderBottom: i < visibleItens.length - 1 ? '1px solid var(--clr-border)' : 'none' }}>
                    <div
                      onClick={() => {
                        setExpandedMacros(prev => ({ ...prev, [macro.id]: !prev[macro.id] }));
                      }}
                      style={{
                        padding: '14px 20px',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                        cursor: 'pointer', transition: 'background var(--t-fast)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-surface-2)')}
                      onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                    >
                      <div>
                        <div style={{ fontSize: '14px', fontWeight: 700, color: 'var(--clr-text)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                          <span>{isMacroExpanded ? '▼' : '▶'}</span>
                          <span>{macro.nome}</span>
                        </div>
                        <div style={{ fontSize: '12px', color: 'var(--clr-text-3)', marginTop: '2px', paddingLeft: '14px' }}>
                          {macro.amostras} amostras
                        </div>
                      </div>
                      <span style={{ minWidth: '28px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', background: macro.nc > 10 ? 'var(--clr-danger)' : macro.nc > 0 ? 'var(--clr-warning)' : 'var(--clr-text-3)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                        {macro.nc}
                      </span>
                    </div>

                    {isMacroExpanded && (
                      <div style={{ background: 'var(--clr-surface-2)', paddingLeft: '16px', borderTop: '1px dashed var(--clr-border)' }}>
                        {macro.subitens.map((sub, idx) => (
                          <div
                            key={String(sub.id)}
                            onClick={() => navigate(`/detalhe/processos/${sub.id}`)}
                            style={{
                              padding: '10px 20px',
                              borderBottom: idx < macro.subitens.length - 1 ? '1px solid var(--clr-border)' : 'none',
                              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                              cursor: 'pointer',
                            }}
                            onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-border)')}
                            onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                          >
                            <span style={{ fontSize: '13px', fontWeight: 500, color: 'var(--clr-text-2)' }}>{sub.nome}</span>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <span style={{ fontSize: '11px', color: 'var(--clr-text-3)' }}>{sub.amostras} amostras</span>
                              <span style={{ minWidth: '20px', textAlign: 'center', fontSize: '11px', fontWeight: 700, color: '#fff', background: sub.nc > 10 ? 'var(--clr-danger)' : sub.nc > 0 ? 'var(--clr-warning)' : 'var(--clr-text-3)', padding: '1px 6px', borderRadius: 'var(--r-full)' }}>
                                {sub.nc}
                              </span>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              {/* Renderização de Outras Categorias (Produtos e Ensaios planos) */}
              {!isProcessos && visibleItens.map((item, i) => (
                <div
                  key={String(item.id)}
                  onClick={() => navigate(`/detalhe/${cat.tipo}/${item.id}`)}
                  style={{
                    padding: '14px 20px',
                    borderBottom: i < visibleItens.length - 1 ? '1px solid var(--clr-border)' : 'none',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    cursor: 'pointer', transition: 'background var(--t-fast)',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'var(--clr-surface-2)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: 'var(--clr-text)' }}>{item.nome}</div>
                    <div style={{ fontSize: '12px', color: 'var(--clr-text-3)', marginTop: '2px' }}>{item.amostras} amostras</div>
                  </div>
                  <span style={{ minWidth: '28px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#fff', background: item.nc > 10 ? 'var(--clr-danger)' : item.nc > 0 ? 'var(--clr-warning)' : 'var(--clr-text-3)', padding: '2px 8px', borderRadius: 'var(--r-full)' }}>
                    {item.nc}
                  </span>
                </div>
              ))}

              {totalItens.length > 3 && (
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