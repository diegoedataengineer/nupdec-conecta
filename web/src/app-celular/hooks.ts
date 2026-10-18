import { useEffect, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { Point } from "geojson";
import { useAppClient } from "./client";
import { useAppAuth } from "./AppAuthContext";
import type { AlertaEntrega, TipoOcorrencia } from "@/integrations/supabase/types";

const COLUNAS_ALERTA = "id, titulo, mensagem, tipo, severidade, origem, inicio_em, encerrado_em, area_geojson";

export interface AlertaDoMembro {
  id: string;
  titulo: string;
  mensagem: string;
  tipo: string;
  severidade: "observacao" | "atencao" | "alerta" | "alerta_maximo";
  origem: string;
  inicio_em: string;
  encerrado_em: string | null;
  area_geojson: unknown;
  entrega: Pick<AlertaEntrega, "id" | "status" | "enviado_em" | "confirmado_em"> | null;
}

/** Alertas que o membro recebeu (a RLS só devolve os que têm entrega para ele). */
export function useAlertasDoMembro() {
  const sb = useAppClient();
  const { perfil } = useAppAuth();
  return useQuery({
    queryKey: ["app-alertas", perfil?.membro_id],
    enabled: !!perfil?.membro_id,
    refetchInterval: 20_000,
    queryFn: async (): Promise<AlertaDoMembro[]> => {
      const [{ data: alertas, error }, { data: entregas }] = await Promise.all([
        sb.from("alertas").select(COLUNAS_ALERTA).order("inicio_em", { ascending: false }).limit(50),
        sb.from("alerta_entregas").select("id, alerta_id, status, enviado_em, confirmado_em").eq("membro_id", perfil!.membro_id!),
      ]);
      if (error) throw error;
      const mapa = new Map((entregas ?? []).map((e) => [e.alerta_id, e]));
      return (alertas ?? []).map((a) => ({ ...a, entrega: mapa.get(a.id) ?? null })) as AlertaDoMembro[];
    },
  });
}

export function useAlertaDoMembro(id: string | undefined) {
  const lista = useAlertasDoMembro();
  return { ...lista, data: lista.data?.find((a) => a.id === id) };
}

/** Botão "Recebi e estou ciente": RPC confirmar_alerta com a hora do toque. */
export function useConfirmarAlerta() {
  const sb = useAppClient();
  const qc = useQueryClient();
  const { perfil } = useAppAuth();
  return useMutation({
    mutationFn: async (alertaId: string) => {
      const { error } = await sb.rpc("confirmar_alerta", {
        p_alerta_id: alertaId,
        p_confirmado_em: new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["app-alertas", perfil?.membro_id] }),
  });
}

export function useNucleoDoMembro() {
  const sb = useAppClient();
  const { perfil } = useAppAuth();
  return useQuery({
    queryKey: ["app-nucleo", perfil?.nucleo_id],
    enabled: !!perfil?.nucleo_id,
    queryFn: async () => {
      const [{ data: nucleo, error }, { data: membros }] = await Promise.all([
        sb.from("nucleos").select("id, nome, comunidade, status, responsavel_membro_id, area_geojson, centro").eq("id", perfil!.nucleo_id!).single(),
        sb
          .from("membros")
          .select("id, status, funcao, perfil:perfis!membros_perfil_id_fkey(nome, telefone)")
          .eq("nucleo_id", perfil!.nucleo_id!)
          .order("status"),
      ]);
      if (error) throw error;
      return {
        nucleo,
        membros: (membros ?? []) as unknown as { id: string; status: string; funcao: string | null; perfil: { nome: string; telefone: string | null } | null }[],
      };
    },
  });
}

export function useOcorrenciasDoNucleo() {
  const sb = useAppClient();
  const { perfil } = useAppAuth();
  return useQuery({
    queryKey: ["app-ocorrencias", perfil?.nucleo_id],
    enabled: !!perfil?.nucleo_id,
    refetchInterval: 20_000,
    queryFn: async () => {
      const { data, error } = await sb
        .from("ocorrencias")
        .select("id, tipo, descricao, status, foto_path, criado_em, membro_id, local_geojson, membro:membros(perfil:perfis!membros_perfil_id_fkey(nome))")
        .eq("nucleo_id", perfil!.nucleo_id!)
        .order("criado_em", { ascending: false })
        .limit(100);
      if (error) throw error;
      return data as unknown as {
        id: string; tipo: TipoOcorrencia; descricao: string | null; status: string; foto_path: string | null;
        criado_em: string; membro_id: string; local_geojson: Point | null; membro: { perfil: { nome: string } | null } | null;
      }[];
    },
  });
}

export function useFotoApp(fotoPath: string | null | undefined) {
  const sb = useAppClient();
  return useQuery({
    queryKey: ["app-foto", fotoPath],
    enabled: !!fotoPath,
    staleTime: 50 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await sb.storage.from("ocorrencias").createSignedUrl(fotoPath!, 3600);
      if (error) throw error;
      return data.signedUrl;
    },
  });
}

export interface NovaOcorrencia {
  tipo: TipoOcorrencia;
  descricao: string;
  lon: number;
  lat: number;
  precisao_m: number | null;
  foto: File | null;
}

/** Reporte: foto → Storage (caminho municipio/nucleo/id.jpg) e insert com id gerado no cliente. */
export function useReportarOcorrencia() {
  const sb = useAppClient();
  const qc = useQueryClient();
  const { perfil } = useAppAuth();
  return useMutation({
    mutationFn: async (o: NovaOcorrencia) => {
      if (!perfil?.membro_id || !perfil.nucleo_id) throw new Error("membro sem núcleo");
      const id = crypto.randomUUID();
      let foto_path: string | null = null;
      if (o.foto) {
        foto_path = `${perfil.municipio_id}/${perfil.nucleo_id}/${id}.jpg`;
        const { error: eUp } = await sb.storage.from("ocorrencias").upload(foto_path, o.foto, { contentType: o.foto.type || "image/jpeg", upsert: true });
        if (eUp) throw eUp;
      }
      const { error } = await sb.from("ocorrencias").insert({
        id,
        membro_id: perfil.membro_id,
        nucleo_id: perfil.nucleo_id,
        tipo: o.tipo,
        descricao: o.descricao.trim() || null,
        local: `SRID=4326;POINT(${o.lon} ${o.lat})` as unknown as never,
        precisao_m: o.precisao_m,
        foto_path,
        criado_em: new Date().toISOString(),
      });
      if (error) throw error;
      return id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["app-ocorrencias", perfil?.nucleo_id] }),
  });
}

/** Estado de rede do "celular" — o app real usa NetInfo; aqui, navigator.onLine. */
export function useOnline() {
  const [online, setOnline] = useState(navigator.onLine);
  useEffect(() => {
    const on = () => setOnline(true), off = () => setOnline(false);
    window.addEventListener("online", on);
    window.addEventListener("offline", off);
    return () => { window.removeEventListener("online", on); window.removeEventListener("offline", off); };
  }, []);
  return online;
}

/** Áreas de risco do município do membro (RLS: leitura no município). */
export function useAreasRiscoApp() {
  const sb = useAppClient();
  const { perfil } = useAppAuth();
  return useQuery({
    queryKey: ["app-areas-risco", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    staleTime: 10 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await sb.from("areas_risco").select("id, nome, nivel, area_geojson").eq("municipio_id", perfil!.municipio_id);
      if (error) throw error;
      return data;
    },
  });
}
