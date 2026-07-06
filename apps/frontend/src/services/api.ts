// apps/frontend/src/services/api.ts
// Base de todas as requisições — injeta JWT automaticamente em cada chamada

const BASE_URL = import.meta.env.VITE_API_URL;
const DEFAULT_REQUEST_TIMEOUT_MS = Number(import.meta.env.VITE_API_TIMEOUT_MS ?? 120000) || 120000;

type HttpMethod = 'GET' | 'POST' | 'PATCH' | 'DELETE' | 'PUT';

interface RequestOptions {
    method?: HttpMethod;
    body?: unknown;
    params?: Record<string, any>;
}

function buildUrl(path: string, params?: RequestOptions['params']): string {
    // Garante que não vai ter barra duplicada e nem falta dela
    const baseUrlClean = BASE_URL?.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const pathClean = path.startsWith('/') ? path : `/${path}`;

    const url = new URL(`${baseUrlClean}${pathClean}`);
    if (params) {
        Object.entries(params).forEach(([key, val]) => {
            if (val == null) return;
            // array → múltiplos valores com a mesma chave (ex: codSkipLote[])
            if (Array.isArray(val)) {
                val.forEach(v => url.searchParams.append(key, String(v)));
            } else {
                url.searchParams.set(key, String(val));
            }
        });
    }
    return url.toString();
}

function getToken(): string | null {
    return localStorage.getItem('qlab_token');
}

export function setToken(token: string): void {
    localStorage.setItem('qlab_token', token);
}

export function clearToken(): void {
    localStorage.removeItem('qlab_token');
}

export class ApiError extends Error {
    status: number;
    constructor(msg: string, status: number) {
        super(msg);
        this.status = status;
        this.name = 'ApiError';
    }
}

export async function request<T>(
    path: string,
    options: RequestOptions = {},
    timeoutMs: number = DEFAULT_REQUEST_TIMEOUT_MS, // default 120 seconds or env override
    retries: number = 1 // number of retry attempts on timeout
): Promise<T> {
    const { method = 'GET', body, params } = options;

    const headers: Record<string, string> = {
        'Content-Type': 'application/json',
    };

    const token = getToken();
    if (token) headers['Authorization'] = `Bearer ${token}`;

    for (let attempt = 0; attempt <= retries; attempt++) {
        const controller = new AbortController();
        const id = setTimeout(() => controller.abort(), timeoutMs);
        try {
            const res = await fetch(buildUrl(path, params), {
                method,
                headers,
                body: body != null ? JSON.stringify(body) : undefined,
                signal: controller.signal,
            });
            clearTimeout(id);

            if (!res.ok) {
                const data = await res.json().catch(() => ({}));
                if (res.status === 401) {
                    clearToken();
                    window.location.href = '/login';
                }
                throw new ApiError(data?.erro ?? 'Erro na requisição.', res.status);
            }

            return res.json() as Promise<T>;
        } catch (err: any) {
            clearTimeout(id);
            if (err.name === 'AbortError') {
                if (attempt < retries) {
                    // retry after a short delay
                    await new Promise(r => setTimeout(r, 500));
                    continue;
                }
                throw new ApiError('Request timeout', 504);
            }
            throw err;
        }
    }
    // Should never reach here
    throw new ApiError('Request failed after retries', 500);
}
