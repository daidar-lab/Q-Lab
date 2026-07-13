// apps/frontend/src/pages/Busca/BuscaPage.tsx
//
// Tela de resultados do buscador geral.
// Lê ?q da URL, parseia com o catálogo em memória, executa a busca e exibe resultados.

import { useEffect, useState, useMemo } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useContexto } from '../../contexts/ContextoProvider';
import { useCatalogo } from '../../hooks/useCatalogo';
import { parseSearchQuery } from '../../lib/search-parser';
import { fetchBuscaResultados } from '../../services/busca.api';
import type { SearchResultRow } from '../../services/busca.api';
import { SearchBar } from '../../components/busca/SearchBar';
import { EtiquetaRemovivel } from '../../components/busca/EtiquetaRemovivel';
import { SearchKpis } from '../../components/busca/SearchKpis';
import { ConformidadeChart } from '../../components/busca/ConformidadeChart';
import { EspecificacaoChart } from '../../components/busca/EspecificacaoChart';
import { TabelaResultados } from '../../components/busca/TabelaResultados';

export default function BuscaPage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const q = searchParams.get('q') ?? '';

  const { filialId, ctx } = useContexto();
  const { catalogo, loading: catalogoLoading } = useCatalogo(filialId);

  const [rows, setRows]         = useState<SearchResultRow[]>([]);
  const [buscando, setBuscando] = useState(false);
  const [erro, setErro]         = useState<string | null>(null);

  // Parse é síncrono e roda no cliente com o catálogo em memória
  const tokens = useMemo(() => {
    if (!catalogo || !q) return null;
    return parseSearchQuery(q, catalogo);
  }, [q, catalogo]);

  // Período ativo do contexto global
  const dataInicio = tokens?.periodo.dataInicio ?? ctx.dataInicio ?? '';
  const dataFim    = tokens?.periodo.dataFim    ?? ctx.dataFim    ?? '';

  // Executa busca quando tokens mudam
  useEffect(() => {
    if (!tokens || filialId === null) return;

    const temFiltros =
      tokens.processos.length > 0 ||
      tokens.produtos.length  > 0 ||
      tokens.ensaios.length   > 0;

    if (!temFiltros) {
      setRows([]);
      return;
    }

    setBuscando(true);
    setErro(null);

    fetchBuscaResultados({
      filialId,
      dataInicio,
      dataFim,
      processos: tokens.processos,
      produtos:  tokens.produtos,
      ensaios:   tokens.ensaios,
    })
      .then(data => { setRows(data); setBuscando(false); })
      .catch(err => {
        setErro(err?.message ?? 'Erro ao buscar resultados.');
        setBuscando(false);
      });
  }, [tokens, filialId, dataInicio, dataFim]);

  // Ensaios únicos para gráficos de especificação
  const ensaiosUnicos = useMemo(() => {
    if (!tokens || tokens.ensaios.length === 0) return [];
    const mapa = new Map<number, string>();
    for (const r of rows) {
      if (!mapa.has(r.cod_ensaio)) mapa.set(r.cod_ensaio, r.ensaio);
    }
    return Array.from(mapa.entries());
  }, [rows, tokens]);

  const temResultados = rows.length > 0;
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
          marginBottom: '16px',
          fontSize: '13px',
        }}>
          {erro}
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
      {!buscando && temResultados && tokens && (
        <>
          <SearchKpis rows={rows} tokens={tokens} />
          <ConformidadeChart rows={rows} periodo={tokens.periodo} />

          {ensaiosUnicos.map(([codEnsaio, nomeEnsaio]) => (
            <EspecificacaoChart
              key={codEnsaio}
              rows={rows.filter(r => r.cod_ensaio === codEnsaio)}
              nomeEnsaio={nomeEnsaio}
            />
          ))}

          <TabelaResultados rows={rows} />
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
