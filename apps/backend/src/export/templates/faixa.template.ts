import { SHARED_STYLES } from './shared/styles';
import { buildCover } from './shared/header';

export function buildFaixaHTML(data: {
  explosao: any[];
  produtos: any[];
  historico: any[];
  resumoIA: any;
  filialNome: string;
  processoNome: string;
  ensaioNome: string;
  lie: number | null;
  lse: number | null;
  dataInicio: string;
  dataFim: string;
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

  const faixaLabel = data.lie != null && data.lse != null
    ? `LIE ${data.lie} – LSE ${data.lse}`
    : 'Sem faixa numérica';

  const rowsExplosao = data.explosao.map((f, i) => `
    <tr>
      <td>${i + 1}º</td>
      <td>${f.lie ?? '—'} – ${f.lse ?? '—'}</td>
      <td>${Number(f.n_amostras).toLocaleString('pt-BR')}</td>
      <td>${Number(f.n_produtos)}</td>
      <td>${Number(f.pct_amostras).toFixed(1)}%</td>
    </tr>
  `).join('');

  const rowsProdutos = data.produtos.map((p, i) => `
    <tr>
      <td><span class="rank-num">${i + 1}</span></td>
      <td>${p.produto}</td>
      <td>${Number(p.n_amostras).toLocaleString('pt-BR')}</td>
      <td class="${Number(p.pct_conforme) >= 95 ? 'badge-conforme' : 'badge-nc'}">
        ${Number(p.pct_conforme).toFixed(1)}%
      </td>
    </tr>
  `).join('');

  // Histórico: agrupa por produto para não virar tabela de 500 linhas
  const produtosUnicos = [...new Set(data.historico.map((h: any) => h.produto))];
  const resumoHistorico = produtosUnicos.map(prod => {
    const pontos = data.historico.filter((h: any) => h.produto === prod);
    const valores = pontos.map((h: any) => Number(h.valor)).filter(v => !isNaN(v));
    const media = valores.length > 0 ? (valores.reduce((a, b) => a + b, 0) / valores.length).toFixed(4) : '—';
    const ultimo = pontos[pontos.length - 1];
    const ultimoValorExibicao = ultimo?.conformidade ?? ultimo?.valor_original ?? ultimo?.valor ?? '—';
    const dataResultadoFormatada = ultimo?.data_resultado ? formatDataBR(ultimo.data_resultado) : '—';
    
    return `
      <tr>
        <td>${prod}</td>
        <td>${pontos.length}</td>
        <td>${media}</td>
        <td>${dataResultadoFormatada}</td>
        <td>${ultimoValorExibicao}</td>
      </tr>
    `;
  }).join('');

  const html = `<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <style>${SHARED_STYLES}</style>
</head>
<body>

  ${buildCover({
    titulo: data.ensaioNome,
    subtitulo: `${data.processoNome} · Análise de Faixa · ${faixaLabel}`,
    filialNome: data.filialNome,
    dataInicio: data.dataInicio,
    dataFim: data.dataFim,
  })}

  <div class="page">

    <!-- IA -->
    <div class="section">
      <div class="ia-block">
        <div class="ia-label">Análise por IA · ${data.ensaioNome}</div>
        <div class="ia-text">${textoIA}</div>
      </div>
    </div>

    <!-- Explosão de faixas (SÓ EXIBE SE EXISTIR ALGUMA FAIXA PARA ESTE ENSAIO) -->
    ${data.explosao && data.explosao.length > 0 ? `
    <div class="section page-break">
      <div class="section-title">Distribuição por Faixas de Especificação</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Faixa (LIE–LSE)</th>
            <th>Amostras</th>
            <th>Produtos</th>
            <th>% do Total</th>
          </tr>
        </thead>
        <tbody>${rowsExplosao}</tbody>
      </table>
    </div>
    ` : ''}

    <!-- Produtos na faixa -->
    <div class="section page-break">
      <div class="section-title">Produtos · ${faixaLabel}</div>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Produto</th>
            <th>Amostras</th>
            <th>% Conforme</th>
          </tr>
        </thead>
        <tbody>${rowsProdutos}</tbody>
      </table>
    </div>

    <!-- Histórico resumido por produto -->
    <div class="section page-break">
      <div class="section-title">Resumo Histórico por Produto</div>
      <table>
        <thead>
          <tr>
            <th>Produto</th>
            <th>Pontos</th>
            <th>Média</th>
            <th>Último resultado em</th>
            <th>Último valor</th>
          </tr>
        </thead>
        <tbody>${resumoHistorico}</tbody>
      </table>
    </div>

  </div>

  <div class="pdf-footer">
    <span>Q/Lab · ${data.ensaioNome} · ${data.processoNome} · ${data.filialNome}</span>
    <span>${data.dataInicio} – ${data.dataFim}</span>
  </div>

</body>
</html>`;

  return html;
}
