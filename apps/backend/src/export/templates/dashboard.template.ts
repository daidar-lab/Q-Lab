import { SHARED_STYLES } from './shared/styles';
import { buildCover } from './shared/header';

interface DashboardTemplateData {
  processos: { id: string; nome: string; amostras: number; ensaios: number; nc: number }[];
  produtos:  { id: number; nome: string; amostras: number; ensaios: number; nc: number }[];
  ensaios:   { id: number; nome: string; amostras: number; ensaios: number; nc: number }[];
  resumoIA:  any;
  filialNome: string;
  dataInicio: string;
  dataFim: string;
  kpis?: {
    amostras: { valor: number };
    ensaios: { valor: number };
    naoConformidades: { valor: number };
    conformidade: { valor: number };
  };
}

function barraNaoConformidade(ensaios: number, nc: number): string {
  const pct = ensaios === 0 ? 0 : (nc / ensaios) * 100;
  const cor = pct <= 5 ? 'var(--green)' : pct <= 20 ? 'var(--gold)' : 'var(--red)';
  return `
    <div class="conf-bar-wrap">
      <div class="conf-bar-bg">
        <div class="conf-bar-fill" style="width:${pct.toFixed(1)}%;background:${cor}"></div>
      </div>
      <span class="conf-pct">${pct.toFixed(1)}%</span>
    </div>
  `;
}

function tabelaRanking(
  dados: { id: any; nome: string; amostras: number; ensaios: number; nc: number }[],
  titulo: string
): string {
  const rows = dados.slice(0, 15).map((r, i) => `
    <tr>
      <td><span class="rank-num">${i + 1}</span></td>
      <td>${r.nome}</td>
      <td>${r.amostras.toLocaleString('pt-BR')}</td>
      <td>${r.ensaios.toLocaleString('pt-BR')}</td>
      <td class="badge-nc">${r.nc.toLocaleString('pt-BR')}</td>
      <td>${barraNaoConformidade(r.ensaios, r.nc)}</td>
    </tr>
  `).join('');

  return `
    <div class="section page-break">
      <div class="section-title">${titulo}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Nome</th>
            <th>Amostras</th>
            <th>Ensaios</th>
            <th>NC</th>
            <th>% NC</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
    </div>
  `;
}

export function buildDashboardHTML(data: DashboardTemplateData): string {
  const formatDataBR = (d: string) => {
    if (!d) return '';
    const match = d.match(/^(\d{4})-(\d{2})-(\d{2})(?: (\d{2})(?::(\d{2}))?)?/);
    if (match) {
      const [_, y, m, day, h, min] = match;
      let res = `${day}/${m}/${y}`;
      if (h) res += ` ${h}:${min || '00'}`;
      return res;
    }
    const p = d.split('T')[0].split('-');
    if (p.length >= 3) return `${p[2]}/${p[1]}/${p[0]}`;
    return d;
  };
  data.dataInicio = formatDataBR(data.dataInicio);
  data.dataFim = formatDataBR(data.dataFim);

  const totalAmostras = data.kpis ? data.kpis.amostras.valor : data.processos.reduce((s, p) => s + p.amostras, 0);
  const totalEnsaios  = data.kpis ? data.kpis.ensaios.valor : data.processos.reduce((s, p) => s + p.ensaios, 0);
  const totalNC       = data.kpis ? data.kpis.naoConformidades.valor : data.processos.reduce((s, p) => s + p.nc, 0);
  const pctGeralNC    = data.kpis ? (100 - data.kpis.conformidade.valor).toFixed(1) : (totalEnsaios > 0 ? ((totalNC / totalEnsaios) * 100).toFixed(1) : '—');
  const corGeral      = Number(pctGeralNC) <= 5 ? 'green' : Number(pctGeralNC) <= 20 ? 'gold' : 'red';

  let textoIA = typeof data.resumoIA === 'string'
    ? data.resumoIA
    : data.resumoIA?.texto ?? JSON.stringify(data.resumoIA);

  // Remove markdown from AI text
  textoIA = textoIA
    .replace(/\\*\\*(.*?)\\*\\*/g, '$1') // Bold
    .replace(/__(.*?)__/g, '$1') // Bold
    .replace(/\\*(.*?)\\*/g, '$1') // Italic
    .replace(/_(.*?)_/g, '$1') // Italic
    .replace(/#{1,6}\\s*(.*?)\\n/g, '$1\\n') // Headers
    .replace(/#{1,6}\\s*(.*?)$/g, '$1') // Headers at the end of string
    .replace(/-{3,}/g, '') // Horizontal rules
    .replace(/\\n/g, '<br/>'); // Newlines to br

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>${SHARED_STYLES}</style>
</head>
<body>

  ${buildCover({
    titulo: 'Dashboard de Qualidade',
    subtitulo: 'Visão geral de processos, produtos e ensaios',
    filialNome: data.filialNome,
    dataInicio: data.dataInicio,
    dataFim: data.dataFim,
  })}

  <div class="page">

    <!-- Resumo IA -->
    <div class="section">
      <div class="ia-block">
        <div class="ia-label">Resumo Executivo · Análise por IA</div>
        <div class="ia-text">${textoIA}</div>
      </div>
    </div>

    <!-- KPIs -->
    <div class="section">
      <div class="section-title">Indicadores do Período</div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total de Ensaios</div>
          <div class="kpi-value gold">${totalEnsaios.toLocaleString('pt-BR')}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Não Conformidades</div>
          <div class="kpi-value red">${totalNC.toLocaleString('pt-BR')}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">% Não Conforme (Geral)</div>
          <div class="kpi-value ${corGeral}">${pctGeralNC}%</div>
        </div>
      </div>
    </div>

    ${tabelaRanking(data.processos, 'Ranking de Processos')}
    ${tabelaRanking(data.produtos,  'Ranking de Produtos')}
    ${tabelaRanking(data.ensaios,   'Ranking de Ensaios')}

  </div>

  <div class="pdf-footer">
    <span>Q/Lab · ${data.filialNome}</span>
    <span>${data.dataInicio} – ${data.dataFim}</span>
  </div>

</body>
</html>`;

  return html;
}
