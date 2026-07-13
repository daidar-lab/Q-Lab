// apps/frontend/src/pages/Busca/BuscaPage.tsx
//
// Tela de resultados do buscador geral.
// Lê ?q da URL, parseia com o catálogo em memória, executa a busca e exibe resultados.

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useContexto } from '../../contexts/ContextoProvider';
import { useCatalogo } from '../../hooks/useCatalogo';
import { parseSearchQuery } from '../../lib/search-parser';
import { fetchBuscaResultados, fetchBuscaAgregacoes } from '../../services/busca.api';
import type { SearchResultRow, AgregacoesBuscaResponse } from '../../services/busca.api';
import { SearchBar } from '../../components/busca/SearchBar';
import { EtiquetaRemovivel } from '../../components/busca/EtiquetaRemovivel';
import { SearchKpis } from '../../components/busca/SearchKpis';
import { ConformidadeChart } from '../../components/busca/ConformidadeChart';
import { EspecificacaoChart } from '../../components/busca/EspecificacaoChart';
import { TabelaResultados } from '../../components/busca/TabelaResultados';

function getMonthChunks(startStr: string, endStr: string, months = 3) {
  const chunks: { dataInicio: string; dataFim: string }[] = [];
  let current = new Date(startStr);
  const end = new Date(endStr);
  if (isNaN(current.getTime()) || isNaN(end.getTime()) || current > end) {
    return [{ dataInicio: startStr, dataFim: endStr }];
  }

  while (current <= end) {
    const chunkStart = current.toISOString().slice(0, 10);
    const chunkEndDate = new Date(current);
    chunkEndDate.setMonth(chunkEndDate.getMonth() + months);
    chunkEndDate.setDate(chunkEndDate.getDate() - 1);
    
    if (chunkEndDate >= end) {
      chunks.push({ dataInicio: chunkStart, dataFim: endStr });
      break;
    } else {
      chunks.push({ dataInicio: chunkStart, dataFim: chunkEndDate.toISOString().slice(0, 10) });
      current = new Date(chunkEndDate);
      current.setDate(current.getDate() + 1);
    }
  }
  return chunks;
}

