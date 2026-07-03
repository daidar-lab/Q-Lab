import { chamarGatewayIA2 } from './ia-gateway.service';
import { gerarChaveCache, buscarCache, salvarCache } from './cache-ia.service';
import { getDetalheCompleto } from './detalhe.service';

interface ResumoDetalheParams {
  tipo: 'processo' | 'produto' | 'ensaio';
  id: string | number;
  dataInicio: string;
  dataFim: string;
}

export async function getResumoDetalheIA(params: ResumoDetalheParams) {
  // 1. Busca os dados reais do detalhe (mesmo que já foram buscados pelo controller,
  //    mas o cache do MySQL torna isso barato — e mantém o serviço autocontido)
  const detalhe = await getDetalheCompleto(params);

  // 2. Fingerprint baseado nos dados numéricos reais
  const chave = gerarChaveCache(
    'resumo_detalhe',
    { tipo: params.tipo, id: String(params.id), dataInicio: params.dataInicio, dataFim: params.dataFim },
    {
      resumo: detalhe.resumo,
      faixas: detalhe.faixas,
      serie: detalhe.serie,
    } as unknown as Record<string, unknown>
  );

  // 3. Verifica cache
  const cacheado = await buscarCache(chave);
  if (cacheado) return cacheado;

  // 4. Monta contexto rico para o gateway
  const contexto = {
    tipo: params.tipo,
    id: params.id,
    periodo: { inicio: params.dataInicio, fim: params.dataFim },
    resumo: detalhe.resumo,
    // Top ensaios mais problemáticos (maiores % de NC)
    faixas: detalhe.faixas.map((f: any) => ({
      ensaio: f.ensaio,
      pct_conforme: f.pct_conforme,
      pct_nao_conforme: f.pct_nao_conforme,
      n: f.n,
      lie: f.lie,
      lse: f.lse,
      media: f.media,
    })),
    // Tendência temporal (últimos pontos da série)
    serie: detalhe.serie.dados?.slice(-6) ?? [],
  };

  // 5. Chama o gateway
  const resposta = await chamarGatewayIA2('resumo-detalhe', contexto);

  // 6. Salva cache
  await salvarCache(chave, 'resumo_detalhe', resposta);

  return resposta;
}
