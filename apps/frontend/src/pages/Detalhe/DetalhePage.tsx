import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useContexto } from '../../contexts/ContextoProvider';
import { detalheApi } from '../../services/detalhe.api';
import { macroProcessoApi } from '../../services/macroProcesso.api';
import SerieConformidade from '../../components/detalhe/SerieConformidade';
import FaixaEspecificacao from '../../components/detalhe/FaixaEspecificacao';
import FaixaModal from '../../components/FaixasExplosao/FaixaModal';
import SelecionarCentroCustoModal from '../../components/FaixasExplosao/SelecionarCentroCustoModal';
import SelecionarOperacaoModal from '../../components/FaixasExplosao/SelecionarOperacaoModal';
import SelecionarBemModal from '../../components/FaixasExplosao/SelecionarBemModal';
import ResumoIADetalhe from '../../components/detalhe/ResumoIADetalhe';
import styles from './DetalhePage.module.css';
import { useExportPDF } from '../../hooks/useExport';


export default function DetalhePage() {
    const { tipo, id, origem, natureza } = useParams();
    const tipoNormalizado = tipo?.toLowerCase() ?? '';
    const navigate = useNavigate();
    const { ctx, filialId, filialLabel } = useContexto();
    const dataInicio = ctx.dataInicio ?? '';
    const dataFim = ctx.dataFim ?? '';

    const [dados, setDados] = useState<any>(null);
    const [carregando, setCarregando] = useState(true);
    const [resumoIA, setResumoIA] = useState<{ texto: string; destaques?: any[] } | null>(null);
    const [carregandoIA, setCarregandoIA] = useState(false);
    const [faixaSelecionadaObjeto, setFaixaSelecionadaObjeto] = useState<any>(null);
    const [faixaAtiva, setFaixaAtiva] = useState<{ lie: number; lse: number } | null>(null);
    const [prefixoLcq, setPrefixoLcq] = useState<string | null>(null);

    // Modal states
    const [modalCentroCustoAberto, setModalCentroCustoAberto] = useState(false);
    const [modalOperacaoAberto, setModalOperacaoAberto] = useState(false);
    const [modalBemAberto, setModalBemAberto] = useState(false);
    const [modalFaixaAberto, setModalFaixaAberto] = useState(false);
    const [centroCustoResolvido, setCentroCustoResolvido] = useState<{ id: number; nome: string } | null>(null);
    const [operacaoResolvida, setOperacaoResolvida] = useState<string | null>(null);
    const [bemResolvido, setBemResolvido] = useState<string | null>(null);
    const [carregandoCentroCusto, setCarregandoCentroCusto] = useState(false);

    const isBrassagem =
        (tipoNormalizado === 'processos' || tipoNormalizado === 'processo') &&
        String(id).toLowerCase() === 'brassagem';

    useEffect(() => {
        if (filialId === null) {
            setCarregando(false);
            return;
        }
        setCarregando(true);
        if (origem && natureza) {
            // macroProcessoApi.getDetalhe (Grupo B / CIP / Processo) usa cod_filial via body no controller ou query, mas no monorepo
            // a gente repassa cod_filial caso a API venha a suportar
            macroProcessoApi.getDetalhe(origem, natureza as 'produto' | 'processo', dataInicio, dataFim)
                .then((res) => {
                    setDados(res.data);
                })
                .finally(() => setCarregando(false));
        } else if (tipo && id) {
            detalheApi.getDetalhe(tipo, id, dataInicio, dataFim, filialId)
                .then(setDados)
                .finally(() => setCarregando(false));
        } else {
            setCarregando(false);
        }
    }, [tipo, id, origem, natureza, dataInicio, dataFim, filialId]);


    useEffect(() => {
        setResumoIA(null);
        if (!dados || filialId === null) return;

        const tipoParam = origem ? 'processo' : (tipo ?? '');
        const idParam = origem ?? id ?? '';

        setCarregandoIA(true);
        detalheApi
            .getResumoIA(tipoParam, idParam, dataInicio, dataFim, filialId)
            .then((res) => setResumoIA(res))
            .catch(() => { /* silencia — resumo IA é não-crítico */ })
            .finally(() => setCarregandoIA(false));
    }, [dados, tipo, id, origem, dataInicio, dataFim, filialId]);

    useEffect(() => {
        setModalCentroCustoAberto(false);
        setModalOperacaoAberto(false);
        setModalBemAberto(false);
        setModalFaixaAberto(false);
        setFaixaSelecionadaObjeto(null);
        setFaixaAtiva(null);
        setCentroCustoResolvido(null);
        setOperacaoResolvida(null);
        setBemResolvido(null);
        setCarregandoCentroCusto(false);
        setPrefixoLcq(null);
    }, [tipo, id, origem, natureza, dataInicio, dataFim]);

    async function handleClickFaixa(faixa: any) {
        setFaixaSelecionadaObjeto(faixa);
        setFaixaAtiva(null);
        setCentroCustoResolvido(null);
        setOperacaoResolvida(null);
        setBemResolvido(null);

        if (tipoNormalizado === 'ensaio' || tipoNormalizado === 'ensaios') {
            setModalCentroCustoAberto(true);
        } else if (tipoNormalizado === 'produto' || tipoNormalizado === 'produtos') {
            setCarregandoCentroCusto(true);
            try {
                const centros = await detalheApi.getCentrosCustoPorProdutoEEnsaio(String(id), String(faixa.cod_ensaio), dataInicio, dataFim, filialId);
                if (centros && centros.length === 1) {
                    setCentroCustoResolvido({ id: centros[0].cod_centro_de_custo, nome: centros[0].centro_de_custo });
                    setModalFaixaAberto(true);
                } else if (centros && centros.length > 1) {
                    setModalCentroCustoAberto(true);
                } else {
                    setCentroCustoResolvido(null);
                    setModalFaixaAberto(true);
                }
            } catch (err) {
                console.error('Erro ao buscar centros de custo do produto:', err);
                setCentroCustoResolvido(null);
                setModalFaixaAberto(true);
            } finally {
                setCarregandoCentroCusto(false);
            }
        } else if (tipoNormalizado === 'processos') {
            // Sub-processo: opção B — vai direto para o histórico por amostra.
            // O id já é o slug do sub-processo (ex: 'fermentacao').
            // O FaixaModal recebe esse slug e o backend resolve o filtro via resolverFiltroPorId.
            setCentroCustoResolvido(null);
            setModalFaixaAberto(true);
        } else {
            setCentroCustoResolvido(null);
            setModalFaixaAberto(true);
        }
    }


    function handleSelecionarCentroCusto(codCentroCusto: number, nome: string) {
        setCentroCustoResolvido({ id: codCentroCusto, nome });
        setOperacaoResolvida(null);
        setBemResolvido(null);
        setModalCentroCustoAberto(false);
        
        const nomeNorm = nome.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase();
        if (
            nomeNorm === 'FERMENTACAO' ||
            nomeNorm === 'UTILIDADES' ||
            nomeNorm === 'FILTRACAO' ||
            nomeNorm === 'ETA' ||
            nomeNorm === 'ETDI' ||
            nomeNorm.startsWith('BRASSAGEM')
        ) {
            setModalOperacaoAberto(true);
        } else {
            setModalFaixaAberto(true);
        }
    }

    function handleSelecionarOperacao(operacao: string) {
        setOperacaoResolvida(operacao);
        setModalOperacaoAberto(false);

        const nomeNorm = centroCustoResolvido?.nome?.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toUpperCase() || '';
        if (nomeNorm.startsWith('BRASSAGEM')) {
            // Brassagem doesn't need 'Bem'
            setModalFaixaAberto(true);
        } else {
            setModalBemAberto(true);
        }
    }

    function handleSelecionarBem(bem: string) {
        setBemResolvido(bem);
        setModalBemAberto(false);
        setModalFaixaAberto(true);
    }

    const { exportar, exportando } = useExportPDF('detalhe');

    if (filialId === null) {
        return (
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: '60dvh',
                padding: '24px',
                textAlign: 'center',
            }}>
                <div style={{
                    background: 'var(--clr-surface)',
                    border: '1px solid var(--clr-border)',
                    borderRadius: 'var(--r-lg)',
                    padding: '40px 32px',
                    maxWidth: '480px',
                    boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)'
                }}>
                    <div style={{
                        fontSize: '48px',
                        marginBottom: '16px',
                        color: 'var(--clr-primary)'
                    }}>
                        🏢
                    </div>
                    <h2 style={{
                        fontSize: '20px',
                        fontWeight: 700,
                        color: 'var(--clr-text)',
                        marginBottom: '10px'
                    }}>
                        Nenhuma filial selecionada
                    </h2>
                    <p style={{
                        fontSize: '14px',
                        color: 'var(--clr-text-3)',
                        lineHeight: '1.5',
                        margin: 0
                    }}>
                        Selecione uma filial no topo da tela para carregar os detalhes do ensaio correspondente.
                    </p>
                </div>
            </div>
        );
    }

    if (carregando) return <div className={styles.loading}>Carregando...</div>;
    if (!dados) return null;

    return (
        <div className={styles.page}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <button onClick={() => navigate(-1)} className={styles.voltar} style={{ margin: 0 }}>
                    ← Voltar à visão geral
                </button>

                <button
                    onClick={() => exportar({
                        tipo: tipoNormalizado,
                        id,
                        filialId,
                        dataInicio,
                        dataFim,
                        filialNome: filialLabel || 'Filial Q/Lab',
                        processoNome: dados.resumo?.nome || 'Detalhe'
                    })}
                    disabled={exportando}
                    style={{
                        padding: '8px 16px', background: 'var(--clr-primary)', color: '#fff',
                        border: 'none', borderRadius: 'var(--r-md)', cursor: 'pointer', fontWeight: 600,
                        opacity: exportando ? 0.7 : 1
                    }}
                >
                    {exportando ? 'Gerando PDF...' : 'Exportar PDF'}
                </button>
            </div>

            <div className={styles.resumoCards}>
                <div className={styles.card}>
                    <span className={styles.label}>Conformidade</span>
                    <strong className={styles.valor}>{dados.resumo.pct_conforme}%</strong>
                </div>
                <div className={styles.card}>
                    <span className={styles.label}>Não conformidades</span>
                    <strong className={styles.valor}>{dados.resumo.n_nao_conforme}</strong>
                </div>
                <div className={styles.card}>
                    <span className={styles.label}>Evento de qualidade afetados</span>
                    <strong className={styles.valor}>
                        {dados.resumo.lotes_afetados} de {dados.resumo.total_lotes}
                    </strong>
                </div>
            </div>

            <ResumoIADetalhe
                texto={resumoIA?.texto ?? ''}
                destaques={resumoIA?.destaques}
                carregando={carregandoIA}
            />

            <div className={styles.graficosRow}>
                <SerieConformidade dados={dados.serie} limites={faixaAtiva} />
                <div className={styles.faixasContainer}>
                    <span className={styles.label}>Faixas de especificação</span>
                    {dados.faixas.map((faixa: any) => {
                        const faixaKey = isBrassagem && faixa.operacao
                            ? `${faixa.cod_ensaio}_${faixa.operacao}`
                            : String(faixa.cod_ensaio);

                        const isActive = isBrassagem
                            ? faixaSelecionadaObjeto?.cod_ensaio === faixa.cod_ensaio &&
                              faixaSelecionadaObjeto?.operacao    === faixa.operacao
                            : faixaSelecionadaObjeto?.cod_ensaio === faixa.cod_ensaio;

                        return (
                            <div
                                key={faixaKey}
                                onClick={() => handleClickFaixa(faixa)}
                                className={`${styles.faixaCardWrapper} ${isActive ? styles.active : ''}`}
                            >
                                <FaixaEspecificacao dados={faixa} />
                            </div>
                        );
                    })}
                </div>
            </div>

            {/* Modal intermediário — só aparece no contexto Ensaio ou se houver múltiplos CCs no Produto */}
            {faixaSelecionadaObjeto && (
                <SelecionarCentroCustoModal
                    isOpen={modalCentroCustoAberto}
                    onClose={() => setModalCentroCustoAberto(false)}
                    onSelecionar={handleSelecionarCentroCusto}
                    codEnsaio={String(faixaSelecionadaObjeto.cod_ensaio)}
                    ensaioNome={faixaSelecionadaObjeto.ensaio}
                    dataInicio={dataInicio}
                    dataFim={dataFim}
                    codProduto={(tipo?.toLowerCase() === 'produto' || tipo?.toLowerCase() === 'produtos') ? String(id) : undefined}
                    filialId={filialId}
                />
            )}

            {/* Modal de Operação */}
            {faixaSelecionadaObjeto && centroCustoResolvido && (
                <SelecionarOperacaoModal
                    isOpen={modalOperacaoAberto}
                    onClose={() => setModalOperacaoAberto(false)}
                    onSelecionar={handleSelecionarOperacao}
                    codEnsaio={String(faixaSelecionadaObjeto.cod_ensaio)}
                    ensaioNome={faixaSelecionadaObjeto.ensaio}
                    codCentroCusto={String(centroCustoResolvido.id)}
                    centroCustoNome={centroCustoResolvido.nome}
                    dataInicio={dataInicio}
                    dataFim={dataFim}
                    filialId={filialId}
                />
            )}

            {/* Modal de Bem */}
            {faixaSelecionadaObjeto && centroCustoResolvido && operacaoResolvida && (
                <SelecionarBemModal
                    isOpen={modalBemAberto}
                    onClose={() => setModalBemAberto(false)}
                    onSelecionar={handleSelecionarBem}
                    codEnsaio={String(faixaSelecionadaObjeto.cod_ensaio)}
                    ensaioNome={faixaSelecionadaObjeto.ensaio}
                    codCentroCusto={String(centroCustoResolvido.id)}
                    centroCustoNome={centroCustoResolvido.nome}
                    operacao={operacaoResolvida}
                    dataInicio={dataInicio}
                    dataFim={dataFim}
                    filialId={filialId}
                />
            )}

            {/* FaixaModal — abre direto em Processo, após seleção de CC em Ensaio/Produto */}
            {modalFaixaAberto && faixaSelecionadaObjeto && (
                <FaixaModal
                    isOpen={modalFaixaAberto}
                    onClose={() => setModalFaixaAberto(false)}
                    id={
                        // processos: usa o slug diretamente
                        (tipoNormalizado === 'processos')
                            ? (id ?? '')
                            // legado: prefixo LCQ ou cod_centro_de_custo
                            : prefixoLcq ?? (
                                (tipoNormalizado === 'ensaio' || tipoNormalizado === 'ensaios' ||
                                    tipoNormalizado === 'produto' || tipoNormalizado === 'produtos')
                                    ? String(centroCustoResolvido?.id ?? '')
                                    : (id ?? '')
                            )
                    }
                    codEnsaio={faixaSelecionadaObjeto.cod_ensaio}
                    ensaioNome={faixaSelecionadaObjeto.ensaio}
                    dataInicio={dataInicio}
                    dataFim={dataFim}
                    operacao={operacaoResolvida || faixaSelecionadaObjeto.operacao}
                    bem={bemResolvido || undefined}
                    codProduto={(tipoNormalizado === 'produto' || tipoNormalizado === 'produtos') ? String(id) : undefined}
                    processoNome={centroCustoResolvido?.nome || dados.resumo?.nome}
                />
            )}

            {carregandoCentroCusto && (
                <div className={styles.loadingOverlay}>
                    <div className={styles.spinner}></div>
                    <p>Buscando processos associados...</p>
                </div>
            )}
        </div>
    );
}
