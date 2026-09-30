import { createClient } from "@supabase/supabase-js";
import type { Database } from "./types";

const url = import.meta.env.VITE_SUPABASE_URL;
const anonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Falha cedo e com mensagem clara: sem isso o painel abre em branco.
  throw new Error("VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY precisam estar definidas (veja .env.example).");
}

/**
 * Cliente único do Supabase. Só usa a chave `anon` + sessão do usuário; a
 * autorização real é a RLS (ADR-0006). `service_role` nunca entra no bundle.
 */
export const supabase = createClient<Database>(url, anonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});

export const MAP_STYLE_URL =
  import.meta.env.VITE_MAP_STYLE_URL || "https://tiles.openfreemap.org/styles/liberty";
export const APK_VERSION = import.meta.env.VITE_APK_VERSION || __APP_VERSION__;
export const APK_URL = import.meta.env.VITE_APK_URL || "/downloads/nupdec-conecta.apk";
export const REPO_URL = "https://github.com/diegoedataengineer/nupdec-conecta";
