// packages/types/index.ts
export * from './contexto.js';
export * from './opcoes.js';
export * from './usuario.js';

export interface Filial {
  cod_filial: number;
  filial: string;
  abreviatura: string;
}

export interface FilialDoUsuario {
  cod_filial: number;
  filial: string;
  abreviatura: string;
  padrao: boolean;
}

export interface JwtPayload {
  sub: number;
  login: string;
  role: 'admin' | 'user';
  meta_conformidade: number;
  filiais: FilialDoUsuario[];
  iat?: number;
  exp?: number;
}

export interface Usuario {
  id: number;
  nome: string;
  login: string;
  role: 'admin' | 'user';
  ativo: boolean;
  meta_conformidade: number;
  criadoEm?: string;
}