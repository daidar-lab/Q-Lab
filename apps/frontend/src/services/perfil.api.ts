import { request } from './api';
import type { FilialDoUsuario } from '@qlab/types';

export interface PerfilCompleto {
  nome: string;
  login: string;
  role: string;
  meta_conformidade: number;
  filiais: FilialDoUsuario[];
}

export const getPerfil = () =>
  request<PerfilCompleto>('/api/perfil');

export const atualizarMeta = (meta: number) =>
  request<{ ok: boolean }>('/api/perfil/meta', {
    method: 'PUT',
    body: { meta_conformidade: meta },
  });

export const atualizarSenha = (senhaAtual: string, novaSenha: string) =>
  request<{ ok: boolean }>('/api/perfil/senha', {
    method: 'PUT',
    body: { senhaAtual, novaSenha },
  });

export const atualizarFilialPadrao = (cod_filial: number) =>
  request<{ ok: boolean }>('/api/perfil/filial-padrao', {
    method: 'PUT',
    body: { cod_filial },
  });
