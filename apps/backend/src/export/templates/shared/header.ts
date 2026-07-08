export function buildCover(opts: {
  titulo: string;
  subtitulo: string;
  filialNome: string;
  dataInicio: string;
  dataFim: string;
}): string {
  const geradoEm = new Date().toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });
  return `
    <div class="cover">
      <div class="cover-eyebrow">Q/Lab · Relatório de Qualidade</div>
      <div class="cover-accent"></div>
      <div class="cover-title">${opts.titulo}</div>
      <div class="cover-subtitle">${opts.subtitulo}</div>
      <div class="cover-meta">
        ${opts.filialNome} &nbsp;·&nbsp;
        ${opts.dataInicio} até ${opts.dataFim} &nbsp;·&nbsp;
        Gerado em ${geradoEm}
      </div>
    </div>
  `;
}
