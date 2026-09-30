// Edge Function: ingerir-alerta
// Recebe um alerta de fonte externa (Cemaden/INMET via webhook, ou payload simulado
// para o protótipo), normaliza e insere em public.alertas. O trigger enfileira o disparo.
//
// POST /functions/v1/ingerir-alerta
// Authorization: Bearer <INGESTAO_TOKEN>   (secret da função; evita chamadas anônimas)
// {
//   "origem": "cemaden" | "inmet",
//   "origem_ref": "id externo (opcional; evita duplicidade)",
//   "codigo_ibge": "3599999",
//   "tipo": "deslizamento" | "inundacao" | "enxurrada" | "vendaval" | "outro",
//   "severidade": "observacao" | "atencao" | "alerta" | "alerta_maximo",
//   "titulo": "...", "mensagem": "...",
//   "area": <GeoJSON Polygon/MultiPolygon>   (opcional; sem área usa o limite do município)
// }

import { clienteAdmin, json } from "../_shared/supabase.ts";

const TIPOS = ["deslizamento", "inundacao", "enxurrada", "vendaval", "outro"];
const SEVERIDADES = ["observacao", "atencao", "alerta", "alerta_maximo"];
const ORIGENS = ["cemaden", "inmet"];

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ erro: "use POST" }, 405);

  const esperado = Deno.env.get("INGESTAO_TOKEN");
  const recebido = req.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
  if (!esperado || recebido !== esperado) return json({ erro: "não autorizado" }, 401);

  let p: Record<string, unknown>;
  try {
    p = await req.json();
  } catch {
    return json({ erro: "JSON inválido" }, 400);
  }

  const faltando = ["origem", "codigo_ibge", "tipo", "severidade", "titulo", "mensagem"].filter((k) => !p[k]);
  if (faltando.length) return json({ erro: `campos obrigatórios: ${faltando.join(", ")}` }, 400);
  if (!ORIGENS.includes(p.origem as string)) return json({ erro: "origem inválida" }, 400);
  if (!TIPOS.includes(p.tipo as string)) return json({ erro: "tipo inválido" }, 400);
  if (!SEVERIDADES.includes(p.severidade as string)) return json({ erro: "severidade inválida" }, 400);

  const sb = clienteAdmin();

  const { data: mun, error: errMun } = await sb
    .from("municipios")
    .select("id, limite:limite_geojson")
    .eq("codigo_ibge", p.codigo_ibge as string)
    .single();
  if (errMun || !mun) return json({ erro: `município ${p.codigo_ibge} não cadastrado` }, 404);

  if (p.origem_ref) {
    const { data: existente } = await sb
      .from("alertas").select("id").eq("origem", p.origem as string).eq("origem_ref", p.origem_ref as string).maybeSingle();
    if (existente) return json({ alerta_id: existente.id, duplicado: true });
  }

  const area = (p.area as unknown) ?? mun.limite;
  if (!area) return json({ erro: "sem área no payload e município sem limite cadastrado" }, 400);

  // Insere via SQL para converter o GeoJSON em geometry com SRID 4326.
  const { data, error } = await sb.rpc("inserir_alerta_externo", {
    p_municipio_id: mun.id,
    p_origem: p.origem,
    p_origem_ref: p.origem_ref ?? null,
    p_tipo: p.tipo,
    p_severidade: p.severidade,
    p_titulo: p.titulo,
    p_mensagem: p.mensagem,
    p_area_geojson: area,
  });
  if (error) return json({ erro: error.message }, 500);

  return json({ alerta_id: data, duplicado: false }, 201);
});
