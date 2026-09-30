/**
 * Tipos do schema público do Nupdec Conecta, escritos à mão a partir de
 * supabase/migrations/*.sql (equivalente ao `types.ts` de src/integrations/api
 * do portal NeuroAgora).
 *
 * As colunas `*_geojson` e `centro` não existem fisicamente: são funções que o
 * PostgREST expõe como colunas computadas (migration 20260930000700). Elas
 * entram em `Row` para o `.select()` ficar tipado, e ficam fora de `Insert`.
 * Geometria se grava em EWKT (`SRID=4326;POLYGON((lon lat, ...))`).
 */

import type { Geometry, MultiPolygon, Point, Polygon } from "geojson";

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export type Papel = "membro" | "agente" | "coordenador";
export type StatusNucleo = "ativo" | "inativo";
export type StatusMembro = "pendente" | "aprovado" | "rejeitado" | "desligado";
export type TipoAreaRisco = "deslizamento" | "inundacao" | "enxurrada" | "outro";
export type NivelRisco = "baixo" | "medio" | "alto" | "muito_alto";
export type OrigemAlerta = "manual" | "cemaden" | "inmet";
export type TipoAlerta = "deslizamento" | "inundacao" | "enxurrada" | "vendaval" | "outro";
export type SeveridadeAlerta = "observacao" | "atencao" | "alerta" | "alerta_maximo";
export type StatusEntrega = "sem_dispositivo" | "enviado" | "entregue" | "falha";
export type TipoOcorrencia = "trinca" | "deslizamento" | "alagamento" | "arvore" | "bueiro" | "outro";
export type StatusOcorrencia = "nova" | "em_analise" | "atendida" | "descartada";

