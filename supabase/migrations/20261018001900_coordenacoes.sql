-- Nupdec Conecta — Diretoria (2/2): coordenações com área delimitada
-- Uma diretoria (estadual/regional) cria coordenações — cada uma com um
-- polígono de abrangência — e designa coordenadores e agentes. Os núcleos
-- ficam vinculados à coordenação cuja área contém o centro do núcleo.

create type public.nivel_coordenacao as enum ('municipal', 'regional', 'estadual');

create table public.coordenacoes (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  nivel         public.nivel_coordenacao not null default 'municipal',
  uf            char(2) not null,
  municipio_id  uuid references public.municipios (id),   -- sede / município de referência
  descricao     text,
  area          extensions.geometry(MultiPolygon, 4326) not null,
  status        text not null default 'ativa' check (status in ('ativa', 'inativa')),
  criado_por    uuid references public.perfis (id),
  criado_em     timestamptz not null default now()
);
alter table public.coordenacoes enable row level security;
create index coordenacoes_area_gix on public.coordenacoes using gist (area);

alter table public.perfis  add column if not exists coordenacao_id uuid references public.coordenacoes (id) on delete set null;
alter table public.nucleos add column if not exists coordenacao_id uuid references public.coordenacoes (id) on delete set null;
create index if not exists nucleos_coordenacao_idx on public.nucleos (coordenacao_id);

create or replace function public.auth_e_diretor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel = 'diretor' from public.perfis where id = auth.uid()), false);
$$;

-- vínculo automático: coordenação (ativa) cuja área contém o centro do núcleo; a mais específica (menor) vence
create or replace function public.vincular_nucleo_coordenacao()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.coordenacao_id is null or tg_op = 'UPDATE' and new.area is distinct from old.area then
    select c.id into new.coordenacao_id
    from public.coordenacoes c
    where c.status = 'ativa' and st_contains(c.area, st_centroid(new.area))
    order by st_area(c.area) asc
    limit 1;
  end if;
  return new;
end;
$$;
drop trigger if exists nucleos_vincular_coordenacao on public.nucleos;
create trigger nucleos_vincular_coordenacao
  before insert or update of area on public.nucleos
  for each row execute function public.vincular_nucleo_coordenacao();

-- ao criar/alterar a área de uma coordenação, revincula os núcleos dentro dela
create or replace function public.revincular_nucleos_da_coordenacao()
returns trigger language plpgsql security definer set search_path = public, extensions as $$
begin
  update public.nucleos n
     set coordenacao_id = (
       select c.id from public.coordenacoes c
       where c.status = 'ativa' and st_contains(c.area, st_centroid(n.area))
       order by st_area(c.area) asc limit 1)
   where st_contains(new.area, st_centroid(n.area)) or n.coordenacao_id = new.id;
  return new;
end;
$$;
drop trigger if exists coordenacoes_revincular on public.coordenacoes;
create trigger coordenacoes_revincular
  after insert or update of area, status on public.coordenacoes
  for each row execute function public.revincular_nucleos_da_coordenacao();

-- políticas
create policy "coordenacoes: leitura para autenticados"
  on public.coordenacoes for select to authenticated using (true);
create policy "coordenacoes: diretor cria"
  on public.coordenacoes for insert to authenticated with check (public.auth_e_diretor());
create policy "coordenacoes: diretor edita"
  on public.coordenacoes for update to authenticated using (public.auth_e_diretor()) with check (public.auth_e_diretor());
grant select, insert, update on public.coordenacoes to authenticated;

-- diretor enxerga o que precisa para governar (leitura)
create policy "perfis: diretor lê gestores" on public.perfis for select to authenticated
  using (public.auth_e_diretor() and papel in ('agente', 'coordenador', 'diretor'));
create policy "perfis: diretor edita vínculo de gestores" on public.perfis for update to authenticated
  using (public.auth_e_diretor() and papel in ('agente', 'coordenador')) with check (papel in ('agente', 'coordenador'));
create policy "membros: diretor lê" on public.membros for select to authenticated using (public.auth_e_diretor());
create policy "alertas: diretor lê" on public.alertas for select to authenticated using (public.auth_e_diretor());
create policy "entregas: diretor lê" on public.alerta_entregas for select to authenticated using (public.auth_e_diretor());
create policy "ocorrencias: diretor lê" on public.ocorrencias for select to authenticated using (public.auth_e_diretor());
create policy "areas_risco: diretor lê" on public.areas_risco for select to authenticated using (public.auth_e_diretor());
create policy "dispositivos: diretor lê" on public.dispositivos for select to authenticated using (public.auth_e_diretor());
create policy "chat: diretor lê" on public.mensagens_nucleo for select to authenticated using (public.auth_e_diretor());

-- criar/editar coordenação a partir de GeoJSON
create or replace function public.diretor_salvar_coordenacao(
  p_id uuid, p_nome text, p_nivel public.nivel_coordenacao, p_uf char(2), p_municipio_id uuid,
  p_descricao text, p_area_geojson jsonb, p_status text default 'ativa'
) returns uuid language plpgsql security definer set search_path = public, extensions as $$
declare v_id uuid; v_geom extensions.geometry;
begin
  if not public.auth_e_diretor() then raise exception 'apenas a diretoria gerencia coordenações'; end if;
  v_geom := st_multi(st_setsrid(st_geomfromgeojson(p_area_geojson::text), 4326));
  if p_id is null then
    insert into public.coordenacoes (nome, nivel, uf, municipio_id, descricao, area, status, criado_por)
    values (p_nome, p_nivel, upper(p_uf), p_municipio_id, p_descricao, v_geom, p_status, auth.uid()) returning id into v_id;
  else
    update public.coordenacoes set nome = p_nome, nivel = p_nivel, uf = upper(p_uf), municipio_id = p_municipio_id,
           descricao = p_descricao, area = v_geom, status = p_status where id = p_id returning id into v_id;
  end if;
  return v_id;
