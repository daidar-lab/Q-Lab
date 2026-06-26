// apps/backend/src/services/auth.service.ts

import bcrypt from 'bcryptjs';
import { qlabQuery } from '../db/qlab.pool';
import type { Usuario, JwtPayload } from '@qlab/types';
import jwt, { type SignOptions } from 'jsonwebtoken';

type UsuarioComSenha = Usuario & { senha: string };

const JWT_SECRET = process.env.JWT_SECRET!;
const JWT_EXPIRES = process.env.JWT_EXPIRES ?? '8h';


// ─── Login ───────────────────────────────────────────────────────────────────

export async function login(
    loginStr: string,
    senha: string,
): Promise<{ token: string; usuario: Omit<Usuario, 'senha'> }> {
    const rows = await qlabQuery<UsuarioComSenha>(
        `SELECT id, nome, login, senha, role, ativo FROM usuarios WHERE login = ? LIMIT 1`,
        [loginStr.trim()],
    );


    const usuario = rows[0];

    if (!usuario) throw new ErroAuth('Credenciais inválidas.');
    if (!usuario.ativo) throw new ErroAuth('Usuário inativo.');

    const senhaValida = await bcrypt.compare(senha, usuario.senha);
    if (!senhaValida) throw new ErroAuth('Credenciais inválidas.');

    const payload: JwtPayload = {
        sub: usuario.id,
        login: usuario.login,
        role: usuario.role,
    };
    const options: SignOptions = { expiresIn: JWT_EXPIRES as SignOptions['expiresIn'] };
    const token = jwt.sign(payload, JWT_SECRET, options);

    const { senha: _, ...usuarioSemSenha } = usuario;
    return { token, usuario: usuarioSemSenha };
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

// ─── Erro tipado ──────────────────────────────────────────────────────────────

export class ErroAuth extends Error {
    status = 401;
    constructor(msg: string) {
        super(msg);
        this.name = 'ErroAuth';
    }
}