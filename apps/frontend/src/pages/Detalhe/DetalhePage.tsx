import { useParams, useNavigate } from 'react-router-dom';
import { useEffect, useState } from 'react';
import { useContexto } from '../../contexts/ContextoProvider';
import { detalheApi } from '../../services/detalhe.api';
import { macroProcessoApi } from '../../services/macroProcesso.api';
import SerieConformidade from '../../components/detalhe/SerieConformidade';
import FaixaEspecificacao from '../../components/detalhe/FaixaEspecificacao';
import FaixaModal from '../../components/FaixasExplosao/FaixaModal';
import SelecionarCentroCustoModal from '../../components/FaixasExplosao/SelecionarCentroCustoModal';
import styles from './DetalhePage.module.css';



export default function DetalhePage() {
    const { tipo, id, origem, natureza } = useParams();
    const navigate = useNavigate();
    const { ctx } = useContexto();
    const dataInicio = ctx.dataInicio ?? '';
    const dataFim = ctx.dataFim ?? '';

    const [dados, setDados] = useState<any>(null);
    const [carregando, setCarregando] = useState(true);
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
                    setPrefixoLcq(res.data.prefixo ?? null);
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

        const tipoNormalizado = tipo?.toLowerCase();
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
                    <span className={styles.label}>Lotes afetados</span>
                    <strong className={styles.valor}>
                        {dados.resumo.lotes_afetados} de {dados.resumo.total_lotes}
                    </strong>
                </div>
            </div>

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
                    id={prefixoLcq ?? ((tipo?.toLowerCase() === 'ensaio' || tipo?.toLowerCase() === 'ensaios' || tipo?.toLowerCase() === 'produto' || tipo?.toLowerCase() === 'produtos') ? String(centroCustoResolvido?.id ?? '') : (id ?? ''))}
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