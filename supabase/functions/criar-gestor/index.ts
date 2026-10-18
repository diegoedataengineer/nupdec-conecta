// Edge Function: criar-gestor
// A Diretoria cria a conta de um coordenador ou agente e o vincula a uma
// coordenação. Só service_role pode criar usuários; por isso roda aqui, depois
// de confirmar (com o JWT de quem chamou) que o chamador é diretor.
//
// POST /functions/v1/criar-gestor   Authorization: Bearer <JWT do diretor>
// { "email", "senha", "nome", "telefone"?, "papel": "coordenador"|"agente", "coordenacao_id" }

import { createClient } from "npm:@supabase/supabase-js@2";
import { clienteAdmin, json } from "../_shared/supabase.ts";

const CORS = {
  "access-control-allow-origin": "*",
  "access-control-allow-headers": "authorization, x-client-info, apikey, content-type",
  "access-control-allow-methods": "POST, OPTIONS",
};
const resposta = (body: unknown, status = 200) => {
  const r = json(body, status);
  for (const [k, v] of Object.entries(CORS)) r.headers.set(k, v);
  return r;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return resposta({ erro: "use POST" }, 405);

  const jwt = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!jwt) return resposta({ erro: "não autenticado" }, 401);

  // quem chama precisa ser diretor — verificado com o próprio JWT (RLS/RPC)
  const chamador = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!, {
    global: { headers: { Authorization: `Bearer ${jwt}` } },
    auth: { persistSession: false },
  });
  const { data: perfil, error: errPerfil } = await chamador.rpc("auth_perfil");
  if (errPerfil || perfil?.[0]?.papel !== "diretor") return resposta({ erro: "apenas a diretoria cria gestores" }, 403);

  let p: Record<string, string>;
  try {
    p = await req.json();
  } catch {
    return resposta({ erro: "JSON inválido" }, 400);
  }
  const faltando = ["email", "senha", "nome", "papel", "coordenacao_id"].filter((k) => !p[k]);
  if (faltando.length) return resposta({ erro: `campos obrigatórios: ${faltando.join(", ")}` }, 400);
  if (!["coordenador", "agente"].includes(p.papel)) return resposta({ erro: "papel deve ser coordenador ou agente" }, 400);
  if (p.senha.length < 8) return resposta({ erro: "senha com pelo menos 8 caracteres" }, 400);

  const admin = clienteAdmin();
  const { data: coord, error: errCoord } = await admin.from("coordenacoes").select("id, municipio_id, nome").eq("id", p.coordenacao_id).single();
  if (errCoord || !coord) return resposta({ erro: "coordenação não encontrada" }, 404);
  if (!coord.municipio_id) return resposta({ erro: "a coordenação precisa de um município de referência para lotar o gestor" }, 400);

  const { data: criado, error: errUser } = await admin.auth.admin.createUser({
    email: p.email.trim().toLowerCase(),
    password: p.senha,
    email_confirm: true,
    user_metadata: { nome: p.nome.trim(), telefone: p.telefone ?? null, papel: p.papel, municipio_id: coord.municipio_id },
  });
  if (errUser || !criado.user) return resposta({ erro: errUser?.message ?? "não foi possível criar o usuário" }, 400);

  // o trigger handle_novo_usuario já criou o perfil; falta o vínculo com a coordenação
  const { error: errVinc } = await admin.from("perfis").update({ coordenacao_id: coord.id }).eq("id", criado.user.id);
  if (errVinc) return resposta({ erro: errVinc.message, usuario_id: criado.user.id }, 500);

  return resposta({ usuario_id: criado.user.id, email: criado.user.email, papel: p.papel, coordenacao: coord.nome }, 201);
});
