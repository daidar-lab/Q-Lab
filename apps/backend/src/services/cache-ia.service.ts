// apps/backend/src/services/cache-ia.service.ts

import crypto from 'crypto';
import { qlabPool } from '../db/qlab.pool';

function gerarFingerprint(dados: Record<string, unknown>): string {
  const json = JSON.stringify(dados, Object.keys(dados).sort());
  return crypto.createHash('md5').update(json).digest('hex');
}

export function gerarChaveCache(
  tipoBloco: string,
  paramsContexto: Record<string, unknown>,
  dadosNumericos: Record<string, unknown>,
): string {
  const fingerprint = gerarFingerprint(dadosNumericos);
  const paramsStr   = Object.values(paramsContexto).join(':');
  return `${tipoBloco}:${paramsStr}:${fingerprint}`;
}

export async function buscarCache(chave: string): Promise<any | null> {
  const [rows] = await qlabPool.execute(
    'SELECT resposta_json FROM cache_ia WHERE id = ?',
    [chave],
  );
  const row = (rows as any[])[0];
  if (!row) return null;
  return JSON.parse(row.resposta_json);
}

export async function salvarCache(
  chave: string,
  tipoBloco: string,
  resposta: unknown,
): Promise<void> {
  await qlabPool.execute(
    `INSERT INTO cache_ia (id, tipo_bloco, resposta_json)
     VALUES (?, ?, ?)
     ON DUPLICATE KEY UPDATE resposta_json = ?, criado_em = CURRENT_TIMESTAMP`,
    [chave, tipoBloco, JSON.stringify(resposta), JSON.stringify(resposta)],
  );
}
