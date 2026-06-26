// apps/backend/src/services/resumo-dashboard.service.ts

import { chamarGatewayIA } from './ia-gateway.service';
import { gerarChaveCache, buscarCache, salvarCache } from './cache-ia.service';
import { getKpisDashboard } from './analitica.service';

interface ResumoParams {
  dataInicio: string;
  dataFim:    string;
}

export async function getResumoDashboard(params: ResumoParams) {
  // 1. Busca os KPIs reais que alimentam o resumo (amostras, ensaios, NCs, conformidade)
  const kpis = await getKpisDashboard(params);

  // 2. Monta chave de cache com fingerprint dos números reais
  const chave = gerarChaveCache(
    'resumo_dashboard',
    { dataInicio: params.dataInicio, dataFim: params.dataFim },
    kpis as unknown as Record<string, unknown>,
  );

  // 3. Verifica cache
  const cacheado = await buscarCache(chave);
  if (cacheado) return cacheado;

  // 4. Chama o Gateway de IA
  const resposta = await chamarGatewayIA('resumo-dashboard', {
    periodo: { inicio: params.dataInicio, fim: params.dataFim },
    kpis,
  });

  // 5. Salva no cache
  await salvarCache(chave, 'resumo_dashboard', resposta);

  return resposta;
}
