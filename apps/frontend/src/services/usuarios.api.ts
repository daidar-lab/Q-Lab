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

export const listarFiliaisUsuario = (id: number) =>
    request<{ cod_filial: number; filial_padrao: number }[]>(`/api/usuarios/${id}/filiais`);

export const vincularFilialUsuario = (id: number, cod_filial: number, filial_padrao: boolean) =>
    request<{ ok: boolean }>(`/api/usuarios/${id}/filiais`, { method: 'POST', body: { cod_filial, filial_padrao } });

export const desvincularFilialUsuario = (id: number, filialId: number) =>
    request<{ ok: boolean }>(`/api/usuarios/${id}/filiais/${filialId}`, { method: 'DELETE' });