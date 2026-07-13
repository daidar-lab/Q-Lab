import { Request, Response } from 'express';
import { renderizarPDF } from './pdf.renderer';
import { buildDashboardHTML } from './templates/dashboard.template';
import { buildDetalheHTML } from './templates/detalhe.template';
import { buildFaixaHTML } from './templates/faixa.template';
import { getRankingProcessos, getRankingProdutos, getRankingEnsaios, getKpisDashboard } from '../services/analitica.service';
import { getDetalheCompleto } from '../services/detalhe.service';
import { getExplosaoFaixas, getProdutosPorFaixa, getProdutosSemFaixa, getHistoricoProdutosFaixa, getHistoricoProdutosSemFaixa } from '../services/faixa.service';
import { chamarGatewayIA3, chamarGatewayIA4, chamarGatewayIA5 } from '../services/ia-gateway.service';
import { gerarChaveCache, buscarCache, salvarCache } from '../services/cache-ia.service';

export async function exportDashboard(req: Request, res: Response) {
  const { filialId, dataInicio, dataFim, filialNome } = req.body;
  const periodo = { filialId: Number(filialId), dataInicio, dataFim };

  const [processos, produtosRaw, ensaios, kpis] = await Promise.all([
    getRankingProcessos(periodo),
    getRankingProdutos(periodo),
    getRankingEnsaios(periodo),
    getKpisDashboard(periodo),
  ]);

  // Flatten the products tree for the PDF and AI context, sorted by nc descending
  const produtos = produtosRaw
    .flatMap(tipo => tipo.produtos)
    .sort((a, b) => b.nc - a.nc);

  const contextoIA = {
    periodo: { inicio: dataInicio, fim: dataFim },
    filial: filialNome,
    top5_processos_por_nc: processos.slice(0, 5),
    top5_produtos_por_nc: produtos.slice(0, 5),
    top5_ensaios_por_nc: ensaios.slice(0, 5),
    total_amostras: kpis.amostras.valor,
    total_nc: kpis.naoConformidades.valor,
  };

  const chave = gerarChaveCache('export-dashboard', { filialId, dataInicio, dataFim }, contextoIA as any);
  const resumoIA = await buscarCache(chave) ?? await (async () => {
    const r = await chamarGatewayIA3('export-dashboard', contextoIA);
    await salvarCache(chave, 'export-dashboard', r);
    return r;
  })();

  const html = buildDashboardHTML({ processos, produtos, ensaios, resumoIA, filialNome, dataInicio, dataFim, kpis });
  const buffer = await renderizarPDF(html);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="qlab-dashboard-${dataInicio}-${dataFim}.pdf"`);
  res.send(buffer);
}

export async function exportDetalhe(req: Request, res: Response) {
  const { tipo, id, filialId, dataInicio, dataFim, filialNome, processoNome } = req.body;

  const tipoNormalizado = {
    processo: 'processo',
    processos: 'processo',
    produto: 'produto',
    produtos: 'produto',
    ensaio: 'ensaio',
    ensaios: 'ensaio',
  }[String(tipo).toLowerCase()] as 'processo' | 'produto' | 'ensaio' || 'processo';

  const idNormalizado = isNaN(Number(id)) ? id : Number(id);

  const params = { tipo: tipoNormalizado, id: idNormalizado, filialId: Number(filialId), dataInicio, dataFim };

  const detalhe = await getDetalheCompleto(params);

  const contextoIA = {
    tipo: tipoNormalizado, id: idNormalizado,
    periodo: { inicio: dataInicio, fim: dataFim },
    filial: filialNome,
    nome: processoNome,
    resumo: detalhe.resumo,
    faixas: detalhe.faixas.slice(0, 8).map((f: any) => ({
      ensaio: f.ensaio,
      pct_conforme: f.pct_conforme,
      pct_nao_conforme: f.pct_nao_conforme,
      n: f.n,
      lie: f.lie,
      lse: f.lse,
      media: f.media,
    })),
    serie: detalhe.serie.dados?.slice(-6) ?? [],
  };

  const chave = gerarChaveCache('export-detalhe', { tipo: tipoNormalizado, id: String(idNormalizado), filialId, dataInicio, dataFim }, contextoIA as any);
  const resumoIA = await buscarCache(chave) ?? await (async () => {
    const r = await chamarGatewayIA4('export-detalhe', contextoIA);
    await salvarCache(chave, 'export-detalhe', r);
    return r;
  })();

  const html = buildDetalheHTML({ detalhe, resumoIA, filialNome, processoNome, dataInicio, dataFim, tipo: tipoNormalizado, id: idNormalizado });
  const buffer = await renderizarPDF(html);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="qlab-detalhe-${String(idNormalizado)}-${dataInicio}-${dataFim}.pdf"`);
  res.send(buffer);
}

export async function exportFaixa(req: Request, res: Response) {
  const { id, codEnsaio, ensaioNome, lie, lse, codProdutos, filialId, dataInicio, dataFim, filialNome, processoNome, operacao, bem } = req.body;
  const filialIdNum = Number(filialId);
  const temFaixa = lie !== null && lie !== undefined && lse !== null && lse !== undefined;

  const [explosao, produtos, historico] = await Promise.all([
    getExplosaoFaixas(id, codEnsaio, dataInicio, dataFim, filialIdNum, operacao, bem),
    temFaixa
      ? getProdutosPorFaixa(id, codEnsaio, lie as number, lse as number, dataInicio, dataFim, filialIdNum, operacao, bem)
      : getProdutosSemFaixa(id, codEnsaio, dataInicio, dataFim, filialIdNum, operacao, bem),
    temFaixa
      ? getHistoricoProdutosFaixa(id, codEnsaio, lie as number, lse as number, dataInicio, dataFim, codProdutos ?? [], filialIdNum, operacao, bem)
      : getHistoricoProdutosSemFaixa(id, codEnsaio, dataInicio, dataFim, codProdutos ?? [], filialIdNum, operacao, bem),
  ]);

  const contextoIA = {
    processo: processoNome,
    ensaio: ensaioNome,
    faixa: temFaixa ? { lie, lse } : null,
    periodo: { inicio: dataInicio, fim: dataFim },
    filial: filialNome,
    explosao_faixas: explosao.slice(0, 5),
    top_produtos: produtos.slice(0, 5),
    total_amostras: produtos.reduce((s: number, p: any) => s + Number(p.n_amostras), 0),
    pct_conforme_geral: produtos.length > 0
      ? (produtos.reduce((s: number, p: any) => s + Number(p.pct_conforme), 0) / produtos.length).toFixed(1)
      : null,
  };

  const chave = gerarChaveCache('export-faixa', { id, codEnsaio, lie, lse, filialId, dataInicio, dataFim }, contextoIA as any);
  const resumoIA = await buscarCache(chave) ?? await (async () => {
    const r = await chamarGatewayIA5('export-faixa', contextoIA);
    await salvarCache(chave, 'export-faixa', r);
    return r;
  })();

  const html = buildFaixaHTML({ explosao, produtos, historico, resumoIA, filialNome, processoNome, ensaioNome, lie, lse, dataInicio, dataFim, operacao, bem });
  const buffer = await renderizarPDF(html);

  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', `attachment; filename="qlab-faixa-${ensaioNome}-${dataInicio}-${dataFim}.pdf"`);
  res.send(buffer);
}
