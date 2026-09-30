// Edge Function: recibos-push
// Gatilho: cron (a cada 15 min) ou chamada manual.
// Consulta os recibos do Expo Push para entregas com ticket e sem recibo,
// preenche entregue_em / falha e remove tokens inválidos (DeviceNotRegistered).

import { clienteAdmin, json } from "../_shared/supabase.ts";
import { buscarRecibos, emLotes } from "../_shared/expo-push.ts";

Deno.serve(async () => {
  const sb = clienteAdmin();
  const { data: pendentes, error } = await sb.from("v_entregas_sem_recibo").select("id, push_ticket").limit(1000);
  if (error) return json({ erro: error.message }, 500);
  if (!pendentes?.length) return json({ processados: 0 });

  let entregues = 0, falhas = 0, tokensRemovidos = 0;

  for (const lote of emLotes(pendentes, 300)) {
    let recibos;
    try {
      recibos = await buscarRecibos(lote.map((p) => p.push_ticket));
    } catch (err) {
      console.error("recibos", (err as Error).message);
      continue;
    }

    for (const p of lote) {
      const r = recibos[p.push_ticket];
      if (!r) continue; // ainda não disponível
      if (r.status === "ok") {
        entregues++;
        await sb.from("alerta_entregas").update({ status: "entregue", entregue_em: new Date().toISOString() }).eq("id", p.id);
      } else {
        falhas++;
        await sb.from("alerta_entregas").update({ status: "falha" }).eq("id", p.id);
        if (r.details?.error === "DeviceNotRegistered") {
          // token morto: descobrir o dispositivo pela entrega → membro → perfil
          const { data: e } = await sb.from("alerta_entregas").select("membro_id").eq("id", p.id).single();
          if (e) {
            const { data: m } = await sb.from("membros").select("perfil_id").eq("id", e.membro_id).single();
            if (m) {
              const { count } = await sb.from("dispositivos").delete({ count: "exact" }).eq("perfil_id", m.perfil_id);
              tokensRemovidos += count ?? 0;
            }
          }
        }
      }
    }
  }

  return json({ processados: pendentes.length, entregues, falhas, tokensRemovidos });
});
