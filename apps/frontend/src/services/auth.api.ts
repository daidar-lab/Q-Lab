// apps/frontend/src/services/auth.api.ts
import { request, setToken, clearToken } from './api';
import type { Usuario } from '@qlab/types';

interface LoginResponse {
    token: string;
    usuario: Omit<Usuario, 'senha'>;
}

export async function login(login: string, senha: string): Promise<LoginResponse> {
    const res = await request<LoginResponse>('/api/auth/login', {
        method: 'POST',
        body: { login, senha },
    });
    setToken(res.token);
    return res;
}

export async function me(): Promise<Omit<Usuario, 'senha'>> {
    return request('/api/auth/me');
}

export function logout(): void {
    clearToken();
    window.location.href = '/login';
}