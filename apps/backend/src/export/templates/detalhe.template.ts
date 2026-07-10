import { SHARED_STYLES } from './shared/styles';
import { buildCover } from './shared/header';

export function buildDetalheHTML(data: {
  detalhe: any;
  resumoIA: any;
  filialNome: string;
  processoNome: string;
  dataInicio: string;
  dataFim: string;
  tipo: string;
  id: string | number;
}): string {
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

  const resumo = data.detalhe.resumo;
  const faixas: any[] = data.detalhe.faixas ?? [];
  const serie = data.detalhe.serie?.dados ?? [];

  let textoIA = typeof data.resumoIA === 'string'
    ? data.resumoIA
    : data.resumoIA?.texto ?? '';

  // Remove markdown from AI text
  textoIA = textoIA
    .replace(/\*\*(.*?)\*\*/g, '$1') // Bold
    .replace(/__(.*?)__/g, '$1') // Bold
    .replace(/\*(.*?)\*/g, '$1') // Italic
    .replace(/_(.*?)_/g, '$1') // Italic
    .replace(/#{1,6}\s*(.*?)\n/g, '$1\n') // Headers
    .replace(/#{1,6}\s*(.*?)$/g, '$1') // Headers at the end of string
    .replace(/-{3,}/g, '') // Horizontal rules
    .replace(/\n/g, '<br/>'); // Newlines to br

  const rowsFaixas = faixas.map((f, i) => `
    <tr>
      <td><span class="rank-num">${i + 1}</span></td>
      <td>${f.ensaio ?? '—'}</td>
      <td>${f.n != null ? Number(f.n).toLocaleString('pt-BR') : '—'}</td>
      <td class="badge-nc">${f.pct_nao_conforme != null ? Number(f.pct_nao_conforme).toFixed(1) : '—'}%</td>
      <td>${f.lie ?? '—'}</td>
      <td>${f.lse ?? '—'}</td>
      <td>${f.media != null ? Number(f.media).toFixed(4) : '—'}</td>
    </tr>
  `).join('');

  const rowsSerie = serie.map((s: any) => `
    <tr>
      <td>${formatDataBR(s.periodo)}</td>
      <td>${s.total != null ? Number(s.total).toLocaleString('pt-BR') : '—'}</td>
      <td class="badge-nc">${s.n_nao_conforme != null ? Number(s.n_nao_conforme).toLocaleString('pt-BR') : '—'}</td>
      <td>${s.pct_conforme != null ? Number(s.pct_conforme).toFixed(1) : '—'}%</td>
    </tr>
  `).join('');

  const pctConf = resumo?.pct_conforme != null ? `${Number(resumo.pct_conforme).toFixed(1)}%` : '—';
  const corConf = Number(resumo?.pct_conforme) >= 95 ? 'green' : Number(resumo?.pct_conforme) >= 80 ? 'gold' : 'red';

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>${SHARED_STYLES}</style>
</head>
<body>

  ${buildCover({
    titulo: data.processoNome,
    subtitulo: `Relatório de Detalhe · ${data.tipo}`,
    filialNome: data.filialNome,
    dataInicio: data.dataInicio,
    dataFim: data.dataFim,
  })}

  <div class="page">

    <!-- IA -->
    <div class="section">
      <div class="ia-block">
        <div class="ia-label">Análise por IA · ${data.processoNome}</div>
        <div class="ia-text">${textoIA}</div>
      </div>
    </div>

    <!-- KPIs macro -->
    <div class="section">
      <div class="section-title">Resumo do Período</div>
      <div class="kpi-grid">
        <div class="kpi-card">
          <div class="kpi-label">Total de Ensaios</div>
          <div class="kpi-value gold">${Number(resumo?.total ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Não Conformidades</div>
          <div class="kpi-value red">${Number(resumo?.n_nao_conforme ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Conformidade</div>
          <div class="kpi-value ${corConf}">${pctConf}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Total de Lotes</div>
          <div class="kpi-value">${Number(resumo?.total_lotes ?? 0).toLocaleString('pt-BR')}</div>
        </div>
        <div class="kpi-card">
          <div class="kpi-label">Lotes Afetados</div>
          <div class="kpi-value red">${Number(resumo?.lotes_afetados ?? 0).toLocaleString('pt-BR')}</div>
        </div>
      </div>
    </div>

    <!-- Série temporal -->
    <div class="section page-break">
      <div class="section-title">Evolução Temporal (${data.detalhe.serie?.granularidade ?? ''})</div>
      <table>
        <thead>
          <tr>
            <th>Período</th>
            <th>Total</th>
            <th>NC</th>
            <th>% Conforme</th>
          </tr>
        </thead>
        <tbody>${rowsSerie}</tbody>
      </table>
    </div>

    <!-- Faixas de especificação -->
    <div class="section page-break">
      <div class="section-title">Ensaios por % de Não Conformidade</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Ensaio</th>
            <th>Ensaios</th>
            <th>% NC</th>
            <th>LIE</th>
            <th>LSE</th>
            <th>Média</th>
          </tr>
        </thead>
        <tbody>${rowsFaixas}</tbody>
      </table>
    </div>

  </div>

  <div class="pdf-footer">
    <span>Q/Lab · ${data.processoNome} · ${data.filialNome}</span>
    <span>${data.dataInicio} – ${data.dataFim}</span>
  </div>

</body>
</html>`;

  return html;
}
