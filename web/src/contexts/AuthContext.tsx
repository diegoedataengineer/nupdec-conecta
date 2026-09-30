import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { AuthPerfil, Papel } from "@/integrations/supabase/types";

// ---------------------------------------------------------------------------
// Tipos
// ---------------------------------------------------------------------------

export interface PerfilSessao extends AuthPerfil {
  nome: string;
  telefone: string | null;
  email: string;
}

interface AuthContextType {
  session: Session | null;
  user: User | null;
  /** papel, município e vínculo de membro — vem da RPC `auth_perfil` + tabela `perfis` */
  perfil: PerfilSessao | null;
  loading: boolean;
  /** agente ou coordenador */
  eGestor: boolean;
  eCoordenador: boolean;
  signIn: (email: string, senha: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
}

// ---------------------------------------------------------------------------
// Contexto
// ---------------------------------------------------------------------------

const AuthContext = createContext<AuthContextType>({
  session: null,
  user: null,
  perfil: null,
  loading: true,
  eGestor: false,
  eCoordenador: false,
  signIn: async () => ({ error: "não inicializado" }),
  signOut: async () => {},
});

export const useAuth = () => useContext(AuthContext);

const GESTORES: Papel[] = ["agente", "coordenador"];

async function carregarPerfil(user: User): Promise<PerfilSessao | null> {
  const [{ data: rpc, error: erroRpc }, { data: linha }] = await Promise.all([
    supabase.rpc("auth_perfil"),
    supabase.from("perfis").select("nome, telefone").eq("id", user.id).maybeSingle(),
  ]);
  if (erroRpc) {
    console.error("auth_perfil:", erroRpc.message);
    return null;
  }
  const base = rpc?.[0];
  if (!base) return null;
  return {
    ...base,
    nome: linha?.nome ?? user.email?.split("@")[0] ?? "",
    telefone: linha?.telefone ?? null,
    email: user.email ?? "",
  };
}

// ---------------------------------------------------------------------------
// Provider
// ---------------------------------------------------------------------------

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilSessao | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let ativo = true;

    // Sessão inicial (persistida no localStorage pelo supabase-js).
    supabase.auth.getSession().then(async ({ data }) => {
      if (!ativo) return;
      setSession(data.session);
      if (data.session?.user) setPerfil(await carregarPerfil(data.session.user));
      if (ativo) setLoading(false);
    });

    // Mudanças de sessão: login, logout, refresh do token.
    const { data: sub } = supabase.auth.onAuthStateChange((evento, nova) => {
      if (!ativo) return;
      setSession(nova);
      if (evento === "SIGNED_OUT" || !nova?.user) {
        setPerfil(null);
        return;
      }
      if (evento === "SIGNED_IN" || evento === "USER_UPDATED") {
        // Sem await dentro do callback: o supabase-js pede que ele não bloqueie.
        void carregarPerfil(nova.user).then((p) => ativo && setPerfil(p));
      }
    });

    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password: senha });
    if (error) {
      return {
        error: error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message,
      };
    }
    if (data.user) setPerfil(await carregarPerfil(data.user));
    return { error: null };
  }, []);

  const signOut = useCallback(async () => {
    await supabase.auth.signOut();
    setSession(null);
    setPerfil(null);
  }, []);

  const eGestor = !!perfil && GESTORES.includes(perfil.papel);
  const eCoordenador = perfil?.papel === "coordenador";

  return (
    <AuthContext.Provider
      value={{ session, user: session?.user ?? null, perfil, loading, eGestor, eCoordenador, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
};
