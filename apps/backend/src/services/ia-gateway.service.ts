// apps/backend/src/services/ia-gateway.service.ts
// ⚠️ PLACEHOLDER — ajustar payload e parsing quando o contrato do Gateway for definido.
// Único arquivo que muda quando o Gateway tiver contrato real.

import 'dotenv/config';

const IA_GATEWAY_URL = process.env.IA_GATEWAY_URL!;
const IA_GATEWAY_API_KEY = process.env.IA_GATEWAY_API_KEY!;
const IA_GATEWAY_URL2 = process.env.IA_GATEWAY_URL2!;
const IA_GATEWAY_API_KEY2 = process.env.IA_GATEWAY_API_KEY2!;
const IA_GATEWAY_URL3 = process.env.IA_GATEWAY_URL3!;
const IA_GATEWAY_API_KEY3 = process.env.IA_GATEWAY_API_KEY3!;
const IA_GATEWAY_URL4 = process.env.IA_GATEWAY_URL4!;
const IA_GATEWAY_API_KEY4 = process.env.IA_GATEWAY_API_KEY4!;
const IA_GATEWAY_URL5 = process.env.IA_GATEWAY_URL5!;
const IA_GATEWAY_API_KEY5 = process.env.IA_GATEWAY_API_KEY5!;

export interface AcaoIA {
  tipo: 'processo' | 'ensaio';
  id: string | number;
  label: string;
}

export interface RespostaIA {
  texto: string;
  destaques?: string[];
  acoes?: AcaoIA[];
}

//slug: /q-lab-dashboard
export async function chamarGatewayIA(slug: string, contexto: Record<string, unknown>): Promise<RespostaIA> {
  const response = await fetch(IA_GATEWAY_URL, {
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

//slug: /q-lab-detalhe
export async function chamarGatewayIA2(slug: string, contexto: Record<string, unknown>): Promise<RespostaIA> {
  const response = await fetch(IA_GATEWAY_URL2, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IA_GATEWAY_API_KEY2,
    },
    body: JSON.stringify(contexto),
  });

  if (!response.ok) {
    throw new Error(`Gateway IA 2 retornou ${response.status}`);
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

//slug: /export-dashboard
export async function chamarGatewayIA3(slug: string, contexto: Record<string, unknown>): Promise<RespostaIA> {
  const response = await fetch(IA_GATEWAY_URL3, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IA_GATEWAY_API_KEY3,
    },
    body: JSON.stringify(contexto),
  });

  if (!response.ok) {
    throw new Error(`Gateway IA 3 retornou ${response.status}`);
  }

  const raw = await response.json();
  const textoResposta = raw?.data?.data ?? raw?.data?.texto ?? raw?.texto ?? '';

  return {
    texto: textoResposta,
    destaques: raw?.data?.destaques ?? [],
    acoes: raw?.data?.acoes ?? [],
  };
}

//slug: /export-detalhe
export async function chamarGatewayIA4(slug: string, contexto: Record<string, unknown>): Promise<RespostaIA> {
  const response = await fetch(IA_GATEWAY_URL4, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IA_GATEWAY_API_KEY4,
    },
    body: JSON.stringify(contexto),
  });

  if (!response.ok) {
    throw new Error(`Gateway IA 4 retornou ${response.status}`);
  }

  const raw = await response.json();
  const textoResposta = raw?.data?.data ?? raw?.data?.texto ?? raw?.texto ?? '';

  return {
    texto: textoResposta,
    destaques: raw?.data?.destaques ?? [],
    acoes: raw?.data?.acoes ?? [],
  };
}

//slug: /export-faixa
export async function chamarGatewayIA5(slug: string, contexto: Record<string, unknown>): Promise<RespostaIA> {
  const response = await fetch(IA_GATEWAY_URL5, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': IA_GATEWAY_API_KEY5,
    },
    body: JSON.stringify(contexto),
  });

  if (!response.ok) {
    throw new Error(`Gateway IA 5 retornou ${response.status}`);
  }

  const raw = await response.json();
  const textoResposta = raw?.data?.data ?? raw?.data?.texto ?? raw?.texto ?? '';

  return {
    texto: textoResposta,
    destaques: raw?.data?.destaques ?? [],
    acoes: raw?.data?.acoes ?? [],
  };
}
