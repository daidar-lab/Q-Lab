// apps/frontend/src/contexts/AuthProvider.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { me, logout as logoutApi, login as loginApi, refresh as refreshApi } from '../services/auth.api';
import type { Usuario, JwtPayload, FilialDoUsuario } from '@qlab/types';
import { jwtDecode } from 'jwt-decode';

type UsuarioSemSenha = Omit<Usuario, 'senha'>;

interface AuthState {
  usuario: UsuarioSemSenha | null;
  carregando: boolean;
  autenticado: boolean;
  filiais: FilialDoUsuario[];
  meta: number;
  login: (loginStr: string, senhaStr: string) => Promise<void>;
  logout: () => void;
  refreshSession: () => Promise<void>;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSemSenha | null>(null);
  const [filiais, setFiliais] = useState<FilialDoUsuario[]>([]);
  const [meta, setMetaState] = useState<number>(95);
  const [carregando, setCarregando] = useState(true);

  // Busca os dados do usuário logado ao carregar a aplicação
  useEffect(() => {
    const token = localStorage.getItem('qlab_token');
    if (!token) {
      setCarregando(false);
      return;
    }
    try {
      const payload = jwtDecode<JwtPayload>(token);
      if (payload.filiais) setFiliais(payload.filiais);
      if (payload.meta_conformidade != null) setMetaState(payload.meta_conformidade);
    } catch (e) {
      console.error('Erro ao decodificar token:', e);
    }

    me()
      .then(setUsuario)
      .catch(() => setUsuario(null))
      .finally(() => setCarregando(false));
  }, []);

  // 🔥 Nova função de login que sincroniza o estado global imediatamente
  async function login(loginStr: string, senhaStr: string) {
    // 1. Faz a requisição e armazena o token via service
    await loginApi(loginStr, senhaStr);

    const token = localStorage.getItem('qlab_token');
    if (token) {
      try {
        const payload = jwtDecode<JwtPayload>(token);
        if (payload.filiais) setFiliais(payload.filiais);
        if (payload.meta_conformidade != null) setMetaState(payload.meta_conformidade);
      } catch (e) {
        console.error('Erro ao decodificar token no login:', e);
      }
    }

    // 2. Busca os dados do usuário logado imediatamente
    const dadosUsuario = await me();

    // 3. Atualiza o estado do React ANTES de mudar de página
    setUsuario(dadosUsuario);
  }

  // 🔥 Função de logout adaptada para limpar o estado em tempo real
  function logout() {
    logoutApi();
    setUsuario(null);
    setFiliais([]);
    setMetaState(95);
  }

  // Atualiza os dados do usuário e o token sem deslogar
  async function refreshSession() {
    await refreshApi();
    const token = localStorage.getItem('qlab_token');
    if (token) {
      try {
        const payload = jwtDecode<JwtPayload>(token);
        if (payload.filiais) setFiliais(payload.filiais);
        if (payload.meta_conformidade != null) setMetaState(payload.meta_conformidade);
      } catch (e) {
        console.error('Erro ao decodificar token no refresh:', e);
      }
    }
    const dadosUsuario = await me();
    setUsuario(dadosUsuario);
  }

  return (
    <AuthCtx.Provider value={{
      usuario,
      carregando,
      autenticado: !!usuario,
      filiais,
      meta,
      login,
      logout,
      refreshSession,
    }}>
      {children}
    </AuthCtx.Provider>
  );
}

export function useAuth(): AuthState {
  const ctx = useContext(AuthCtx);
  if (!ctx) throw new Error('useAuth deve ser usado dentro de AuthProvider');
  return ctx;
}