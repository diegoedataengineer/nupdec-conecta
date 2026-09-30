import { createClient } from "npm:@supabase/supabase-js@2";

/** Cliente com service_role — só dentro de Edge Functions (ADR-0002). */
export function clienteAdmin() {
  const url = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!url || !key) throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY ausentes");
  return createClient(url, key, { auth: { persistSession: false } });
}

export function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}
