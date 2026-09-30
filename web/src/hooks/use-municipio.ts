import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

/** Quatro números da visão geral (view v_municipio_resumo). */
export function useMunicipioResumo() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["municipio-resumo", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("v_municipio_resumo")
        .select("*")
        .eq("municipio_id", perfil!.municipio_id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}

/** Nome, UF e limite (MultiPolygon) do município do usuário. */
export function useMunicipio() {
  const { perfil } = useAuth();
  return useQuery({
    queryKey: ["municipio", perfil?.municipio_id],
    enabled: !!perfil?.municipio_id,
    staleTime: 60 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("municipios")
        .select("id, nome, uf, codigo_ibge, prioritario, limite_geojson")
        .eq("id", perfil!.municipio_id)
        .single();
      if (error) throw error;
      return data;
    },
  });
}