end;
$$;

-- designar/desvincular um gestor existente a uma coordenação
create or replace function public.diretor_vincular_gestor(p_perfil_id uuid, p_coordenacao_id uuid, p_papel public.papel)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.auth_e_diretor() then raise exception 'apenas a diretoria designa gestores'; end if;
  if p_papel not in ('agente', 'coordenador') then raise exception 'papel inválido'; end if;
  update public.perfis set coordenacao_id = p_coordenacao_id, papel = p_papel,
         municipio_id = coalesce((select municipio_id from public.coordenacoes where id = p_coordenacao_id), municipio_id)
   where id = p_perfil_id and papel in ('agente', 'coordenador');
  if not found then raise exception 'gestor não encontrado'; end if;
end;
$$;
grant execute on function public.auth_e_diretor(), public.diretor_salvar_coordenacao(uuid, text, public.nivel_coordenacao, char, uuid, text, jsonb, text), public.diretor_vincular_gestor(uuid, uuid, public.papel) to authenticated;

-- colunas computadas GeoJSON
create or replace function public.area_geojson(c public.coordenacoes) returns jsonb
language sql stable set search_path = extensions as $$ select extensions.st_asgeojson(c.area)::jsonb $$;
grant execute on function public.area_geojson(public.coordenacoes) to anon, authenticated;

-- resumo por coordenação (visão da diretoria)
create or replace view public.v_coordenacao_resumo
with (security_invoker = true) as
select c.id as coordenacao_id, c.nome, c.nivel, c.uf, c.status,
       (select count(*) from public.nucleos n where n.coordenacao_id = c.id and n.status = 'ativo') as nucleos_ativos,
       (select count(*) from public.membros m join public.nucleos n on n.id = m.nucleo_id where n.coordenacao_id = c.id and m.status = 'aprovado') as membros_aprovados,
       (select count(*) from public.perfis p where p.coordenacao_id = c.id and p.papel = 'coordenador') as coordenadores,
       (select count(*) from public.perfis p where p.coordenacao_id = c.id and p.papel = 'agente') as agentes,
       (select count(distinct e.alerta_id) from public.alerta_entregas e join public.nucleos n on n.id = e.nucleo_id
          join public.alertas a on a.id = e.alerta_id where n.coordenacao_id = c.id and a.inicio_em > now() - interval '30 days') as alertas_30d,
       (select round(100.0 * count(e.confirmado_em) filter (where e.confirmado_em <= e.enviado_em + interval '10 minutes') / nullif(count(e.id), 0), 1)
          from public.alerta_entregas e join public.nucleos n on n.id = e.nucleo_id join public.alertas a on a.id = e.alerta_id
          where n.coordenacao_id = c.id and a.inicio_em > now() - interval '30 days') as pct_confirmado_10min_30d,
       (select count(*) from public.ocorrencias o join public.nucleos n on n.id = o.nucleo_id where n.coordenacao_id = c.id and o.criado_em > now() - interval '30 days') as ocorrencias_30d
from public.coordenacoes c;
grant select on public.v_coordenacao_resumo to authenticated;

-- ------------------------------------------------ seed da diretoria (demo)
do $$
declare v_mun uuid; v_dir uuid := gen_random_uuid(); v_c1 uuid; v_c2 uuid;
begin
  select id into v_mun from public.municipios where codigo_ibge = '3599999';
  if v_mun is null then return; end if;
  if not exists (select 1 from auth.users where email = 'diretoria.sp@valesereno.exemplo') then
    insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                            raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                            confirmation_token, recovery_token, email_change, email_change_token_new,
                            email_change_token_current, phone_change, phone_change_token, reauthentication_token)
    values (v_dir, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
            'diretoria.sp@valesereno.exemplo', extensions.crypt('Nupdec@2026', extensions.gen_salt('bf')), now(),
            '{"provider":"email","providers":["email"]}',
            jsonb_build_object('nome', 'Helena Castro', 'papel', 'diretor', 'municipio_id', v_mun, 'telefone', '(11) 99999-0003'),
            now(), now(), '', '', '', '', '', '', '', '');
    insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
    values (gen_random_uuid(), v_dir, v_dir::text, 'email', jsonb_build_object('sub', v_dir::text, 'email', 'diretoria.sp@valesereno.exemplo', 'email_verified', true), now(), now(), now());
  else
    select id into v_dir from auth.users where email = 'diretoria.sp@valesereno.exemplo';
  end if;

  -- coordenação municipal = limite do município; regional = retângulo maior
  insert into public.coordenacoes (nome, nivel, uf, municipio_id, descricao, area, criado_por)
  values ('Compdec Vale Sereno', 'municipal', 'SP', v_mun, 'Coordenadoria Municipal de Proteção e Defesa Civil de Vale Sereno',
          (select limite from public.municipios where id = v_mun), v_dir) returning id into v_c1;
  insert into public.coordenacoes (nome, nivel, uf, municipio_id, descricao, area, criado_por)
  values ('Coordenação Regional Vale do Paraíba', 'regional', 'SP', v_mun, 'Regional da Defesa Civil estadual — apoio aos municípios do Vale do Paraíba',
          extensions.st_multi(extensions.st_geomfromtext('POLYGON((-46.10 -22.95, -45.40 -22.95, -45.40 -23.45, -46.10 -23.45, -46.10 -22.95))', 4326)), v_dir) returning id into v_c2;

  update public.perfis set coordenacao_id = v_c1 where papel in ('coordenador', 'agente') and municipio_id = v_mun;
end $$;
