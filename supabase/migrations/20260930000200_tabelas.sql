-- Nupdec Conecta — tabelas
-- Toda tabela nasce com RLS habilitada (políticas na migration seguinte).

-- ---------------------------------------------------------------- municipios
create table public.municipios (
  id            uuid primary key default gen_random_uuid(),
  codigo_ibge   char(7) not null unique,
  nome          text not null,
  uf            char(2) not null,
  prioritario   boolean not null default false,
  limite        extensions.geometry(MultiPolygon, 4326),
  criado_em     timestamptz not null default now()
);
alter table public.municipios enable row level security;

-- -------------------------------------------------------------------- perfis
create table public.perfis (
  id            uuid primary key references auth.users (id) on delete cascade,
  nome          text not null,
  telefone      text,
  papel         public.papel not null default 'membro',
  municipio_id  uuid not null references public.municipios (id),
  criado_em     timestamptz not null default now()
);
alter table public.perfis enable row level security;
create index perfis_municipio_idx on public.perfis (municipio_id);

-- ------------------------------------------------------------------- nucleos
create table public.nucleos (
  id                    uuid primary key default gen_random_uuid(),
  municipio_id          uuid not null references public.municipios (id),
  nome                  text not null,
  comunidade            text not null,
  area                  extensions.geometry(Polygon, 4326) not null,
  responsavel_membro_id uuid,                     -- fk adicionada após membros
  status                public.status_nucleo not null default 'ativo',
  criado_em             timestamptz not null default now()
);
alter table public.nucleos enable row level security;
create index nucleos_area_gix on public.nucleos using gist (area);
create index nucleos_municipio_idx on public.nucleos (municipio_id);

-- ------------------------------------------------------------------- membros
create table public.membros (
  id            uuid primary key default gen_random_uuid(),
  perfil_id     uuid not null unique references public.perfis (id) on delete cascade,
  nucleo_id     uuid not null references public.nucleos (id),
  status        public.status_membro not null default 'pendente',
  funcao        text,
  aprovado_por  uuid references public.perfis (id),
  aprovado_em   timestamptz,
  criado_em     timestamptz not null default now()
);
alter table public.membros enable row level security;
create index membros_nucleo_idx on public.membros (nucleo_id, status);

alter table public.nucleos
  add constraint nucleos_responsavel_fk
  foreign key (responsavel_membro_id) references public.membros (id) on delete set null;

-- -------------------------------------------------------------- dispositivos
create table public.dispositivos (
  id              uuid primary key default gen_random_uuid(),
  perfil_id       uuid not null references public.perfis (id) on delete cascade,
  expo_push_token text not null unique,
  plataforma      text not null default 'android',
  app_versao      text,
  atualizado_em   timestamptz not null default now()
);
alter table public.dispositivos enable row level security;
create index dispositivos_perfil_idx on public.dispositivos (perfil_id);

-- --------------------------------------------------------------- areas_risco
create table public.areas_risco (
  id            uuid primary key default gen_random_uuid(),
  municipio_id  uuid not null references public.municipios (id),
  nome          text not null,
  tipo          public.tipo_area_risco not null,
  nivel         public.nivel_risco not null,
  area          extensions.geometry(Polygon, 4326) not null,
  fonte         text,
  criado_em     timestamptz not null default now()
);
alter table public.areas_risco enable row level security;
create index areas_risco_area_gix on public.areas_risco using gist (area);
create index areas_risco_municipio_idx on public.areas_risco (municipio_id);

-- ------------------------------------------------------------------- alertas
create table public.alertas (
  id            uuid primary key default gen_random_uuid(),
  municipio_id  uuid not null references public.municipios (id),
  origem        public.origem_alerta not null default 'manual',
  origem_ref    text,
  tipo          public.tipo_alerta not null,
  severidade    public.severidade_alerta not null,
  titulo        text not null,
  mensagem      text not null,
  area          extensions.geometry(MultiPolygon, 4326) not null,
  inicio_em     timestamptz not null default now(),
  encerrado_em  timestamptz,
  criado_por    uuid references public.perfis (id),
  criado_em     timestamptz not null default now()
);
alter table public.alertas enable row level security;
create index alertas_area_gix on public.alertas using gist (area);
create index alertas_municipio_vigente_idx on public.alertas (municipio_id, encerrado_em);

-- ----------------------------------------------------------- alerta_entregas
create table public.alerta_entregas (
  id              uuid primary key default gen_random_uuid(),
  alerta_id       uuid not null references public.alertas (id) on delete cascade,
  membro_id       uuid not null references public.membros (id) on delete cascade,
  nucleo_id       uuid not null references public.nucleos (id),
  status          public.status_entrega not null default 'sem_dispositivo',
  push_ticket     text,
  enviado_em      timestamptz,
  entregue_em     timestamptz,
  confirmado_em   timestamptz,     -- hora do toque no aparelho (vem do cliente)
  sincronizado_em timestamptz,     -- hora em que a confirmação chegou ao servidor
  unique (alerta_id, membro_id)
);
alter table public.alerta_entregas enable row level security;
create index alerta_entregas_membro_idx on public.alerta_entregas (membro_id);
create index alerta_entregas_nucleo_idx on public.alerta_entregas (nucleo_id);

-- --------------------------------------------------------------- ocorrencias
create table public.ocorrencias (
  id             uuid primary key,                -- gerado no cliente (idempotência offline)
  membro_id      uuid not null references public.membros (id),
  nucleo_id      uuid not null references public.nucleos (id),
  alerta_id      uuid references public.alertas (id) on delete set null,
  tipo           public.tipo_ocorrencia not null,
  descricao      text,
  local          extensions.geometry(Point, 4326) not null,
  precisao_m     numeric,
  foto_path      text,
  area_risco_id  uuid references public.areas_risco (id) on delete set null,
  status         public.status_ocorrencia not null default 'nova',
  triado_por     uuid references public.perfis (id),
  triado_em      timestamptz,
  observacao_triagem text,
  criado_em      timestamptz not null,            -- hora do aparelho
  recebido_em    timestamptz not null default now()
);
alter table public.ocorrencias enable row level security;
create index ocorrencias_local_gix on public.ocorrencias using gist (local);
create index ocorrencias_nucleo_idx on public.ocorrencias (nucleo_id, status);

-- ------------------------------------------------------------ alerta_disparos
-- fila de processamento da Edge Function disparar-alerta
create table public.alerta_disparos (
  alerta_id      uuid primary key references public.alertas (id) on delete cascade,
  status         text not null default 'pendente' check (status in ('pendente','processando','concluido','erro')),
  tentativas     int not null default 0,
  erro           text,
  criado_em      timestamptz not null default now(),
  atualizado_em  timestamptz not null default now()
);
alter table public.alerta_disparos enable row level security;