export default function BuscaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { filialId, ctx } = useContexto();
  const { catalogo, loading: catalogoLoading } = useCatalogo(filialId);

  const [agregacoes, setAgregacoes] = useState<AgregacoesBuscaResponse | null>(null);
  const [rows, setRows]         = useState<SearchResultRow[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [buscandoMais, setBuscandoMais] = useState(false);
  const [progresso, setProgresso] = useState({ total: 0, concluidos: 0 });
  const [fadingOut, setFadingOut] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);
  const [offset, setOffset]     = useState(0);
  const [temMais, setTemMais]   = useState(false);
  const LIMIT = 5000;

  // Parse é síncrono e roda no cliente com o catálogo em memória
  const tokens = useMemo(() => {
    if (!catalogo || !q) return null;
    return parseSearchQuery(q, catalogo);
  }, [q, catalogo]);

  // Executa busca quando tokens mudam
  useEffect(() => {
    if (!tokens || filialId === null) return;

    const temFiltros =
      tokens.processos.length > 0 ||
      tokens.produtos.length  > 0 ||
      tokens.ensaios.length   > 0;

    if (!temFiltros) {
      setAgregacoes(null);
      setRows([]);
      setProgresso({ total: 0, concluidos: 0 });
      return;
    }

    setBuscando(true);
    setErro(null);
    setOffset(0);
    setProgresso({ total: 0, concluidos: 0 });

    let cancelled = false;
    const controller = new AbortController();

    const dataInicio = tokens.periodo.dataInicio ?? ctx.dataInicio ?? '';
    const dataFim    = tokens.periodo.dataFim    ?? ctx.dataFim    ?? '';

    if (!dataInicio || !dataFim) {
      setBuscando(false);
      return;
    }

    // 1. Chunking de Agregações (Background progresivo)
    const chunks = getMonthChunks(dataInicio, dataFim, 3);
    setProgresso({ total: chunks.length, concluidos: 0 });

    let aggAcc: AgregacoesBuscaResponse = {
      kpis: { totalResultados: 0, naoConformes: 0, taxaConformidade: 0, ensaiosIds: [], produtosIds: [] },
      graficoConformidade: [],
      pontosEspecificacao: []
    };

    const carregarChunks = async () => {
      for (const chunk of chunks) {
        if (cancelled) break;
        try {
          const res = await fetchBuscaAgregacoes({
            filialId, dataInicio: chunk.dataInicio, dataFim: chunk.dataFim,
            processos: tokens.processos, produtos: tokens.produtos, ensaios: tokens.ensaios,
            signal: controller.signal
          });
          
          if (cancelled) break;
          
          aggAcc = {
            kpis: {
              totalResultados: aggAcc.kpis.totalResultados + res.kpis.totalResultados,
              naoConformes: aggAcc.kpis.naoConformes + res.kpis.naoConformes,
              taxaConformidade: 0,
              ensaiosIds: [...new Set([...aggAcc.kpis.ensaiosIds, ...res.kpis.ensaiosIds])],
              produtosIds: [...new Set([...aggAcc.kpis.produtosIds, ...res.kpis.produtosIds])],
            },
            graficoConformidade: [...aggAcc.graficoConformidade, ...res.graficoConformidade],
            // Limita a 2000 pontos totais para evitar lentidão no frontend
            pontosEspecificacao: [...res.pontosEspecificacao, ...aggAcc.pontosEspecificacao].slice(0, 2000)
          };
          
          if (aggAcc.kpis.totalResultados > 0) {
            aggAcc.kpis.taxaConformidade = Math.round(((aggAcc.kpis.totalResultados - aggAcc.kpis.naoConformes) / aggAcc.kpis.totalResultados) * 1000) / 10;
          }

          setAgregacoes({ ...aggAcc });
          setProgresso(prev => ({ ...prev, concluidos: prev.concluidos + 1 }));
        } catch (err: any) {
          if (err.name === 'AbortError' || err.message?.includes('timeout') || cancelled) break;
          console.error('Erro nas agregações do chunk:', chunk, err);
          break;
        }
      }
    };
    
    carregarChunks();

    // 2. Busca Rápida da 1ª Página (Imediato)
    fetchBuscaResultados({
      filialId, dataInicio, dataFim,
      processos: tokens.processos, produtos: tokens.produtos, ensaios: tokens.ensaios,
      limit: LIMIT, offset: 0, signal: controller.signal
    }).then(data => { 
        if (cancelled) return;
        setRows(data); 
        setTemMais(data.length === LIMIT);
        setBuscando(false); 
      })
      .catch(err => {
        if (cancelled) return;
        setErro(err?.message ?? 'Erro ao buscar resultados.');
        setBuscando(false);
      });
      
    return () => {
      cancelled = true;
      controller.abort();
    };
  }, [tokens, filialId, ctx.dataInicio, ctx.dataFim]);

  // Esconde o aviso de sucesso com fade-out após 8 segundos
  useEffect(() => {
    if (progresso.total > 0 && progresso.concluidos === progresso.total) {
      setFadingOut(false);
      const timerFade = setTimeout(() => {
        setFadingOut(true);
      }, 7000); // Começa a sumir no segundo 7
      
      const timerClear = setTimeout(() => {
        setProgresso({ total: 0, concluidos: 0 });
        setFadingOut(false);
      }, 8000); // Remove do DOM no segundo 8
      
      return () => {
        clearTimeout(timerFade);
        clearTimeout(timerClear);
      };
    } else {
      setFadingOut(false);
    }
  }, [progresso]);

  const handleCarregarMais = () => {
    if (!tokens || filialId === null || buscandoMais) return;
    setBuscandoMais(true);
    const proxOffset = offset + LIMIT;
    
    const dataInicio = tokens.periodo.dataInicio ?? ctx.dataInicio ?? '';
    const dataFim    = tokens.periodo.dataFim    ?? ctx.dataFim    ?? '';

    fetchBuscaResultados({
      filialId, dataInicio, dataFim,
      processos: tokens.processos, produtos: tokens.produtos, ensaios: tokens.ensaios,
      limit: LIMIT, offset: proxOffset
    })
    .then(novosRows => {
      setRows(prev => [...prev, ...novosRows]);
      setOffset(proxOffset);
      setTemMais(novosRows.length === LIMIT);
      setBuscandoMais(false);
    })
    .catch(err => {
      console.error(err);
      setBuscandoMais(false);
    });
  };

  // Ensaios únicos para gráficos de especificação
  const ensaiosUnicos = useMemo(() => {
    if (!tokens || tokens.ensaios.length === 0 || !agregacoes) return [];
    const mapa = new Map<number, string>();
    for (const r of agregacoes.pontosEspecificacao) {
      if (!mapa.has(r.cod_ensaio)) mapa.set(r.cod_ensaio, r.ensaio);
    }
    return Array.from(mapa.entries());
  }, [agregacoes, tokens]);

  const temResultados = agregacoes && agregacoes.kpis.totalResultados > 0;
  const etiquetasVisiveis = tokens?.etiquetas.filter(e => e.tipo !== 'desconhecido') ?? [];

  return (
    <div style={{ padding: '28px 24px', maxWidth: '1200px', margin: '0 auto' }}>

      {/* ── Campo de busca pré-preenchido ──────────────────────────────── */}
      <div style={{ marginBottom: '20px' }}>
        <SearchBar
          catalogo={catalogo}
          initialValue={q}
          onSubmit={valor => navigate(`/busca?q=${encodeURIComponent(valor)}`)}
        />
      </div>

      {/* ── Etiquetas ativas ─────────────────────────────────────────────── */}
      {etiquetasVisiveis.length > 0 && (
        <div
          role="group"
          aria-label="Filtros ativos"
          style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginBottom: '20px' }}
        >
          {etiquetasVisiveis.map(etiqueta => (
            <EtiquetaRemovivel
              key={`${etiqueta.tipo}-${etiqueta.valor}`}
              etiqueta={etiqueta}
              qAtual={q}
            />
          ))}
        </div>
      )}

      {/* ── Termos não reconhecidos ─────────────────────────────────────── */}
      {(tokens?.rawTerms ?? []).length > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '10px 16px',
          background: '#FFFBEB',
          border: '1px solid #FDE68A',
          borderRadius: 'var(--r-md)',
          fontSize: '13px',
          color: '#92400E',
        }}>
          Não foi possível reconhecer: <strong>{tokens!.rawTerms.join(', ')}</strong>.
          {' '}Verifique a ortografia ou escolha uma sugestão do dropdown.
        </div>
      )}

      {/* ── Estados de carregamento ─────────────────────────────────────── */}
      {(catalogoLoading || buscando) && (
        <div style={{ textAlign: 'center', padding: '40px', color: 'var(--clr-text-3)' }}>
          {catalogoLoading ? 'Carregando catálogo…' : 'Buscando resultados…'}
        </div>
      )}

      {erro && (
        <div style={{
          padding: '12px 16px',
          background: 'var(--clr-danger-bg)',
          color: 'var(--clr-danger)',
          borderRadius: 'var(--r-md)',
          marginBottom: '20px',
        }}>
          {erro}
        </div>
      )}

      {progresso.total > 0 && (
        <div style={{
          marginBottom: '16px',
          padding: '12px 16px',
          background: progresso.concluidos < progresso.total ? 'var(--clr-surface)' : '#ECFDF5',
          border: '1px solid',
          borderColor: progresso.concluidos < progresso.total ? 'var(--clr-border)' : '#10B981',
          borderRadius: 'var(--r-md)',
          fontSize: '13px',
          color: progresso.concluidos < progresso.total ? 'var(--clr-text-2)' : '#065F46',
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          opacity: fadingOut ? 0 : 1,
          transition: 'opacity 1s ease',
        }}>
          {progresso.concluidos < progresso.total ? (
            <>
              <span style={{ 
                display: 'inline-block',
                width: '14px', height: '14px', 
                border: '2px solid var(--clr-primary)', 
                borderTopColor: 'transparent', 
                borderRadius: '50%', 
                animation: 'spin 1s linear infinite' 
              }} />
              <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
              <span>Calculando KPIs e Gráficos... ({progresso.concluidos} de {progresso.total} períodos analisados)</span>
            </>
          ) : (
            <>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
              <span style={{ fontWeight: 600 }}>Análise finalizada! Todos os {progresso.total} períodos foram processados.</span>
            </>
          )}
        </div>
      )}

      {/* ── Estado vazio ─────────────────────────────────────────────────── */}
      {!buscando && !catalogoLoading && !erro && tokens && !temResultados &&
       etiquetasVisiveis.length > 0 && (
        <div style={{
          textAlign: 'center',
          padding: '60px 24px',
          color: 'var(--clr-text-3)',
          fontSize: '14px',
        }}>
          Nenhum resultado encontrado para os filtros aplicados no período selecionado.
        </div>
      )}

      {/* ── Resultados ───────────────────────────────────────────────────── */}
      {!buscando && temResultados && tokens && agregacoes && (
        <>
          <SearchKpis 
            agregacoes={agregacoes.kpis} 
            tokens={tokens} 
            carregando={progresso.total > 0 && progresso.concluidos < progresso.total} 
          />
          <ConformidadeChart dados={agregacoes.graficoConformidade} />

          {ensaiosUnicos.map(([codEnsaio, nomeEnsaio]) => (
            <EspecificacaoChart
              key={codEnsaio}
              rows={agregacoes.pontosEspecificacao.filter(r => r.cod_ensaio === codEnsaio)}
              nomeEnsaio={nomeEnsaio}
            />
          ))}

          <TabelaResultados rows={rows} />
          
          {temMais && (
            <div style={{ textAlign: 'center', marginTop: '20px' }}>
              <button
                onClick={handleCarregarMais}
                disabled={buscandoMais}
                style={{
                  padding: '10px 24px',
                  background: 'var(--clr-surface)',
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--r-md)',
                  color: 'var(--clr-text-2)',
                  fontWeight: 600,
                  cursor: buscandoMais ? 'default' : 'pointer',
                  opacity: buscandoMais ? 0.7 : 1
                }}
              >
                {buscandoMais ? 'Carregando...' : 'Carregar mais'}
              </button>
            </div>
          )}
        </>
      )}

      {/* ── Estado inicial — sem query ───────────────────────────────────── */}
      {!q && !buscando && (
        <div style={{
          textAlign: 'center',
          padding: '80px 24px',
          color: 'var(--clr-text-3)',
        }}>
          <div style={{ fontSize: '40px', marginBottom: '16px' }}>🔍</div>
          <div style={{ fontSize: '16px', fontWeight: 600, color: 'var(--clr-text-2)', marginBottom: '8px' }}>
            Busca analítica
          </div>
          <div style={{ fontSize: '14px', maxWidth: '400px', margin: '0 auto', lineHeight: 1.6 }}>
            Digite um processo, produto, ensaio ou período no campo acima.
            <br />
            Ex.: <em>fermentação, pH, últimos 30 dias</em>
          </div>
        </div>
      )}
    </div>
  );
}
