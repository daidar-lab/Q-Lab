import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useContexto } from '../../contexts/ContextoProvider';
import { detalheApi } from '../../services/detalhe.api';
import { macroProcessoApi } from '../../services/macroProcesso.api';
import SerieConformidade from '../../components/detalhe/SerieConformidade';
import FaixaEspecificacao from '../../components/detalhe/FaixaEspecificacao';
import FaixaModal from '../../components/FaixasExplosao/FaixaModal';
import SelecionarCentroCustoModal from '../../components/FaixasExplosao/SelecionarCentroCustoModal';
import ResumoIADetalhe from '../../components/detalhe/ResumoIADetalhe';
import styles from './DetalhePage.module.css';



export default function DetalhePage() {
    const { tipo, id, origem, natureza } = useParams();
    const tipoNormalizado = tipo?.toLowerCase() ?? '';
    const navigate = useNavigate();
    const { ctx } = useContexto();
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
    const [modalFaixaAberto, setModalFaixaAberto] = useState(false);
    const [centroCustoResolvido, setCentroCustoResolvido] = useState<{ id: number; nome: string } | null>(null);
    const [carregandoCentroCusto, setCarregandoCentroCusto] = useState(false);

    useEffect(() => {
        setCarregando(true);
        if (origem && natureza) {
            macroProcessoApi.getDetalhe(origem, natureza as 'produto' | 'processo', dataInicio, dataFim)
                .then((res) => {
                    setDados(res.data);
                })
                .finally(() => setCarregando(false));
        } else if (tipo && id) {
            detalheApi.getDetalhe(tipo, id, dataInicio, dataFim)
                .then(setDados)
                .finally(() => setCarregando(false));
        } else {
            setCarregando(false);
        }
    }, [tipo, id, origem, natureza, dataInicio, dataFim]);

    useEffect(() => {
        setResumoIA(null);
        if (!dados) return;

        const tipoParam = origem ? 'processo' : (tipo ?? '');
        const idParam = origem ?? id ?? '';

        setCarregandoIA(true);
        detalheApi
            .getResumoIA(tipoParam, idParam, dataInicio, dataFim)
            .then((res) => setResumoIA(res))
            .catch(() => { /* silencia — resumo IA é não-crítico */ })
            .finally(() => setCarregandoIA(false));
    }, [dados, tipo, id, origem, dataInicio, dataFim]);

    useEffect(() => {
        setModalCentroCustoAberto(false);
        setModalFaixaAberto(false);
        setFaixaSelecionadaObjeto(null);
        setFaixaAtiva(null);
        setCentroCustoResolvido(null);
        setCarregandoCentroCusto(false);
        setPrefixoLcq(null);
    }, [tipo, id, origem, natureza, dataInicio, dataFim]);

    async function handleClickFaixa(faixa: any) {
        setFaixaSelecionadaObjeto(faixa);
        setFaixaAtiva(null);

        if (tipoNormalizado === 'ensaio' || tipoNormalizado === 'ensaios') {
            setModalCentroCustoAberto(true);
        } else if (tipoNormalizado === 'produto' || tipoNormalizado === 'produtos') {
            setCarregandoCentroCusto(true);
            try {
                const centros = await detalheApi.getCentrosCustoPorProdutoEEnsaio(String(id), String(faixa.cod_ensaio), dataInicio, dataFim);
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
        setModalCentroCustoAberto(false);
        setModalFaixaAberto(true);
    }

    if (carregando) return <div className={styles.loading}>Carregando...</div>;
    if (!dados) return null;

    return (
        <div className={styles.page}>
            <button onClick={() => navigate(-1)} className={styles.voltar}>
                ← Voltar à visão geral
            </button>

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
                    {dados.faixas.map((faixa: any) => (
                        <div
                            key={faixa.cod_ensaio}
                            onClick={() => handleClickFaixa(faixa)}
                            className={`${styles.faixaCardWrapper} ${faixaSelecionadaObjeto?.cod_ensaio === faixa.cod_ensaio ? styles.active : ''
                                }`}
                        >
                            <FaixaEspecificacao dados={faixa} />
                        </div>
                    ))}
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
