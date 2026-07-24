// apps/backend/src/services/auth.service.ts

import bcrypt from 'bcryptjs';
import { qlabQuery } from '../db/qlab.pool';
import type { Usuario, JwtPayload, FilialDoUsuario } from '@qlab/types';
import jwt, { type SignOptions } from 'jsonwebtoken';
import { getFiliais } from './filiais.service';

type UsuarioComSenha = Usuario & { senha: string };

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '8h';


// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(
    loginStr: string,
    senha: string,
): Promise<{ token: string; usuario: Omit<Usuario, 'senha'> }> {
    const rows = await qlabQuery<UsuarioComSenha>(
        `SELECT id, nome, login, senha, role, ativo, meta_conformidade FROM usuarios WHERE login = ? LIMIT 1`,
        [loginStr.trim()],
    );


    const usuario = rows[0];

    if (!usuario) throw new ErroAuth('Credenciais inválidas.');
    if (!usuario.ativo) throw new ErroAuth('Usuário inativo.');

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) throw new ErroAuth('Credenciais inválidas.');

    const filiaisVinculo = await qlabQuery<{ cod_filial: number; filial_padrao: number }>(
        `SELECT cod_filial, filial_padrao
         FROM usuario_filial
         WHERE cod_usuario = ?
         ORDER BY filial_padrao DESC`,
        [usuario.id],
    );

    const todasFiliais = await getFiliais();
    const filiaisMap = new Map(todasFiliais.map(f => [f.cod_filial, f]));

    const filiais: FilialDoUsuario[] = filiaisVinculo.map(v => {
        const dim = filiaisMap.get(v.cod_filial);
        return {
            cod_filial:   v.cod_filial,
            filial:       dim?.filial      ?? `Filial ${v.cod_filial}`,
            abreviatura:  dim?.abreviatura ?? String(v.cod_filial),
            padrao:       v.filial_padrao === 1,
        };
    });

    const payload: JwtPayload = {
        sub:               usuario.id,
        login:             usuario.login,
        role:              usuario.role,
        meta_conformidade: Number(usuario.meta_conformidade ?? 95.00),
        filiais,
    };
    const options: SignOptions = { expiresIn: JWT_EXPIRES as SignOptions['expiresIn'] };
    const token = jwt.sign(payload, JWT_SECRET, options);

    const { senha: _, ...usuarioSemSenha } = usuario;
    return { token, usuario: usuarioSemSenha };
}

// ─── Renovar Token ───────────────────────────────────────────────────────────

export async function renovarToken(
    usuarioId: number
): Promise<{ token: string; usuario: Omit<Usuario, 'senha'> }> {
    const rows = await qlabQuery<Usuario>(
        `SELECT id, nome, login, role, ativo, meta_conformidade FROM usuarios WHERE id = ? LIMIT 1`,
        [usuarioId],
    );

    const usuario = rows[0];
    if (!usuario) throw new ErroAuth('Usuário não encontrado.');
    if (!usuario.ativo) throw new ErroAuth('Usuário inativo.');

    const filiaisVinculo = await qlabQuery<{ cod_filial: number; filial_padrao: number }>(
        `SELECT cod_filial, filial_padrao
         FROM usuario_filial
         WHERE cod_usuario = ?
         ORDER BY filial_padrao DESC`,
        [usuario.id],
    );

    const todasFiliais = await getFiliais();
    const filiaisMap = new Map(todasFiliais.map(f => [f.cod_filial, f]));

    const filiais: FilialDoUsuario[] = filiaisVinculo.map(v => {
        const dim = filiaisMap.get(v.cod_filial);
        return {
            cod_filial:   v.cod_filial,
            filial:       dim?.filial      ?? `Filial ${v.cod_filial}`,
            abreviatura:  dim?.abreviatura ?? String(v.cod_filial),
            padrao:       v.filial_padrao === 1,
        };
    });

    const payload: JwtPayload = {
        sub:               usuario.id,
        login:             usuario.login,
        role:              usuario.role,
        meta_conformidade: Number(usuario.meta_conformidade ?? 95.00),
        filiais,
    };
    const options: SignOptions = { expiresIn: JWT_EXPIRES as SignOptions['expiresIn'] };
    const token = jwt.sign(payload, JWT_SECRET, options);

    return { token, usuario };
}

// ─── Verificar token ─────────────────────────────────────────────────────────

export function verificarToken(token: string): JwtPayload {
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as unknown as JwtPayload;
        if (!decoded || typeof decoded !== 'object') throw new ErroAuth('Token inválido.');
        return decoded;
    } catch {
        throw new ErroAuth('Token inválido ou expirado.');
    }
}
// ─── Hash de senha ────────────────────────────────────────────────────────────

export async function hashSenha(senha: string): Promise<string> {
    return bcrypt.hash(senha, 12);
}

export async function compareSenha(senha: string, hash: string): Promise<boolean> {
    return bcrypt.compare(senha, hash);
}

// ─── Erro tipado ──────────────────────────────────────────────────────────────

export class ErroAuth extends Error {
    status = 401;
    constructor(msg: string) {
        super(msg);
        this.name = 'ErroAuth';
    }
}