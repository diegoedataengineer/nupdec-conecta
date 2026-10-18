import { useCallback, useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { useAppClient } from "./client";
import { useAppAuth } from "./AppAuthContext";

export interface NotificacaoPush {
  alertaId: string;
  titulo: string;
  corpo: string;
  severidade: string;
  recebidaEm: number;
}

/** Bipe curto de notificação (WebAudio), sem arquivo de áudio. */
function bipar() {
  try {
    const ctx = new AudioContext();
    const tocar = (t: number, f: number) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      o.type = "sine";
      o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, ctx.currentTime + t);
      g.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + t + 0.02);
      g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + t + 0.25);
      o.connect(g).connect(ctx.destination);
      o.start(ctx.currentTime + t);
      o.stop(ctx.currentTime + t + 0.3);
    };
    tocar(0, 880);
    tocar(0.18, 1175);
  } catch {
    /* sem áudio no ambiente */
  }
}

/**
 * Simula o push do app real: no app, o Expo Push entrega a notificação; aqui,
 * o Realtime do Supabase avisa quando a Edge Function cria a entrega
 * (INSERT em alerta_entregas para este membro) e o "celular" mostra o banner.
 */
export function usePushSimulado() {
  const { perfil } = useAppAuth();
  const sb = useAppClient();
  const qc = useQueryClient();
  const [notificacao, setNotificacao] = useState<NotificacaoPush | null>(null);
  const [vibrando, setVibrando] = useState(false);
  const vistas = useRef(new Set<string>());

  const mostrar = useCallback(async (alertaId: string) => {
    if (vistas.current.has(alertaId)) return;
    vistas.current.add(alertaId);
    // a entrega chega antes de o alerta ser visível na lista → busca o alerta
    const { data: a, error } = await sb.from("alertas").select("id, titulo, mensagem, severidade").eq("id", alertaId).maybeSingle();
    if (!a) {
      console.warn("[push-sim] entrega recebida mas alerta não legível ainda", alertaId, error?.message ?? "");
      vistas.current.delete(alertaId);
      return;
    }
    setNotificacao({ alertaId: a.id, titulo: a.titulo, corpo: a.mensagem, severidade: a.severidade, recebidaEm: Date.now() });
    setVibrando(true);
    bipar();
    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
    setTimeout(() => setVibrando(false), 900);
    void qc.invalidateQueries({ queryKey: ["app-alertas"] });
  }, [qc, sb]);

  useEffect(() => {
    if (!perfil?.membro_id) return;
    const canal = sb
      .channel(`app-push:${perfil.membro_id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "alerta_entregas", filter: `membro_id=eq.${perfil.membro_id}` },
        (payload) => void mostrar((payload.new as { alerta_id: string }).alerta_id),
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alerta_entregas", filter: `membro_id=eq.${perfil.membro_id}` },
        () => void qc.invalidateQueries({ queryKey: ["app-alertas"] }),
      )
      .subscribe((status, err) => {
        if (status !== "SUBSCRIBED" && status !== "CLOSED") console.warn("[push-sim] canal", status, err?.message ?? "");
      });
    return () => {
      void sb.removeChannel(canal);
    };
  }, [perfil?.membro_id, mostrar, qc, sb]);

  const fechar = useCallback(() => setNotificacao(null), []);
  return { notificacao, fechar, vibrando };
}
