import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { Ocorrencia, StatusOcorrencia, TipoOcorrencia } from "@/integrations/supabase/types";

export interface OcorrenciaCompleta extends Ocorrencia {
  membro: { id: string; perfil: { nome: string; telefone: string | null } | null } | null;
  nucleo: { id: string; nome: string } | null;
  area_risco: { id: string; nome: string; nivel: string } | null;
}

export interface FiltrosOcorrencia {
  status?: StatusOcorrencia | "todas";
  tipo?: TipoOcorrencia | "todos";
  nucleoId?: string | "todos";
  /** dias para trás; 0 = sem limite */
  periodoDias?: number;
}

/** Ocorrências do município (RLS já limita) com membro, núcleo e área de risco. */
export function useOcorrencias(filtros: FiltrosOcorrencia) {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["ocorrencias", perfil?.municipio_id, filtros],
    enabled: !!perfil?.municipio_id,
    queryFn: async () => {
      let q = supabase
        .from("ocorrencias")
        .select(
          "*, local_geojson, membro:membros(id, perfil:perfis!membros_perfil_id_fkey(nome, telefone)), nucleo:nucleos(id, nome), area_risco:areas_risco(id, nome, nivel)",
        )
        .order("criado_em", { ascending: false })
        .limit(500);
      if (filtros.status && filtros.status !== "todas") q = q.eq("status", filtros.status);
      if (filtros.tipo && filtros.tipo !== "todos") q = q.eq("tipo", filtros.tipo);
      if (filtros.nucleoId && filtros.nucleoId !== "todos") q = q.eq("nucleo_id", filtros.nucleoId);
      if (filtros.periodoDias) {
        const desde = new Date(Date.now() - filtros.periodoDias * 86_400_000).toISOString();
        q = q.gte("criado_em", desde);
      }
      const { data, error } = await q;
      if (error) throw error;
      return data as unknown as OcorrenciaCompleta[];
    },
  });
}

/** Realtime: nova ocorrência ou triagem de outro agente atualiza a lista. */
export function useOcorrenciasRealtime() {
  const qc = useQueryClient();
  useEffect(() => {
    const canal = supabase
      .channel("ocorrencias:painel")
      .on("postgres_changes", { event: "*", schema: "public", table: "ocorrencias" }, () => {
        void qc.invalidateQueries({ queryKey: ["ocorrencias"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [qc]);
}

/** URL assinada (1 h) da foto no bucket privado `ocorrencias`. */
export function useFotoOcorrencia(fotoPath: string | null | undefined) {
  return useQuery({
    queryKey: ["foto-ocorrencia", fotoPath],
    enabled: !!fotoPath,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.storage.from("ocorrencias").createSignedUrl(fotoPath!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export function useTriarOcorrencia() {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ id, status, observacao }: { id: string; status: StatusOcorrencia; observacao: string }) => {
      const { error } = await supabase
        .from("ocorrencias")
        .update({
          status,
          triado_por: user!.id,
          triado_em: new Date().toISOString(),
          observacao_triagem: observacao.trim() || null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["ocorrencias"] }),
  });
}
