-- Nupdec Conecta — extensões e tipos enumerados
-- Referência: specs/04-modelo-de-dados.md

create extension if not exists postgis with schema extensions;
create extension if not exists pgcrypto with schema extensions;

create type public.papel as enum ('membro', 'agente', 'coordenador');
create type public.status_nucleo as enum ('ativo', 'inativo');
create type public.status_membro as enum ('pendente', 'aprovado', 'rejeitado', 'desligado');
create type public.tipo_area_risco as enum ('deslizamento', 'inundacao', 'enxurrada', 'outro');
create type public.nivel_risco as enum ('baixo', 'medio', 'alto', 'muito_alto');
create type public.origem_alerta as enum ('manual', 'cemaden', 'inmet');
create type public.tipo_alerta as enum ('deslizamento', 'inundacao', 'enxurrada', 'vendaval', 'outro');
create type public.severidade_alerta as enum ('observacao', 'atencao', 'alerta', 'alerta_maximo');
create type public.status_entrega as enum ('sem_dispositivo', 'enviado', 'entregue', 'falha');
create type public.tipo_ocorrencia as enum ('trinca', 'deslizamento', 'alagamento', 'arvore', 'bueiro', 'outro');
create type public.status_ocorrencia as enum ('nova', 'em_analise', 'atendida', 'descartada');
