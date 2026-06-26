// apps/backend/src/services/usuarios.service.ts
import { qlabPool } from '../db/qlab.pool';
import { qlabQuery } from '../db/qlab.pool';
import { hashSenha } from './auth.service';
import type { Usuario } from '@qlab/types';
import mysql from 'mysql2/promise';

// ─── Listar todos ─────────────────────────────────────────────────────────────

export async function listarUsuarios(): Promise<Omit<Usuario, 'senha'>[]> {
    return qlabQuery<Omit<Usuario, 'senha'>>(
        `SELECT id, nome, login, role, ativo, criado_em AS criadoEm
     FROM usuarios
     ORDER BY nome ASC`,
        [],
    );
}

// ─── Buscar por id ────────────────────────────────────────────────────────────

export async function buscarUsuarioPorId(
    id: number,
): Promise<Omit<Usuario, 'senha'> | null> {
    const rows = await qlabQuery<Omit<Usuario, 'senha'>>(
        `SELECT id, nome, login, role, ativo, criado_em AS criadoEm
     FROM usuarios WHERE id = ? LIMIT 1`,
        [id],
    );
    return rows[0] ?? null;
}

// ─── Criar ────────────────────────────────────────────────────────────────────

export async function criarUsuario(dados: {
    nome: string;
    login: string;
    senha: string;
    role?: 'admin' | 'user';
}): Promise<{ id: number }> {
    const hash = await hashSenha(dados.senha);

    const [result] = await qlabPool.execute<mysql.ResultSetHeader>(
        `INSERT INTO usuarios (nome, login, senha, role) VALUES (?, ?, ?, ?)`,
        [dados.nome, dados.login.trim(), hash, dados.role ?? 'user'],
    );
    return { id: result.insertId };
}

// ─── Atualizar ────────────────────────────────────────────────────────────────

export async function atualizarUsuario(
    id: number,
    dados: Partial<{ nome: string; login: string; senha: string; role: 'admin' | 'user'; ativo: boolean }>,
): Promise<void> {
    const campos: string[] = [];
    const params: unknown[] = [];

    if (dados.nome != null) { campos.push('nome = ?'); params.push(dados.nome); }
    if (dados.login != null) { campos.push('login = ?'); params.push(dados.login.trim()); }
    if (dados.role != null) { campos.push('role = ?'); params.push(dados.role); }
    if (dados.ativo != null) { campos.push('ativo = ?'); params.push(dados.ativo ? 1 : 0); }
    if (dados.senha != null) {
        campos.push('senha = ?');
        params.push(await hashSenha(dados.senha));
    }

    if (campos.length === 0) return;

    params.push(id);
    await qlabQuery(`UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`, params);
}

// ─── Desativar (soft delete) ──────────────────────────────────────────────────

export async function desativarUsuario(id: number): Promise<void> {
    await qlabQuery(`UPDATE usuarios SET ativo = 0 WHERE id = ?`, [id]);
}