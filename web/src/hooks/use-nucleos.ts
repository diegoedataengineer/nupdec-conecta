import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { StatusMembro, StatusNucleo } from "@/integrations/supabase/types";

const COLUNAS_NUCLEO = "id, municipio_id, nome, comunidade, status, responsavel_membro_id, criado_em, area_geojson, centro";

export function useNucleos() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["nucleos", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("nucleos")
        .select(COLUNAS_NUCLEO)
        .eq("municipio_id", perfil!.municipio_id)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export function useNucleo(id: string | undefined) {
  return useQuery({
    queryKey: ["nucleo", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("nucleos").select(COLUNAS_NUCLEO).eq("id", id!).single();
      if (error) throw error;
      return data;
    },
  });
}

/** Evidência de atividade por núcleo (view v_nucleo_atividade). */
export function useNucleosAtividade() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["nucleos-atividade", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_nucleo_atividade")
        .select("*")
        .eq("municipio_id", perfil!.municipio_id);
      if (error) throw error;
      return data;
    },
  });
}

export interface MembroComPerfil {
  id: string;
  perfil_id: string;
  nucleo_id: string;
  status: StatusMembro;
  funcao: string | null;
  aprovado_em: string | null;
  criado_em: string;
  perfil: { nome: string; telefone: string | null } | null;
}

/**
 * Membros de um núcleo com nome e telefone (perfis).
 * Não dá para saber daqui quem tem o app: a RLS de `dispositivos` só mostra o
 * próprio; a cobertura vem de v_nucleo_atividade / previa_alerta (security definer).
 */
export function useMembrosDoNucleo(nucleoId: string | undefined) {
  return useQuery({
    queryKey: ["membros", nucleoId],
    enabled: !!nucleoId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("membros")
        .select(
          "id, perfil_id, nucleo_id, status, funcao, aprovado_em, criado_em, perfil:perfis!membros_perfil_id_fkey(nome, telefone)",
        )
        .eq("nucleo_id", nucleoId!)
        .order("criado_em");
      if (error) throw error;
      return data as unknown as MembroComPerfil[];
    },
  });
}

interface DadosNucleo {
  nome: string;
  comunidade: string;
  status: StatusNucleo;
  /** EWKT `SRID=4326;POLYGON((...))` — obrigatório no insert, opcional no update */
  area?: string;
}

export function useSalvarNucleo() {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...dados }: DadosNucleo & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("nucleos").update(dados).eq("id", id);
        if (error) throw error;
        return id;
      }
      if (!dados.area) throw new Error("Desenhe a área do núcleo no mapa.");
      const { data, error } = await supabase
        .from("nucleos")
        .insert({ ...dados, area: dados.area, municipio_id: perfil!.municipio_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: (_, v) => {
      void qc.invalidateQueries({ queryKey: ["nucleos"] });
      void qc.invalidateQueries({ queryKey: ["nucleos-atividade"] });
      if (v.id) void qc.invalidateQueries({ queryKey: ["nucleo", v.id] });
    },
  });
}

/** Aprovar / rejeitar / desligar membro. RLS: gestor do município. */
export function useTriarMembro(nucleoId: string | undefined) {
  const qc = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async ({ membroId, status }: { membroId: string; status: StatusMembro }) => {
      const { error } = await supabase
        .from("membros")
        .update({ status, aprovado_por: user!.id, aprovado_em: new Date().toISOString() })
        .eq("id", membroId);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["membros", nucleoId] });
      void qc.invalidateQueries({ queryKey: ["nucleos-atividade"] });
      void qc.invalidateQueries({ queryKey: ["municipio-resumo"] });
    },
  });
}

export function useDefinirLider(nucleoId: string | undefined) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (membroId: string | null) => {
      const { error } = await supabase.from("nucleos").update({ responsavel_membro_id: membroId }).eq("id", nucleoId!);
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["nucleo", nucleoId] });
      void qc.invalidateQueries({ queryKey: ["nucleos"] });
    },
  });
}
