// Edge Function: disparar-alerta
// Gatilho: database webhook em INSERT de public.alertas (payload {record:{id}})
//          ou chamada manual POST {"alerta_id": "..."}; sem corpo, processa a fila pendente.
// Fluxo (ADR-0007): gerar_entregas() → push em lotes → grava tickets → marca disparo concluído.

import { clienteAdmin, json } from "../_shared/supabase.ts";
import { ehTokenExpo, emLotes, enviarLote, type MensagemPush } from "../_shared/expo-push.ts";

const ROTULO_SEVERIDADE: Record<string, string> = {
  observacao: "Observação",
  atencao: "Atenção",
  alerta: "ALERTA",
  alerta_maximo: "ALERTA MÁXIMO",
};

interface Entrega { o_entrega_id: string; o_membro_id: string; o_expo_push_token: string }

async function processarAlerta(alertaId: string) {
  const sb = clienteAdmin();

  await sb.from("alerta_disparos")
    .update({ status: "processando", atualizado_em: new Date().toISOString() })
    .eq("alerta_id", alertaId);

  const { data: alerta, error: errAlerta } = await sb
    .from("alertas")
    .select("id, titulo, mensagem, severidade, tipo, encerrado_em")
    .eq("id", alertaId)
    .single();
  if (errAlerta || !alerta) throw new Error(`alerta ${alertaId} não encontrado: ${errAlerta?.message}`);

  const { data: entregas, error: errEntregas } = await sb.rpc("gerar_entregas", { p_alerta_id: alertaId });
  if (errEntregas) throw new Error(`gerar_entregas: ${errEntregas.message}`);

  const validas = (entregas as Entrega[]).filter((e) => ehTokenExpo(e.o_expo_push_token));
  const agora = new Date().toISOString();
  let enviados = 0;
  let falhas = 0;

  for (const lote of emLotes(validas, 100)) {
    const mensagens: MensagemPush[] = lote.map((e) => ({
      to: e.o_expo_push_token,
      title: `${ROTULO_SEVERIDADE[alerta.severidade] ?? "Alerta"}: ${alerta.titulo}`,
      body: alerta.mensagem.length > 180 ? alerta.mensagem.slice(0, 177) + "…" : alerta.mensagem,
      data: { alertaId: alerta.id, severidade: alerta.severidade, tipo: alerta.tipo },
      channelId: "alertas",
      priority: "high",
      sound: "default",
    }));

    let tickets;
    try {
      tickets = await enviarLote(mensagens);
    } catch (err) {
      // lote inteiro falhou (rede/Expo): marca falha e segue para o próximo
      falhas += lote.length;
      await sb.from("alerta_entregas")
        .update({ status: "falha", enviado_em: agora })
        .in("id", lote.map((e) => e.o_entrega_id));
      console.error("lote falhou", (err as Error).message);
      continue;
    }

    await Promise.all(lote.map((e, i) => {
      const t = tickets[i];
      const ok = t?.status === "ok";
      if (ok) enviados++; else falhas++;
      return sb.from("alerta_entregas")
        .update({
          status: ok ? "enviado" : "falha",
          push_ticket: ok ? t.id : null,
          enviado_em: agora,
        })
        .eq("id", e.o_entrega_id);
    }));
  }

  // entregas sem dispositivo também recebem enviado_em, para o cálculo do indicador
  await sb.from("alerta_entregas")
    .update({ enviado_em: agora })
    .eq("alerta_id", alertaId)
    .is("enviado_em", null);

  await sb.from("alerta_disparos")
    .update({ status: "concluido", atualizado_em: new Date().toISOString(), erro: null })
    .eq("alerta_id", alertaId);

  return { alerta_id: alertaId, destinatarios: (entregas as Entrega[]).length, enviados, falhas };
}

Deno.serve(async (req) => {
  const sb = clienteAdmin();
  let ids: string[] = [];

  try {
    const corpo = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const id = corpo?.record?.id ?? corpo?.alerta_id;
    if (id) {
      ids = [id];
    } else {
      const { data } = await sb.from("alerta_disparos")
        .select("alerta_id")
        .in("status", ["pendente", "erro"])
        .lt("tentativas", 5)
        .limit(10);
      ids = (data ?? []).map((d) => d.alerta_id);
    }

    const resultados = [];
    for (const alertaId of ids) {
      try {
        resultados.push(await processarAlerta(alertaId));
      } catch (err) {
        const msg = (err as Error).message;
        console.error("disparar-alerta", alertaId, msg);
        const { data: d } = await sb.from("alerta_disparos").select("tentativas").eq("alerta_id", alertaId).single();
        await sb.from("alerta_disparos")
          .update({ status: "erro", erro: msg, tentativas: (d?.tentativas ?? 0) + 1, atualizado_em: new Date().toISOString() })
          .eq("alerta_id", alertaId);
        resultados.push({ alerta_id: alertaId, erro: msg });
      }
    }
    return json({ processados: resultados });
  } catch (err) {
    return json({ erro: (err as Error).message }, 500);
  }
});
