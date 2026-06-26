// apps/backend/src/services/ia-gateway.service.ts
// ⚠️ PLACEHOLDER — ajustar payload e parsing quando o contrato do Gateway for definido.
// Único arquivo que muda quando o Gateway tiver contrato real.

import 'dotenv/config';

const IA_GATEWAY_URL = process.env.IA_GATEWAY_URL!;
const IA_GATEWAY_API_KEY = process.env.IA_GATEWAY_API_KEY!;

export interface RespostaIA {
  texto: string;
  destaques?: { valor: string; tipo: 'positivo' | 'critico' | 'neutro' }[];
  acoes?: string[];
}

//slug: /q-lab-dashboard
export async function chamarGatewayIA(slug: string, contexto: Record<string, unknown>): Promise<RespostaIA> {
  const response = await fetch(`${IA_GATEWAY_URL}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IA_GATEWAY_API_KEY,
    },
    body: JSON.stringify(contexto),
  });

  if (!response.ok) {
    throw new Error(`Gateway IA retornou ${response.status}`);
  }

  const raw = await response.json();

  // Formato real do b/Synapse: { success, data: { success, data: "texto..." } }
  const textoResposta = raw?.data?.data ?? raw?.data?.texto ?? raw?.texto ?? '';

  return {
    texto: textoResposta,
    destaques: raw?.data?.destaques ?? [],
    acoes: raw?.data?.acoes ?? [],
  };
}
