export const SHARED_STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');

  * { box-sizing: border-box; margin: 0; padding: 0; }

  :root {
    --gold:        #B38335;
    --gold-light:  #D9A856;
    --gold-pale:   #F5E6CC;
    --black:       #272525;
    --black-soft:  #3A3737;
    --gray-100:    #F7F7F7;
    --gray-200:    #EBEBEB;
    --gray-500:    #9E9E9E;
    --green:       #2E7D32;
    --red:         #C62828;
    --font:        'Inter', sans-serif;
  }

  body {
    font-family: var(--font);
    font-size: 10pt;
    color: var(--black);
    background: #fff;
    line-height: 1.5;
  }

  /* ── Capa ── */
  .cover {
    height: 100vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    padding: 48px;
    background: #fff;
    color: var(--black);
    page-break-after: always;
  }
  .cover-eyebrow {
    font-size: 8pt;
    letter-spacing: 0.15em;
    text-transform: uppercase;
    color: var(--gold);
    margin-bottom: 16px;
  }
  .cover-title {
    font-size: 28pt;
    font-weight: 700;
    line-height: 1.15;
    margin-bottom: 8px;
  }
  .cover-subtitle {
    font-size: 13pt;
    color: var(--gold);
    margin-bottom: 40px;
  }
  .cover-meta {
    font-size: 9pt;
    color: var(--gray-500);
    border-top: 1px solid var(--gray-200);
    padding-top: 16px;
  }
  .cover-accent {
    width: 48px;
    height: 4px;
    background: var(--gold);
    margin-bottom: 24px;
  }

  /* ── Seções ── */
  .section {
    padding: 24px 0;
    border-bottom: 1px solid var(--gray-200);
  }
  .section:last-child { border-bottom: none; }

  .section-title {
    font-size: 11pt;
    font-weight: 600;
    color: var(--black-soft);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 16px;
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .section-title::before {
    content: '';
    display: inline-block;
    width: 3px;
    height: 14px;
    background: var(--gold);
    border-radius: 2px;
  }

  /* ── Bloco IA ── */
  .ia-block {
    background: var(--gold-pale);
    border-left: 3px solid var(--gold);
    padding: 16px 20px;
    border-radius: 0 6px 6px 0;
    margin-bottom: 24px;
  }
  .ia-label {
    font-size: 7pt;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.12em;
    color: var(--gold);
    margin-bottom: 6px;
  }
  .ia-text {
    font-size: 9.5pt;
    color: var(--black-soft);
    line-height: 1.6;
  }

  /* ── Tabelas ── */
  table {
    width: 100%;
    border-collapse: collapse;
    font-size: 9pt;
  }
  thead th {
    background: var(--black);
    color: #fff;
    padding: 7px 10px;
    text-align: left;
    font-weight: 600;
    font-size: 8pt;
    letter-spacing: 0.05em;
  }
  tbody tr:nth-child(even) { background: var(--gray-100); }
  tbody td {
    padding: 6px 10px;
    border-bottom: 1px solid var(--gray-200);
    vertical-align: middle;
  }

  /* ── Badges ── */
  .badge-conforme    { color: var(--green); font-weight: 600; }
  .badge-nc          { color: var(--red);   font-weight: 600; }
  .rank-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--gold);
    color: #fff;
    font-size: 7pt;
    font-weight: 700;
  }

  /* ── KPI Cards ── */
  .kpi-grid {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
    gap: 12px;
    margin-bottom: 24px;
  }
  .kpi-card {
    background: var(--gray-100);
    border: 1px solid var(--gray-200);
    border-radius: 6px;
    padding: 14px;
  }
  .kpi-label {
    font-size: 7.5pt;
    color: var(--gray-500);
    text-transform: uppercase;
    letter-spacing: 0.08em;
    margin-bottom: 4px;
  }
  .kpi-value {
    font-size: 18pt;
    font-weight: 700;
    color: var(--black);
    line-height: 1;
  }
  .kpi-value.gold  { color: var(--gold); }
  .kpi-value.green { color: var(--green); }
  .kpi-value.red   { color: var(--red); }

  /* ── Página ── */
  .page {
    padding: 0 48px;
    max-width: 210mm;
    margin: 0 auto;
  }
  .page-break { page-break-before: always; }

  /* ── Barra de conformidade ── */
  .conf-bar-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .conf-bar-bg {
    flex: 1;
    height: 6px;
    background: var(--gray-200);
    border-radius: 3px;
    overflow: hidden;
  }
  .conf-bar-fill {
    height: 100%;
    background: var(--gold);
    border-radius: 3px;
  }
  .conf-pct {
    font-size: 8pt;
    font-weight: 600;
    min-width: 36px;
    text-align: right;
  }

  /* ── Footer ── */
  .pdf-footer {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    padding: 8px 48px;
    font-size: 7.5pt;
    color: var(--gray-500);
    border-top: 1px solid var(--gray-200);
    display: flex;
    justify-content: space-between;
    background: #fff;
  }
`;
