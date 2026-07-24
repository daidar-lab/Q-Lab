import { qlabQuery, qlabPool } from '../db/qlab.pool';
import { getFiliais } from './filiais.service';
import { hashSenha, compareSenha } from './auth.service';
import type { FilialDoUsuario } from '@qlab/types';

export async function getMeuPerfil(codUsuario: number) {
  const rows = await qlabQuery<{
    nome: string;
    login: string;
    role: string;
    meta_conformidade: number;
  }>(
    `SELECT nome, login, role, meta_conformidade
     FROM usuarios
     WHERE id = ?
     LIMIT 1`,
    [codUsuario],
  );
  const usuario = rows[0];
  if (!usuario) throw new Error('Usuário não encontrado.');

  const filiaisVinculo = await qlabQuery<{ cod_filial: number; filial_padrao: number }>(
    `SELECT cod_filial, filial_padrao
     FROM usuario_filial
     WHERE cod_usuario = ?
     ORDER BY filial_padrao DESC`,
    [codUsuario],
  );

  const todasFiliais = await getFiliais();
  const filiaisMap = new Map(todasFiliais.map(f => [f.cod_filial, f]));

  const filiais: FilialDoUsuario[] = filiaisVinculo.map(v => ({
    cod_filial:   v.cod_filial,
    filial:       filiaisMap.get(v.cod_filial)?.filial      ?? `Filial ${v.cod_filial}`,
    abreviatura:  filiaisMap.get(v.cod_filial)?.abreviatura ?? String(v.cod_filial),
    padrao:       v.filial_padrao === 1,
  }));

  return { ...usuario, filiais };
}

export async function atualizarMeta(codUsuario: number, meta: number): Promise<void> {
  if (meta < 0 || meta > 100) throw new Error('Meta deve estar entre 0 e 100.');
  await qlabQuery(
    `UPDATE usuarios SET meta_conformidade = ? WHERE id = ?`,
    [meta, codUsuario],
  );
}

export async function atualizarSenhaSegura(codUsuario: number, senhaAtual: string, novaSenha: string): Promise<void> {
  const rows = await qlabQuery<{senha: string}>(
    `SELECT senha FROM usuarios WHERE id = ? LIMIT 1`,
    [codUsuario]
  );
  if (!rows[0]) throw new Error('Usuário não encontrado.');

  const ok = await compareSenha(senhaAtual, rows[0].senha);
  if (!ok) throw new Error('Senha atual incorreta.');

  const hash = await hashSenha(novaSenha);
  await qlabQuery(
    `UPDATE usuarios SET senha = ? WHERE id = ?`,
    [hash, codUsuario],
  );
}

export async function atualizarFilialPadrao(codUsuario: number, codFilial: number): Promise<void> {
  const rows = await qlabQuery<{ id: number }>(
    `SELECT id FROM usuario_filial
     WHERE cod_usuario = ? AND cod_filial = ?
     LIMIT 1`,
    [codUsuario, codFilial],
  );
  if (!rows[0]) throw new Error('Filial não vinculada a este usuário.');

  const conn = await qlabPool.getConnection();
  try {
    await conn.beginTransaction();
    await conn.execute(
      `UPDATE usuario_filial SET filial_padrao = 0 WHERE cod_usuario = ?`,
      [codUsuario],
    );
    await conn.execute(
      `UPDATE usuario_filial SET filial_padrao = 1
       WHERE cod_usuario = ? AND cod_filial = ?`,
      [codUsuario, codFilial],
    );
    await conn.commit();
  } catch (e) {
    await conn.rollback();
    throw e;
  } finally {
    conn.release();
  }
}
