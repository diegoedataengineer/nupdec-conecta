import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Geometry } from "geojson";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { AlertaEntrega, Json, SeveridadeAlerta, TipoAlerta } from "@/integrations/supabase/types";

const COLUNAS_ALERTA = "id, titulo, mensagem, tipo, severidade, origem, inicio_em, encerrado_em, criado_por, area_geojson";

/** Histórico com taxa de confirmação (view v_alerta_confirmacao). */
export function useAlertasConfirmacao() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["alertas-confirmacao", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_alerta_confirmacao")
        .select("*")
        .eq("municipio_id", perfil!.municipio_id)
        .order("inicio_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

/** Alertas vigentes (sem encerrado_em), com geometria, para a visão geral. */
export function useAlertasVigentes() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["alertas-vigentes", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    refetchInterval: 30_000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alertas")
        .select(COLUNAS_ALERTA)
        .eq("municipio_id", perfil!.municipio_id)
        .is("encerrado_em", null)
        .order("inicio_em", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
}

export function useAlerta(id: string | undefined) {
  return useQuery({
    queryKey: ["alerta", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("alertas").select(COLUNAS_ALERTA).eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export function useAlertaConfirmacao(id: string | undefined) {
  return useQuery({
    queryKey: ["alerta-confirmacao", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("v_alerta_confirmacao").select("*").eq("alerta_id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

export interface ConfirmacaoNucleoComLider {
  alerta_id: string;
  nucleo_id: string;
  nucleo_nome: string;
  responsavel_membro_id: string | null;
  destinatarios: number;
  confirmados: number;
  pct_confirmado: number | null;
  lider: { nome: string; telefone: string | null } | null;
}

/** Tabela por núcleo (view) + nome e telefone do líder via membros → perfis. */
export function useAlertaConfirmacaoNucleos(id: string | undefined) {
  return useQuery({
    queryKey: ["alerta-confirmacao-nucleos", id],
    enabled: !!id,
    queryFn: async (): Promise<ConfirmacaoNucleoComLider[]> => {
      const { data, error } = await supabase
        .from("v_alerta_confirmacao_nucleo")
        .select("*")
        .eq("alerta_id", id!)
        .order("nucleo_nome");
      if (error) throw error;
      const lideres = data.map((n) => n.responsavel_membro_id).filter((x): x is string => !!x);
      let mapa = new Map<string, { nome: string; telefone: string | null }>();
      if (lideres.length) {
        const { data: membros, error: e2 } = await supabase
          .from("membros")
          .select("id, perfil:perfis!membros_perfil_id_fkey(nome, telefone)")
          .in("id", lideres);
        if (e2) throw e2;
        mapa = new Map(
          (membros as unknown as { id: string; perfil: { nome: string; telefone: string | null } | null }[]).map((m) => [
            m.id,
            m.perfil ?? { nome: "—", telefone: null },
          ]),
        );
      }
      return data.map((n) => ({ ...n, lider: n.responsavel_membro_id ? (mapa.get(n.responsavel_membro_id) ?? null) : null }));
    },
  });
}

export interface EntregaComMembro extends AlertaEntrega {
  membro: { id: string; perfil: { nome: string; telefone: string | null } | null } | null;
  nucleo: { nome: string } | null;
}

/**
 * Entregas do alerta com nome do membro. É a fonte do gráfico (acumulado por
 * minuto) e da lista de quem não confirmou; o Realtime invalida esta query.
 */
export function useAlertaEntregas(id: string | undefined) {
  return useQuery({
    queryKey: ["alerta-entregas", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("alerta_entregas")
        .select("*, membro:membros(id, perfil:perfis!membros_perfil_id_fkey(nome, telefone)), nucleo:nucleos(nome)")
        .eq("alerta_id", id!)
        .order("confirmado_em", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return data as unknown as EntregaComMembro[];
    },
  });
}

/**
 * Assinatura Realtime em alerta_entregas filtrada por alerta_id (canal
 * `alerta:{id}`, como na spec). Cada mudança invalida as queries do alerta.
 */
export function useAlertaRealtime(id: string | undefined) {
  const qc = useQueryClient();
  useEffect(() => {
    if (!id) return;
    const invalidar = () => {
      void qc.invalidateQueries({ queryKey: ["alerta-entregas", id] });
      void qc.invalidateQueries({ queryKey: ["alerta-confirmacao", id] });
      void qc.invalidateQueries({ queryKey: ["alerta-confirmacao-nucleos", id] });
    };
    const canal = supabase
      .channel(`alerta:${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "alerta_entregas", filter: `alerta_id=eq.${id}` },
        invalidar,
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "alertas", filter: `id=eq.${id}` },
        () => void qc.invalidateQueries({ queryKey: ["alerta", id] }),
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [id, qc]);
}

/** Prévia: quantos núcleos e membros a área atinge (RPC previa_alerta). */
export function usePreviaAlerta(area: Geometry | null) {
  return useQuery({
    queryKey: ["previa-alerta", area],
    enabled: !!area,
    staleTime: 0,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("previa_alerta", { p_area_geojson: area as unknown as Json });
      if (error) throw error;
      return data;
    },
  });
}

export interface NovoAlerta {
  tipo: TipoAlerta;
  severidade: SeveridadeAlerta;
  titulo: string;
  mensagem: string;
  area: Geometry;
}

export function useCriarAlerta() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (a: NovoAlerta) => {
      const { data, error } = await supabase.rpc("criar_alerta", {
        p_tipo: a.tipo,
        p_severidade: a.severidade,
        p_titulo: a.titulo,
        p_mensagem: a.mensagem,
        p_area_geojson: a.area as unknown as Json,
        p_origem: "manual",
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alertas-confirmacao"] });
      void qc.invalidateQueries({ queryKey: ["alertas-vigentes"] });
      void qc.invalidateQueries({ queryKey: ["municipio-resumo"] });
    },
  });
}

export function useEncerrarAlerta(id: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.from("alertas").update({ encerrado_em: new Date().toISOString() }).eq("id", id!);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["alerta", id] });
      void qc.invalidateQueries({ queryKey: ["alerta-confirmacao", id] });
      void qc.invalidateQueries({ queryKey: ["alertas-confirmacao"] });
      void qc.invalidateQueries({ queryKey: ["alertas-vigentes"] });
    },
  });
}
