import { getFiliais } from '../services/filiais.service';

export async function warmDashboardCache() {
  console.log('[Cache Warmer] Iniciando aquecimento do cache do dashboard...');
  const inicioTempo = Date.now();

  try {
    const filiais = await getFiliais();
    if (filiais.length === 0) {
      console.log('[Cache Warmer] Nenhuma filial encontrada.');
      return;
    }

    const port = process.env.PORT ?? 3333;
    // Permite configurar a URL externa no Lightsail via .env. 
    // Fallback usa 127.0.0.1 que evita problemas de resolução de IPv6 vs IPv4 (comum no node fetching localhost)
    const baseUrl = process.env.API_BASE_URL || process.env.API_URL || `http://127.0.0.1:${port}`;

    const hoje = new Date();
    
    // Período 1: Última semana (7 dias atrás até ontem)
    const seteDiasAtras = new Date(hoje);
    seteDiasAtras.setDate(hoje.getDate() - 7);
    const ontem = new Date(hoje);
    ontem.setDate(hoje.getDate() - 1);

    // Período 2: Último mês
    const primeiroDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth() - 1, 1);
    const ultimoDiaMesAnterior = new Date(hoje.getFullYear(), hoje.getMonth(), 0);

    const formatarData = (data: Date) => {
        const year = data.getFullYear();
        const month = String(data.getMonth() + 1).padStart(2, '0');
        const day = String(data.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    };

    const periodos = [
      { dataInicio: formatarData(seteDiasAtras), dataFim: formatarData(ontem) },
      { dataInicio: formatarData(primeiroDiaMesAnterior), dataFim: formatarData(ultimoDiaMesAnterior) }
    ];

    for (const filial of filiais) {
      console.log(`[Cache Warmer] Aquecendo filial ${filial.cod_filial} (${filial.filial})...`);
      
      for (const periodo of periodos) {
        const { dataInicio, dataFim } = periodo;
        const params = `filialId=${filial.cod_filial}&dataInicio=${dataInicio}&dataFim=${dataFim}`;

        const endpoints = [
          `/api/analitica/kpis?${params}`,
          `/api/analitica/processos?${params}`,
          `/api/analitica/produtos?${params}`,
          `/api/analitica/ensaios?${params}`
        ];

        try {
          await Promise.all(
            endpoints.map(async (endpoint) => {
              const url = `${baseUrl}${endpoint}`;
              const response = await fetch(url);
              if (!response.ok) {
                console.error(`[Cache Warmer] Falha no endpoint ${endpoint}: ${response.status} ${response.statusText}`);
              }
            })
          );
        } catch (err) {
          console.error(`[Cache Warmer] Erro ao aquecer período ${dataInicio} a ${dataFim} da filial ${filial.cod_filial}:`, err);
        }
      }
    }

    const tempoTotalMs = Date.now() - inicioTempo;
    console.log(`[Cache Warmer] Aquecimento finalizado com sucesso em ${tempoTotalMs}ms.`);
  } catch (err) {
    console.error('[Cache Warmer] Erro crítico no aquecimento:', err);
  }
}
