import { useState, useEffect } from 'react';
import { detalheApi } from '../../services/detalhe.api';

interface EnsaioInformativo {
  cod_ensaio: number;
  ensaio: string;
  total_realizado: number;
}

interface CentroCusto {
  cod_centro_de_custo: number;
  centro_de_custo: string;
  total_realizado: number;
}

interface ProdutoInformativo {
  cod_produto: number;
  produto: string;
  ultimo_resultado_texto: string;
  total_realizado: number;
}

interface AmostraInformativo {
  cod_amostra: number;
  numero_de_controle: string;
  data_resultado: string;
  hora_resultado: string;
  ultimo_resultado_texto: string;
}

import { AmostraDetalheDrawer } from '../amostra/AmostraDetalheDrawer';

interface InformativosDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  dataInicio: string;
  dataFim: string;
  filialId: number;
}

type Nivel = 1 | 2 | 3 | 4;

export default function InformativosDrawer({
  isOpen,
  onClose,
  dataInicio,
  dataFim,
  filialId,
}: InformativosDrawerProps) {
  const [nivel, setNivel] = useState<Nivel>(1);
  const [carregando, setCarregando] = useState(false);

  const [ensaios, setEnsaios] = useState<EnsaioInformativo[]>([]);
  const [centros, setCentros] = useState<CentroCusto[]>([]);
  const [produtos, setProdutos] = useState<ProdutoInformativo[]>([]);

  const [ensaioSelecionado, setEnsaioSelecionado] = useState<EnsaioInformativo | null>(null);
  const [centroSelecionado, setCentroSelecionado] = useState<CentroCusto | null>(null);
  const [produtoSelecionado, setProdutoSelecionado] = useState<ProdutoInformativo | null>(null);

  const [amostras, setAmostras] = useState<AmostraInformativo[]>([]);
  const [amostraDetalheId, setAmostraDetalheId] = useState<string | null>(null);

  // Nível 1 — carrega ao abrir
  useEffect(() => {
    if (!isOpen) return;
    setNivel(1);
    setEnsaioSelecionado(null);
    setCentroSelecionado(null);
    setProdutoSelecionado(null);
    setCarregando(true);
    detalheApi
      .getListaEnsaiosInformativos(dataInicio, dataFim, filialId)
      .then(setEnsaios)
      .finally(() => setCarregando(false));
  }, [isOpen, dataInicio, dataFim]);

  // Nível 2 — ao selecionar ensaio
  function selecionarEnsaio(ensaio: EnsaioInformativo) {
    setEnsaioSelecionado(ensaio);
    setNivel(2);
    setCarregando(true);
    detalheApi
      .getCentrosCustoInformativos(ensaio.cod_ensaio, dataInicio, dataFim, filialId)
      .then(setCentros)
      .finally(() => setCarregando(false));
  }

  // Nível 3 — ao selecionar centro de custo
  function selecionarCentro(centro: CentroCusto) {
    if (!ensaioSelecionado) return;
    setCentroSelecionado(centro);
    setNivel(3);
    setCarregando(true);
    detalheApi
      .getProdutosInformativos(
        ensaioSelecionado.cod_ensaio,
        centro.cod_centro_de_custo,
        dataInicio,
        dataFim,
        filialId,
      )
      .then(setProdutos)
      .finally(() => setCarregando(false));
  }

  // Nível 4 — ao selecionar produto
  function selecionarProduto(produto: ProdutoInformativo) {
    if (!ensaioSelecionado || !centroSelecionado) return;
    setProdutoSelecionado(produto);
    setNivel(4);
    setCarregando(true);
    detalheApi
      .getAmostrasInformativos(
        ensaioSelecionado.cod_ensaio,
        centroSelecionado.cod_centro_de_custo,
        produto.cod_produto,
        produto.ultimo_resultado_texto,
        dataInicio,
        dataFim,
        filialId,
      )
      .then(setAmostras)
      .finally(() => setCarregando(false));
  }

  function voltarNivel() {
    if (nivel === 4) {
      setNivel(3);
      setProdutoSelecionado(null);
    } else if (nivel === 3) {
      setNivel(2);
      setCentroSelecionado(null);
    } else if (nivel === 2) {
      setNivel(1);
      setEnsaioSelecionado(null);
    }
  }

  if (!isOpen) return null;

  // ── Breadcrumb ────────────────────────────────────────────────────────────
  const breadcrumb = [
    {
      label: 'Ensaios Informativos',
      onClick:
        nivel > 1
          ? () => {
              setNivel(1);
              setEnsaioSelecionado(null);
              setCentroSelecionado(null);
              setProdutoSelecionado(null);
            }
          : undefined,
    },
    ensaioSelecionado
      ? {
          label: ensaioSelecionado.ensaio,
          onClick:
            nivel > 2
              ? () => {
                  setNivel(2);
                  setCentroSelecionado(null);
                  setProdutoSelecionado(null);
                }
              : undefined,
        }
      : null,
    centroSelecionado
      ? { 
          label: centroSelecionado.centro_de_custo, 
          onClick:
            nivel > 3
              ? () => {
                  setNivel(3);
                  setProdutoSelecionado(null);
                }
              : undefined,
        }
      : null,
    produtoSelecionado
      ? { label: produtoSelecionado.produto, onClick: undefined }
      : null,
  ].filter(Boolean) as { label: string; onClick?: () => void }[];

  return (
    <>
      {/* Overlay */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.45)',
          backdropFilter: 'blur(4px)',
          zIndex: 999,
        }}
      />

      {/* Modal */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: '560px',
          maxHeight: '85vh',
          background: 'var(--clr-surface)',
          border: '1px solid var(--clr-border)',
          borderRadius: 'var(--r-lg)',
          boxShadow: '0 16px 48px rgba(0,0,0,0.12)',
          zIndex: 1000,
          display: 'flex',
          flexDirection: 'column',
          animation: 'fadeInUp 0.2s ease-out',
        }}
      >
        {/* Header */}
        <div
          style={{
            padding: '16px 24px',
            borderBottom: '1px solid var(--clr-border)',
            background: 'var(--clr-background)',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-start',
            flexShrink: 0,
          }}
        >
          <div>
            <h2
              style={{
                margin: 0,
                fontSize: '16px',
                fontWeight: 700,
                color: 'var(--clr-text)',
              }}
            >
              Ensaios Informativos
            </h2>
            <p
              style={{
                margin: '2px 0 0',
                fontSize: '12px',
                color: 'var(--clr-text-3)',
              }}
            >
              Análises sem avaliação de conformidade
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              fontSize: '22px',
              cursor: 'pointer',
              color: 'var(--clr-text-2)',
              padding: '2px 8px',
              borderRadius: 'var(--r-md)',
              lineHeight: 1,
            }}
          >
            ×
          </button>
        </div>

        {/* Breadcrumb + voltar */}
        {nivel > 1 && (
          <div
            style={{
              padding: '10px 24px',
              borderBottom: '1px solid var(--clr-border)',
              display: 'flex',
              alignItems: 'center',
              gap: '6px',
              flexShrink: 0,
              flexWrap: 'wrap',
            }}
          >
            <button
              onClick={voltarNivel}
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                padding: '2px 6px',
                borderRadius: 'var(--r-sm)',
                fontSize: '12px',
                color: 'var(--clr-primary)',
                fontWeight: 600,
              }}
            >
              ← Voltar
            </button>
            <span style={{ color: 'var(--clr-border)', fontSize: '12px' }}>|</span>
            {breadcrumb.map((item, i) => (
              <span key={i} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                {i > 0 && (
                  <span style={{ color: 'var(--clr-text-3)', fontSize: '11px' }}>›</span>
                )}
                <span
                  onClick={item.onClick}
                  style={{
                    fontSize: '12px',
                    color: item.onClick ? 'var(--clr-primary)' : 'var(--clr-text)',
                    fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                    cursor: item.onClick ? 'pointer' : 'default',
                    textDecoration: item.onClick ? 'underline' : 'none',
                  }}
                >
                  {item.label}
                </span>
              </span>
            ))}
          </div>
        )}

        {/* Body scrollável */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '16px 24px' }}>
          {carregando && (
            <div
              style={{
                textAlign: 'center',
                padding: '40px 0',
                color: 'var(--clr-text-3)',
                fontSize: '14px',
              }}
            >
              Carregando…
            </div>
          )}

          {/* Nível 1 — lista de ensaios */}
          {!carregando && nivel === 1 && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--clr-text-3)' }}>
                {ensaios.length} ensaio{ensaios.length !== 1 ? 's' : ''} registrado
                {ensaios.length !== 1 ? 's' : ''} no período
              </p>
              {ensaios.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--clr-text-3)',
                    fontSize: '13px',
                  }}
                >
                  Nenhum ensaio informativo no período selecionado.
                </div>
              )}
              {ensaios.map(e => (
                <button
                  key={e.cod_ensaio}
                  onClick={() => selecionarEnsaio(e)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    background: 'var(--clr-background)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--clr-surface-2)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'var(--clr-background)')}
                >
                  <span
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--clr-text)' }}
                  >
                    {e.ensaio}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--clr-text-3)',
                        background: 'var(--clr-surface)',
                        border: '1px solid var(--clr-border)',
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                      }}
                    >
                      {Number(e.total_realizado).toLocaleString('pt-BR')} realizados
                    </span>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '14px' }}>›</span>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Nível 2 — centros de custo */}
          {!carregando && nivel === 2 && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--clr-text-3)' }}>
                {centros.length} centro{centros.length !== 1 ? 's' : ''} de custo no período
              </p>
              {centros.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--clr-text-3)',
                    fontSize: '13px',
                  }}
                >
                  Nenhum centro de custo encontrado para este ensaio.
                </div>
              )}
              {centros.map(c => (
                <button
                  key={c.cod_centro_de_custo}
                  onClick={() => selecionarCentro(c)}
                  style={{
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    background: 'var(--clr-background)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s',
                  }}
                  onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--clr-surface-2)')}
                  onMouseLeave={ev => (ev.currentTarget.style.background = 'var(--clr-background)')}
                >
                  <span
                    style={{ fontSize: '14px', fontWeight: 600, color: 'var(--clr-text)' }}
                  >
                    {c.centro_de_custo}
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span
                      style={{
                        fontSize: '12px',
                        color: 'var(--clr-text-3)',
                        background: 'var(--clr-surface)',
                        border: '1px solid var(--clr-border)',
                        padding: '2px 8px',
                        borderRadius: 'var(--r-full)',
                      }}
                    >
                      {Number(c.total_realizado).toLocaleString('pt-BR')}
                    </span>
                    <span style={{ color: 'var(--clr-text-3)', fontSize: '14px' }}>›</span>
                  </div>
                </button>
              ))}
            </>
          )}

          {/* Nível 3 — produtos */}
          {!carregando && nivel === 3 && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--clr-text-3)' }}>
                {produtos.length} produto{produtos.length !== 1 ? 's' : ''} encontrado
                {produtos.length !== 1 ? 's' : ''}
              </p>
              {produtos.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--clr-text-3)',
                    fontSize: '13px',
                  }}
                >
                  Nenhum produto encontrado para este centro de custo.
                </div>
              )}
              <div
                style={{
                  border: '1px solid var(--clr-border)',
                  borderRadius: 'var(--r-md)',
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '1fr auto auto',
                    padding: '8px 16px',
                    background: 'var(--clr-background)',
                    borderBottom: '1px solid var(--clr-border)',
                    fontSize: '11px',
                    fontWeight: 600,
                    color: 'var(--clr-text-3)',
                    textTransform: 'uppercase',
                    letterSpacing: '0.05em',
                  }}
                >
                  <span>Produto</span>
                  <span style={{ textAlign: 'center', paddingRight: '16px' }}>Resultado</span>
                  <span style={{ textAlign: 'right' }}>Qtd</span>
                </div>
                {produtos.map((p, i) => (
                  <div
                    key={`${p.cod_produto}-${p.ultimo_resultado_texto}-${i}`}
                    onClick={() => selecionarProduto(p)}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '1fr auto auto',
                      padding: '12px 16px',
                      borderBottom:
                        i < produtos.length - 1 ? '1px solid var(--clr-border)' : 'none',
                      background:
                        i % 2 === 0 ? 'var(--clr-surface)' : 'var(--clr-background)',
                      alignItems: 'center',
                      cursor: 'pointer',
                    }}
                    onMouseEnter={ev => (ev.currentTarget.style.background = 'var(--clr-surface-2)')}
                    onMouseLeave={ev => (ev.currentTarget.style.background = i % 2 === 0 ? 'var(--clr-surface)' : 'var(--clr-background)')}
                  >
                    <span
                      style={{ fontSize: '13px', fontWeight: 500, color: 'var(--clr-text)' }}
                    >
                      {p.produto}
                    </span>
                    <span
                      style={{
                        fontSize: '12px',
                        fontWeight: 600,
                        padding: '2px 10px',
                        marginRight: '16px',
                        borderRadius: 'var(--r-full)',
                        background: 'var(--clr-surface-2)',
                        border: '1px solid var(--clr-border)',
                        color: 'var(--clr-text-2)',
                        whiteSpace: 'nowrap',
                      }}
                    >
                      {p.ultimo_resultado_texto}
                    </span>
                    <span
                      style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: 'var(--clr-text)',
                        textAlign: 'right',
                      }}
                    >
                      {Number(p.total_realizado).toLocaleString('pt-BR')}
                    </span>
                  </div>
                ))}
              </div>
            </>
          )}

          {/* Nível 4 — amostras */}
          {!carregando && nivel === 4 && (
            <>
              <p style={{ margin: '0 0 12px', fontSize: '12px', color: 'var(--clr-text-3)' }}>
                {amostras.length} amostra{amostras.length !== 1 ? 's' : ''} encontrada
                {amostras.length !== 1 ? 's' : ''}
              </p>
              {amostras.length === 0 && (
                <div
                  style={{
                    textAlign: 'center',
                    padding: '40px 0',
                    color: 'var(--clr-text-3)',
                    fontSize: '13px',
                  }}
                >
                  Nenhuma amostra encontrada.
                </div>
              )}
              {amostras.map(amostra => (
                <button
                  key={amostra.cod_amostra}
                  onClick={() => setAmostraDetalheId(String(amostra.cod_amostra))}
                  style={{
                    width: '100%',
                    display: 'flex',
                    flexDirection: 'column',
                    padding: '12px 16px',
                    marginBottom: '8px',
                    background: 'var(--clr-background)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--r-md)',
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'background 0.15s, border-color 0.15s',
                  }}
                  onMouseEnter={ev => {
                    ev.currentTarget.style.background = 'var(--clr-surface-2)';
                    ev.currentTarget.style.borderColor = 'var(--clr-primary)';
                  }}
                  onMouseLeave={ev => {
                    ev.currentTarget.style.background = 'var(--clr-background)';
                    ev.currentTarget.style.borderColor = 'var(--clr-border)';
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', width: '100%', marginBottom: '4px' }}>
                    <span style={{ fontSize: '13px', fontWeight: 600, color: 'var(--clr-text)' }}>
                      #{amostra.numero_de_controle}
                    </span>
                    <span style={{ fontSize: '12px', color: 'var(--clr-text-3)' }}>
                      {new Date(amostra.data_resultado).toLocaleDateString('pt-BR', { timeZone: 'UTC' })} {amostra.hora_resultado}
                    </span>
                  </div>
                  <div style={{ fontSize: '12px', color: 'var(--clr-text-2)' }}>
                    Resultado: <strong style={{ color: 'var(--clr-text)' }}>{amostra.ultimo_resultado_texto || 'Sem resultado'}</strong>
                  </div>
                </button>
              ))}
            </>
          )}
        </div>
      </div>

      <AmostraDetalheDrawer 
        open={!!amostraDetalheId} 
        onClose={() => setAmostraDetalheId(null)} 
        codAmostra={amostraDetalheId} 
        codEnsaioAtual={ensaioSelecionado ? String(ensaioSelecionado.cod_ensaio) : undefined}
      />

      <style>{`
        @keyframes fadeInUp {
          from { transform: translate(-50%, -45%); opacity: 0; }
          to   { transform: translate(-50%, -50%); opacity: 1; }
        }
      `}</style>
    </>
  );
}
