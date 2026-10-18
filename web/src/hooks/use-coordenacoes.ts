import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { MultiPolygon, Polygon } from "geojson";
import { supabase } from "@/integrations/supabase/client";
import type { Json, NivelCoordenacao, Papel } from "@/integrations/supabase/types";

export interface CoordenacaoLista {
  id: string;
  nome: string;
  nivel: NivelCoordenacao;
  uf: string;
  municipio_id: string | null;
  descricao: string | null;
  status: "ativa" | "inativa";
  criado_em: string;
  area_geojson: MultiPolygon | null;
}

const COLUNAS = "id, nome, nivel, uf, municipio_id, descricao, status, criado_em, area_geojson";

/** Todas as coordenações (leitura liberada a autenticados; a diretoria edita). */
export function useCoordenacoes() {
  return useQuery({
    queryKey: ["coordenacoes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("coordenacoes").select(COLUNAS).order("nivel").order("nome");
      if (error) throw error;
      return data as unknown as CoordenacaoLista[];
    },
  });
}

export function useCoordenacao(id: string | undefined) {
  return useQuery({
    queryKey: ["coordenacao", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("coordenacoes").select(COLUNAS).eq("id", id!).single();
      if (error) throw error;
      return data as unknown as CoordenacaoLista;
    },
  });
}

/** Resumo por coordenação (view v_coordenacao_resumo). */
export function useCoordenacoesResumo() {
  return useQuery({
    queryKey: ["coordenacoes-resumo"],
    queryFn: async () => {
      const { data, error } = await supabase.from("v_coordenacao_resumo").select("*");
      if (error) throw error;
      return data;
    },
  });
}

/** Núcleos vinculados a uma coordenação (coluna nucleos.coordenacao_id, preenchida por gatilho). */
export function useNucleosDaCoordenacao(id: string | undefined) {
  return useQuery({
    queryKey: ["nucleos-coordenacao", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase.from("nucleos").select("id, nome, comunidade, status, municipio_id, area_geojson, centro").eq("coordenacao_id", id!).order("nome");
      if (error) throw error;
      return data;
    },
  });
}

export interface Gestor {
  id: string;
  nome: string;
  telefone: string | null;
  papel: Papel;
  municipio_id: string;
  coordenacao_id: string | null;
  criado_em: string;
}

/** Coordenadores e agentes (RLS: a diretoria lê todos). */
export function useGestores() {
  return useQuery({
    queryKey: ["gestores"],
    queryFn: async () => {
      const { data, error } = await supabase.from("perfis").select("id, nome, telefone, papel, municipio_id, coordenacao_id, criado_em").in("papel", ["coordenador", "agente"]).order("papel").order("nome");
      if (error) throw error;
      return data as unknown as Gestor[];
    },
  });
}

export interface SalvarCoordenacao {
  id?: string | null;
  nome: string;
  nivel: NivelCoordenacao;
  uf: string;
  municipio_id: string | null;
  descricao: string | null;
  status: "ativa" | "inativa";
  area: Polygon | MultiPolygon;
}

export function useSalvarCoordenacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (c: SalvarCoordenacao) => {
      const { data, error } = await supabase.rpc("diretor_salvar_coordenacao", {
        p_id: c.id ?? null,
        p_nome: c.nome,
        p_nivel: c.nivel,
        p_uf: c.uf,
        p_municipio_id: c.municipio_id,
        p_descricao: c.descricao,
        p_area_geojson: c.area as unknown as Json,
        p_status: c.status,
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["coordenacoes"] });
      void qc.invalidateQueries({ queryKey: ["coordenacoes-resumo"] });
      void qc.invalidateQueries({ queryKey: ["nucleos-coordenacao"] });
      void qc.invalidateQueries({ queryKey: ["nucleos"] });
    },
  });
}

export interface NovoGestor {
  email: string;
  senha: string;
  nome: string;
  telefone?: string;
  papel: "coordenador" | "agente";
  coordenacao_id: string;
}

/** Cria a conta do gestor pela Edge Function criar-gestor (service_role no servidor). */
export function useCriarGestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (g: NovoGestor) => {
      const { data, error } = await supabase.functions.invoke("criar-gestor", { body: g });
      if (error) {
        // a função devolve {erro} com status 4xx; o invoke embrulha em FunctionsHttpError
        let msg = error.message;
        try {
          const ctx = (error as { context?: Response }).context;
          if (ctx) msg = (await ctx.json()).erro ?? msg;
        } catch { /* mantém a mensagem padrão */ }
        throw new Error(msg);
      }
      return data as { usuario_id: string; email: string };
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gestores"] });
      void qc.invalidateQueries({ queryKey: ["coordenacoes-resumo"] });
    },
  });
}

export function useVincularGestor() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ perfilId, coordenacaoId, papel }: { perfilId: string; coordenacaoId: string | null; papel: "coordenador" | "agente" }) => {
      const { error } = await supabase.rpc("diretor_vincular_gestor", { p_perfil_id: perfilId, p_coordenacao_id: coordenacaoId, p_papel: papel });
      if (error) throw error;
    },
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ["gestores"] });
      void qc.invalidateQueries({ queryKey: ["coordenacoes-resumo"] });
    },
  });
}
