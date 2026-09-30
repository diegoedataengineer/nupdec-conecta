import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { NivelRisco, TipoAreaRisco } from "@/integrations/supabase/types";

export function useAreasRisco() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["areas-risco", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("areas_risco")
        .select("id, nome, tipo, nivel, fonte, criado_em, area_geojson")
        .eq("municipio_id", perfil!.municipio_id)
        .order("nome");
      if (error) throw error;
      return data;
    },
  });
}

interface DadosArea {
  nome: string;
  tipo: TipoAreaRisco;
  nivel: NivelRisco;
  fonte: string | null;
  /** EWKT; obrigatório no insert */
  area?: string;
}

export function useSalvarAreaRisco() {
  const qc = useQueryClient();
  const { perfil } = useAuth();
  return useMutation({
    mutationFn: async ({ id, ...dados }: DadosArea & { id?: string }) => {
      if (id) {
        const { error } = await supabase.from("areas_risco").update(dados).eq("id", id);
        if (error) throw error;
        return id;
      }
      if (!dados.area) throw new Error("Desenhe o polígono da área no mapa.");
      const { data, error } = await supabase
        .from("areas_risco")
        .insert({ ...dados, area: dados.area, municipio_id: perfil!.municipio_id })
        .select("id")
        .single();
      if (error) throw error;
      return data.id;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["areas-risco"] }),
  });
}

export function useExcluirAreaRisco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("areas_risco").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => void qc.invalidateQueries({ queryKey: ["areas-risco"] }),
  });
}
