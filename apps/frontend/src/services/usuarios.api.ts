// apps/frontend/src/services/usuarios.api.ts
import { request } from './api';
import type { Usuario, Role } from '@qlab/types';

type UsuarioSemSenha = Omit<Usuario, 'senha'>;

export const listar = () =>
    request<UsuarioSemSenha[]>('/api/usuarios');

export const buscar = (id: number) =>
    request<UsuarioSemSenha>(`/api/usuarios/${id}`);

export const criar = (dados: { nome: string; login: string; senha: string; role?: Role }) =>
    request<{ id: number }>('/api/usuarios', { method: 'POST', body: dados });

export const atualizar = (id: number, dados: Partial<{ nome: string; login: string; senha: string; role: Role; ativo: boolean }>) =>
    request<{ ok: boolean }>(`/api/usuarios/${id}`, { method: 'PATCH', body: dados });

export const desativar = (id: number) =>
    request<{ ok: boolean }>(`/api/usuarios/${id}`, { method: 'DELETE' });