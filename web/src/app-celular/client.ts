import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Cliente do SIMULADOR DE CELULAR.
 *
 * É um segundo cliente, com `storageKey` própria, para que a sessão do membro
 * (no "celular") conviva no mesmo navegador com a sessão do coordenador (no
 * painel). Mesmo backend, mesma RLS; só o cofre da sessão é separado.
 */
export const appSupabase = createClient<Database>(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_ANON_KEY,
  {
    auth: {
      storageKey: "nupdec-app-auth",
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  },
);

export const APP_VERSAO = `${__APP_VERSION__}-sim`;

/** Token de push do simulador: a Edge Function marca como entregue sem chamar o Expo. */
export function tokenSimulado(perfilId: string) {
  return `ExponentPushToken[sim-${perfilId.slice(0, 8)}]`;
}
