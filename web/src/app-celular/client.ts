import { createContext, useContext } from "react";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

/**
 * Clientes do SIMULADOR DE CELULAR.
 *
 * Cada "aparelho" (slot) tem um cliente com `storageKey` própria, para que
 * várias sessões de membro convivam no mesmo navegador — entre si e com a
 * sessão do coordenador no painel. Mesmo backend, mesma RLS; só o cofre da
 * sessão é separado. O slot 0 é o /app normal; 1–4 são o modo de demonstração
 * com quatro celulares lado a lado (/demo).
 */
const cache = new Map<number, SupabaseClient<Database>>();

export function clienteApp(slot = 0): SupabaseClient<Database> {
  let c = cache.get(slot);
  if (!c) {
    c = createClient<Database>(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY, {
      auth: {
        storageKey: slot === 0 ? "nupdec-app-auth" : `nupdec-app-auth-${slot}`,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
    cache.set(slot, c);
  }
  return c;
}

/** Compatibilidade: cliente do slot 0. Prefira `useAppClient()` dentro de componentes. */
export const appSupabase = clienteApp(0);

export const AppClientContext = createContext<{ slot: number; sb: SupabaseClient<Database> }>({ slot: 0, sb: appSupabase });
export const useAppClient = () => useContext(AppClientContext).sb;
export const useAppSlot = () => useContext(AppClientContext).slot;

export const APP_VERSAO = `${__APP_VERSION__}-sim`;

/** Token de push do simulador: a Edge Function marca como entregue sem chamar o Expo. */
export function tokenSimulado(perfilId: string) {
  return `ExponentPushToken[sim-${perfilId.slice(0, 8)}]`;
}
