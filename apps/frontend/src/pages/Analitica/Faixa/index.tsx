import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useContexto } from '../../../contexts/ContextoProvider';
import { useAnalitica } from '../../../hooks/useAnalitica';
import { useExportPDF } from '../../../hooks/useExport';
import { FaixaChart } from '../../../components/charts/FaixaChart';
import type { ContextoAnalise } from '@qlab/types';

export default function FaixaPage() {
    const { ctx } = useContexto();
    const navigate = useNavigate();
    const { rodar, dados, carregando, erro } = useAnalitica();

    useEffect(() => {
        if (ctx?.codEnsaio) {
            rodar(ctx as ContextoAnalise);
        }
    }, [ctx]);

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

    const { exportar, exportando } = useExportPDF('faixa');

    return (
        <div style={{ padding: '16px', maxWidth: '600px', margin: '0 auto', fontFamily: 'sans-serif' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <div>
                    <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700, color: '#18181b' }}>Ensaio de Faixa</h2>
                    <span style={{ fontSize: '12px', color: '#71717a' }}>Análise detalhada do ensaio</span>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                        onClick={() => {
                            const anyCtx = ctx as any;
                            exportar({
                                id: anyCtx?.id || ctx?.codCentroCusto,
                                codEnsaio: ctx?.codEnsaio,
                                ensaioNome: anyCtx?.ensaioNome || 'Ensaio',
                                lie: anyCtx?.lie,
                                lse: anyCtx?.lse,
                                codProdutos: anyCtx?.codProdutos || (ctx?.codProduto ? [ctx.codProduto] : []),
                                filialId: ctx?.filialId,
                                dataInicio: ctx?.dataInicio,
                                dataFim: ctx?.dataFim,
                                filialNome: anyCtx?.filialLabel || 'Filial Q/Lab',
                                processoNome: anyCtx?.processoNome || 'Processo',
                                operacao: anyCtx?.operacao
                            });
                        }}
                        disabled={exportando}
                        style={{
                            padding: '6px 12px',
                            background: 'var(--clr-primary)',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '6px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            fontSize: '13px',
                            opacity: exportando ? 0.7 : 1
                        }}
                    >
                        {exportando ? 'Gerando...' : 'Exportar PDF'}
                    </button>
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
            </div>

            {carregando && (
                <p style={{ textAlign: 'center', color: '#71717a', padding: '40px 0' }}>Carregando dados...</p>
            )}

            {erro && (
                <div style={{ color: '#dc2626', background: '#fef2f2', padding: '12px', borderRadius: '8px', fontSize: '14px' }}>
                    {erro}
                </div>
            )}

            {!carregando && !erro && dados && <FaixaChart dados={dados} />}
        </div>
    );
}