export type Database = {
  public: {
    Tables: {
      municipios: {
        Row: {
          id: string;
          codigo_ibge: string;
          nome: string;
          uf: string;
          prioritario: boolean;
          limite: unknown | null;
          limite_geojson: MultiPolygon | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          codigo_ibge: string;
          nome: string;
          uf: string;
          prioritario?: boolean;
          limite?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["municipios"]["Insert"]>;
        Relationships: [];
      };
      perfis: {
        Row: {
          id: string;
          nome: string;
          telefone: string | null;
          papel: Papel;
          municipio_id: string;
          criado_em: string;
        };
        Insert: {
          id: string;
          nome: string;
          telefone?: string | null;
          papel?: Papel;
          municipio_id: string;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["perfis"]["Insert"]>;
        Relationships: [];
      };
      nucleos: {
        Row: {
          id: string;
          municipio_id: string;
          nome: string;
          comunidade: string;
          area: unknown;
          area_geojson: Polygon;
          centro: Point;
          responsavel_membro_id: string | null;
          status: StatusNucleo;
          criado_em: string;
        };
        Insert: {
          id?: string;
          municipio_id: string;
          nome: string;
          comunidade: string;
          area: string;
          responsavel_membro_id?: string | null;
          status?: StatusNucleo;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["nucleos"]["Insert"]>;
        Relationships: [];
      };
      membros: {
        Row: {
          id: string;
          perfil_id: string;
          nucleo_id: string;
          status: StatusMembro;
          funcao: string | null;
          aprovado_por: string | null;
          aprovado_em: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          perfil_id: string;
          nucleo_id: string;
          status?: StatusMembro;
          funcao?: string | null;
          aprovado_por?: string | null;
          aprovado_em?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["membros"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "membros_perfil_id_fkey";
            columns: ["perfil_id"];
            isOneToOne: true;
            referencedRelation: "perfis";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "membros_nucleo_id_fkey";
            columns: ["nucleo_id"];
            isOneToOne: false;
            referencedRelation: "nucleos";
            referencedColumns: ["id"];
          },
        ];
      };
      dispositivos: {
        Row: {
          id: string;
          perfil_id: string;
          expo_push_token: string;
          plataforma: string;
          app_versao: string | null;
          atualizado_em: string;
        };
        Insert: {
          id?: string;
          perfil_id: string;
          expo_push_token: string;
          plataforma?: string;
          app_versao?: string | null;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["dispositivos"]["Insert"]>;
        Relationships: [];
      };
      areas_risco: {
        Row: {
          id: string;
          municipio_id: string;
          nome: string;
          tipo: TipoAreaRisco;
          nivel: NivelRisco;
          area: unknown;
          area_geojson: Polygon;
          fonte: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          municipio_id: string;
          nome: string;
          tipo: TipoAreaRisco;
          nivel: NivelRisco;
          area: string;
          fonte?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["areas_risco"]["Insert"]>;
        Relationships: [];
      };
      alertas: {
        Row: {
          id: string;
          municipio_id: string;
          origem: OrigemAlerta;
          origem_ref: string | null;
          tipo: TipoAlerta;
          severidade: SeveridadeAlerta;
          titulo: string;
          mensagem: string;
          area: unknown;
          area_geojson: MultiPolygon;
          inicio_em: string;
          encerrado_em: string | null;
          criado_por: string | null;
          criado_em: string;
        };
        Insert: {
          id?: string;
          municipio_id: string;
          origem?: OrigemAlerta;
          origem_ref?: string | null;
          tipo: TipoAlerta;
          severidade: SeveridadeAlerta;
          titulo: string;
          mensagem: string;
          area: string;
          inicio_em?: string;
          encerrado_em?: string | null;
          criado_por?: string | null;
          criado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alertas"]["Insert"]>;
        Relationships: [];
      };
      alerta_entregas: {
        Row: {
          id: string;
          alerta_id: string;
          membro_id: string;
          nucleo_id: string;
          status: StatusEntrega;
          push_ticket: string | null;
          enviado_em: string | null;
          entregue_em: string | null;
          confirmado_em: string | null;
          sincronizado_em: string | null;
        };
        Insert: {
          id?: string;
          alerta_id: string;
          membro_id: string;
          nucleo_id: string;
          status?: StatusEntrega;
          push_ticket?: string | null;
          enviado_em?: string | null;
          entregue_em?: string | null;
          confirmado_em?: string | null;
          sincronizado_em?: string | null;
        };
        Update: Partial<Database["public"]["Tables"]["alerta_entregas"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "alerta_entregas_membro_id_fkey";
            columns: ["membro_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "alerta_entregas_nucleo_id_fkey";
            columns: ["nucleo_id"];
            isOneToOne: false;
            referencedRelation: "nucleos";
            referencedColumns: ["id"];
          },
        ];
      };
      ocorrencias: {
        Row: {
          id: string;
          membro_id: string;
          nucleo_id: string;
          alerta_id: string | null;
          tipo: TipoOcorrencia;
          descricao: string | null;
          local: unknown;
          local_geojson: Point;
          precisao_m: number | null;
          foto_path: string | null;
          area_risco_id: string | null;
          status: StatusOcorrencia;
          triado_por: string | null;
          triado_em: string | null;
          observacao_triagem: string | null;
          criado_em: string;
          recebido_em: string;
        };
        Insert: {
          id: string;
          membro_id: string;
          nucleo_id: string;
          alerta_id?: string | null;
          tipo: TipoOcorrencia;
          descricao?: string | null;
          local: string;
          precisao_m?: number | null;
          foto_path?: string | null;
          area_risco_id?: string | null;
          status?: StatusOcorrencia;
          triado_por?: string | null;
          triado_em?: string | null;
          observacao_triagem?: string | null;
          criado_em: string;
          recebido_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["ocorrencias"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "ocorrencias_membro_id_fkey";
            columns: ["membro_id"];
            isOneToOne: false;
            referencedRelation: "membros";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ocorrencias_nucleo_id_fkey";
            columns: ["nucleo_id"];
            isOneToOne: false;
            referencedRelation: "nucleos";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "ocorrencias_area_risco_id_fkey";
            columns: ["area_risco_id"];
            isOneToOne: false;
            referencedRelation: "areas_risco";
            referencedColumns: ["id"];
          },
        ];
      };
      alerta_disparos: {
        Row: {
          alerta_id: string;
          status: "pendente" | "processando" | "concluido" | "erro";
          tentativas: number;
          erro: string | null;
          criado_em: string;
          atualizado_em: string;
        };
        Insert: {
          alerta_id: string;
          status?: "pendente" | "processando" | "concluido" | "erro";
          tentativas?: number;
          erro?: string | null;
          criado_em?: string;
          atualizado_em?: string;
        };
        Update: Partial<Database["public"]["Tables"]["alerta_disparos"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: {
      v_alerta_confirmacao: {
        Row: {
          alerta_id: string;
          municipio_id: string;
          titulo: string;
          tipo: TipoAlerta;
          severidade: SeveridadeAlerta;
          inicio_em: string;
          encerrado_em: string | null;
          destinatarios: number;
          com_dispositivo: number;
          confirmados: number;
          confirmados_10min: number;
          pct_confirmado_10min: number | null;
          mediana_tempo: string | null;
        };
        Relationships: [];
      };
      v_alerta_confirmacao_nucleo: {
        Row: {
          alerta_id: string;
          nucleo_id: string;
          nucleo_nome: string;
          responsavel_membro_id: string | null;
          destinatarios: number;
          confirmados: number;
          pct_confirmado: number | null;
        };
        Relationships: [];
      };
      v_nucleo_atividade: {
        Row: {
          nucleo_id: string;
          municipio_id: string;
          nome: string;
          comunidade: string;
          status: StatusNucleo;
          membros_aprovados: number;
          membros_pendentes: number;
          dispositivos: number;
          ultima_confirmacao: string | null;
          ocorrencias_90d: number;
        };
        Relationships: [];
      };
      v_municipio_resumo: {
        Row: {
          municipio_id: string;
          nome: string;
          uf: string;
          nucleos_ativos: number;
          membros_aprovados: number;
          alertas_30d: number;
          pct_confirmado_10min_30d: number | null;
        };
        Relationships: [];
      };
    };
    Functions: {
      auth_perfil: {
        Args: Record<string, never>;
        Returns: {
          papel: Papel;
          municipio_id: string;
          membro_id: string | null;
          nucleo_id: string | null;
          membro_status: StatusMembro | null;
        }[];
      };
      previa_alerta: {
        Args: { p_area_geojson: Json };
        Returns: {
          nucleo_id: string;
          nucleo_nome: string;
          membros_aprovados: number;
          com_dispositivo: number;
        }[];
      };
      criar_alerta: {
        Args: {
          p_tipo: TipoAlerta;
          p_severidade: SeveridadeAlerta;
          p_titulo: string;
          p_mensagem: string;
          p_area_geojson: Json;
          p_origem?: OrigemAlerta;
        };
        Returns: string;
      };
      geojson: {
        Args: { g: unknown };
        Returns: Json;
      };
      confirmar_alerta: {
        Args: { p_alerta_id: string; p_confirmado_em?: string };
        Returns: undefined;
      };
      registrar_dispositivo: {
        Args: { p_token: string; p_plataforma?: string; p_app_versao?: string };
        Returns: undefined;
      };
    };
    Enums: {
      papel: Papel;
      status_nucleo: StatusNucleo;
      status_membro: StatusMembro;
      tipo_area_risco: TipoAreaRisco;
      nivel_risco: NivelRisco;
      origem_alerta: OrigemAlerta;
      tipo_alerta: TipoAlerta;
      severidade_alerta: SeveridadeAlerta;
      status_entrega: StatusEntrega;
      tipo_ocorrencia: TipoOcorrencia;
      status_ocorrencia: StatusOcorrencia;
    };
    CompositeTypes: Record<string, never>;
  };
};

export type Tables<T extends keyof Database["public"]["Tables"]> = Database["public"]["Tables"][T]["Row"];
export type Views<T extends keyof Database["public"]["Views"]> = Database["public"]["Views"][T]["Row"];

export type Perfil = Tables<"perfis">;
export type Nucleo = Tables<"nucleos">;
export type Membro = Tables<"membros">;
export type AreaRisco = Tables<"areas_risco">;
export type Alerta = Tables<"alertas">;
export type AlertaEntrega = Tables<"alerta_entregas">;
export type Ocorrencia = Tables<"ocorrencias">;
export type Municipio = Tables<"municipios">;

export type AlertaConfirmacao = Views<"v_alerta_confirmacao">;
export type AlertaConfirmacaoNucleo = Views<"v_alerta_confirmacao_nucleo">;
export type NucleoAtividade = Views<"v_nucleo_atividade">;
export type MunicipioResumo = Views<"v_municipio_resumo">;

export type AuthPerfil = Database["public"]["Functions"]["auth_perfil"]["Returns"][number];
export type PreviaAlerta = Database["public"]["Functions"]["previa_alerta"]["Returns"][number];

export type { Geometry, MultiPolygon, Point, Polygon };
