import { createContext, useCallback, useContext, useEffect, useState } from "react";
import type { Session } from "@supabase/supabase-js";
import { APP_VERSAO, appSupabase, tokenSimulado } from "./client";
import type { AuthPerfil } from "@/integrations/supabase/types";

export interface PerfilApp extends AuthPerfil {
  id: string;
  nome: string;
  email: string;
  nucleo_nome: string | null;
  municipio_nome: string | null;
}

interface Ctx {
  session: Session | null;
  perfil: PerfilApp | null;
  loading: boolean;
  signIn: (email: string, senha: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  recarregar: () => Promise<void>;
}

const AppAuthContext = createContext<Ctx>({
  session: null,
  perfil: null,
  loading: true,
  signIn: async () => "não inicializado",
  signOut: async () => {},
  recarregar: async () => {},
});

export const useAppAuth = () => useContext(AppAuthContext);

async function carregar(userId: string, email: string): Promise<PerfilApp | null> {
  const { data: rpc, error } = await appSupabase.rpc("auth_perfil");
  if (error || !rpc?.[0]) return null;
  const base = rpc[0];
  const [{ data: p }, { data: n }, { data: m }] = await Promise.all([
    appSupabase.from("perfis").select("nome").eq("id", userId).maybeSingle(),
    base.nucleo_id ? appSupabase.from("nucleos").select("nome").eq("id", base.nucleo_id).maybeSingle() : Promise.resolve({ data: null }),
    appSupabase.from("municipios").select("nome").eq("id", base.municipio_id).maybeSingle(),
  ]);
  return {
    ...base,
    id: userId,
    email,
    nome: p?.nome ?? email.split("@")[0],
    nucleo_nome: n?.nome ?? null,
    municipio_nome: m?.nome ?? null,
  };
}

/** Equivalente ao registro do token Expo no app real (expo-notifications). */
async function registrarDispositivo(userId: string) {
  await appSupabase.rpc("registrar_dispositivo", {
    p_token: tokenSimulado(userId),
    p_plataforma: "android-simulado",
    p_app_versao: APP_VERSAO,
  });
}

export function AppAuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [perfil, setPerfil] = useState<PerfilApp | null>(null);
  const [loading, setLoading] = useState(true);

  const recarregar = useCallback(async () => {
    const { data } = await appSupabase.auth.getSession();
    const s = data.session;
    setSession(s);
    if (s?.user) {
      setPerfil(await carregar(s.user.id, s.user.email ?? ""));
    } else {
      setPerfil(null);
    }
  }, []);

  useEffect(() => {
    void recarregar().finally(() => setLoading(false));
    const { data: sub } = appSupabase.auth.onAuthStateChange((_e, s) => {
      setSession(s);
      if (!s) setPerfil(null);
    });
    return () => sub.subscription.unsubscribe();
  }, [recarregar]);

  const signIn = useCallback(async (email: string, senha: string) => {
    const { data, error } = await appSupabase.auth.signInWithPassword({ email, password: senha });
    if (error) return error.message === "Invalid login credentials" ? "E-mail ou senha incorretos." : error.message;
    if (data.user) {
      await registrarDispositivo(data.user.id);
      setPerfil(await carregar(data.user.id, data.user.email ?? ""));
    }
    return null;
  }, []);

  const signOut = useCallback(async () => {
    await appSupabase.auth.signOut();
    setPerfil(null);
  }, []);

  return (
    <AppAuthContext.Provider value={{ session, perfil, loading, signIn, signOut, recarregar }}>
      {children}
    </AppAuthContext.Provider>
  );
}
