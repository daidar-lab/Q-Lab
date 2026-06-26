// apps/frontend/src/contexts/AuthProvider.tsx
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { me, logout as logoutApi, login as loginApi } from '../services/auth.api';
import type { Usuario } from '@qlab/types';

type UsuarioSemSenha = Omit<Usuario, 'senha'>;

interface AuthState {
  usuario: UsuarioSemSenha | null;
  carregando: boolean;
  autenticado: boolean;
  login: (loginStr: string, senhaStr: string) => Promise<void>;
  logout: () => void;
}

const AuthCtx = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<UsuarioSemSenha | null>(null);
  const [carregando, setCarregando] = useState(true);

  // Busca os dados do usuário logado ao carregar a aplicação
  useEffect(() => {
    const token = localStorage.getItem('qlab_token');
    if (!token) {
      setCarregando(false);
      return;
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

    // 2. Busca os dados do usuário logado imediatamente
    const dadosUsuario = await me();

    // 3. Atualiza o estado do React ANTES de mudar de página
    setUsuario(dadosUsuario);
  }

  // 🔥 Função de logout adaptada para limpar o estado em tempo real
  function logout() {
    logoutApi();
    setUsuario(null);
  }

  return (
    <AuthCtx.Provider value={{
      usuario,
      carregando,
      autenticado: !!usuario,
      login,
      logout,
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