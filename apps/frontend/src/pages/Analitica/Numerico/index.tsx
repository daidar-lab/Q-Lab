import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContexto } from '../../../contexts/ContextoProvider';
import { useAnalitica } from '../../../hooks/useAnalitica';
import { NumericoChart, type HistogramaBinInfo } from '../../../components/charts/NumericoChart';
import { getAmostraDetalhe, getAmostrasPorBin } from '../../../services/analitica.api';
import { AmostraDetalheDrawer } from '../../../components/amostra/AmostraDetalheDrawer';
import { BinAmostrasDrawer } from '../../../components/amostra/BinAmostrasDrawer';
import type { ContextoAnalise } from '@qlab/types';

export default function NumericoPage() {
    const { ctx } = useContexto();
    const navigate = useNavigate();
    const { rodar, dados, carregando, erro } = useAnalitica();

    // ── Estado: detalhe de amostra (ponto de série / shewhart) ───────────────
    const [amostraOpen, setAmostraOpen] = useState(false);
    const [amostraDetalhe, setAmostraDetalhe] = useState<unknown[] | null>(null);
    const [amostraCarregando, setAmostraCarregando] = useState(false);
    const [amostraErro, setAmostraErro] = useState<string | null>(null);
    const [amostraId, setAmostraId] = useState<string | null>(null);

    // ── Estado: amostras de bin do histograma (nível 1) ──────────────────────
    const [binOpen, setBinOpen] = useState(false);
    const [binAmostras, setBinAmostras] = useState<unknown[] | null>(null);
    const [binCarregando, setBinCarregando] = useState(false);
    const [binErro, setBinErro] = useState<string | null>(null);
    const [binRange, setBinRange] = useState<{ inicio: number; fim: number } | null>(null);

    useEffect(() => {
        if (ctx?.codEnsaio) {
            rodar(ctx as ContextoAnalise);
        }
    }, [ctx]);

    // ── Clique em ponto da série temporal ou Shewhart ────────────────────────
    async function handlePontoClick(info: { codAmostra?: string; codEnsaioAtual?: string }) {
        if (!info.codAmostra) return;

        // Usa ctx.codEnsaio como fallback caso o chart não saiba o cod_ensaio
        const codEnsaio = info.codEnsaioAtual ?? (ctx?.codEnsaio ? String(ctx.codEnsaio) : undefined);

        setAmostraOpen(true);
        setAmostraDetalhe(null);
        setAmostraErro(null);
        setAmostraCarregando(true);
        setAmostraId(info.codAmostra);

        try {
            const detalhe = await getAmostraDetalhe(info.codAmostra, codEnsaio);
            setAmostraDetalhe(detalhe);
        } catch (err: any) {
            setAmostraErro(err?.message ?? 'Erro ao carregar detalhe da amostra.');
        } finally {
            setAmostraCarregando(false);
        }
    }

    function fecharAmostra() {
        setAmostraOpen(false);
        setAmostraDetalhe(null);
        setAmostraErro(null);
        setAmostraId(null);
    }

    // ── Clique em barra do histograma (nível 1: lista de amostras do bin) ────
    async function handleHistogramaBinClick(info: HistogramaBinInfo) {
        if (!ctx?.codEnsaio) return;

        setBinOpen(true);
        setBinAmostras(null);
        setBinErro(null);
        setBinCarregando(true);
        setBinRange({ inicio: info.binInicio, fim: info.binFim });

        try {
            const amostras = await getAmostrasPorBin(ctx as ContextoAnalise, info.binInicio, info.binFim);
            setBinAmostras(amostras);
        } catch (err: any) {
            setBinErro(err?.message ?? 'Erro ao buscar amostras do intervalo.');
        } finally {
            setBinCarregando(false);
        }
    }

    function fecharBin() {
        setBinOpen(false);
        setBinAmostras(null);
        setBinErro(null);
        setBinRange(null);
    }

    // ── Clique em "Ver" dentro do BinAmostrasDrawer (nível 2: detalhe) ───────
    async function handleVerAmostraDoBin(codAmostra: string) {
        const codEnsaio = ctx?.codEnsaio ? String(ctx.codEnsaio) : undefined;

        setAmostraOpen(true);
        setAmostraDetalhe(null);
        setAmostraErro(null);
        setAmostraCarregando(true);
        setAmostraId(codAmostra);

        try {
            const detalhe = await getAmostraDetalhe(codAmostra, codEnsaio);
            setAmostraDetalhe(detalhe);
        } catch (err: any) {
            setAmostraErro(err?.message ?? 'Erro ao carregar detalhe da amostra.');
        } finally {
            setAmostraCarregando(false);
        }
    }

    if (!ctx?.codEnsaio) {
        return (
            <div style={{ padding: '24px', textAlign: 'center', fontFamily: 'sans-serif' }}>
                <h3 style={{ color: '#27272a', margin: '0 0 12px' }}>Nenhum contexto selecionado</h3>
                <p style={{ color: '#71717a', fontSize: '14px', margin: '0 0 16px' }}>
                    Por favor, configure o contexto de análise na página inicial antes de acessar os relatórios.
                </p>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '10px 16px',
                        background: '#18181b',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '8px',
                        fontWeight: 600,
                        cursor: 'pointer',
                    }}
                >
                    Ir para Início
                </button>
            </div>
        );
    }

    return (
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#18181b' }}>Ensaio Numérico</h2>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>Análise detalhada do ensaio</span>
                </div>
                <button
                    onClick={() => navigate('/')}
                    style={{
                        padding: '6px 12px',
                        background: '#fff',
                        border: '1px solid #e4e4e7',
                        color: '#27272a',
                        borderRadius: '6px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        fontSize: '13px',
                    }}
                >
                    Voltar
                </button>
            </div>

            {carregando && (
                <p style={{ textAlign: 'center', color: '#71717a', padding: '40px 0' }}>Carregando dados...</p>
            )}

            {erro && (
                <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                    {erro}
                </div>
            )}

            {!carregando && !erro && dados && (
                <NumericoChart
                    dados={dados}
                    onPontoClick={handlePontoClick}
                    onHistogramaBinClick={handleHistogramaBinClick}
                />
            )}

            {/* Nível 1: amostras do bin do histograma */}
            <BinAmostrasDrawer
                open={binOpen}
                onClose={fecharBin}
                range={binRange}
                amostras={binAmostras}
                carregando={binCarregando}
                erro={binErro}
                onVerAmostra={handleVerAmostraDoBin}
            />

            {/* Nível 2: detalhe de uma amostra específica (z=120 para ficar acima do BinDrawer z=110) */}
            <AmostraDetalheDrawer
                open={amostraOpen}
                onClose={fecharAmostra}
                amostraId={amostraId}
                amostra={amostraDetalhe}
                carregando={amostraCarregando}
                erro={amostraErro}
                zIndex={120}
            />
        </div>
    );
}
