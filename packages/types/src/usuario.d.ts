export type Role = 'admin' | 'user';
export interface Usuario {
    id: number;
    nome: string;
    login: string;
    role: Role;
    ativo: boolean;
    criadoEm: string;
}
export interface JwtPayload {
    sub: number;
    login: string;
    role: Role;
    iat?: number;
    exp?: number;
}
