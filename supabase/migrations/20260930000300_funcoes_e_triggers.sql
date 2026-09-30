-- Nupdec Conecta — funções auxiliares e triggers

-- ------------------------------------------------ contexto do usuário logado
-- Retorna papel, município, membro e núcleo do usuário autenticado.
create or replace function public.auth_perfil()
returns table (papel public.papel, municipio_id uuid, membro_id uuid, nucleo_id uuid, membro_status public.status_membro)
language sql stable security definer set search_path = public as $$
  select p.papel, p.municipio_id, m.id, m.nucleo_id, m.status
  from public.perfis p
  left join public.membros m on m.perfil_id = p.id
  where p.id = auth.uid();
$$;

create or replace function public.auth_papel() returns public.papel
language sql stable security definer set search_path = public as $$
  select papel from public.perfis where id = auth.uid();
$$;

create or replace function public.auth_municipio() returns uuid
language sql stable security definer set search_path = public as $$
  select municipio_id from public.perfis where id = auth.uid();
$$;

create or replace function public.auth_membro() returns uuid
language sql stable security definer set search_path = public as $$
  select m.id from public.membros m where m.perfil_id = auth.uid();
$$;

create or replace function public.auth_nucleo() returns uuid
language sql stable security definer set search_path = public as $$
  select m.nucleo_id from public.membros m where m.perfil_id = auth.uid();
$$;

create or replace function public.auth_e_gestor() returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((select papel in ('agente','coordenador') from public.perfis where id = auth.uid()), false);
$$;

-- ------------------------------------------- perfil criado junto com o signup
-- O app envia em raw_user_meta_data: nome, telefone, municipio_id, nucleo_id.
-- Cria o perfil (papel membro) e o vínculo de membro com status pendente.
create or replace function public.handle_novo_usuario()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_municipio uuid := (new.raw_user_meta_data ->> 'municipio_id')::uuid;
  v_nucleo    uuid := (new.raw_user_meta_data ->> 'nucleo_id')::uuid;
  v_papel     public.papel := coalesce((new.raw_user_meta_data ->> 'papel')::public.papel, 'membro');
begin
  if v_municipio is null and v_nucleo is not null then
    select municipio_id into v_municipio from public.nucleos where id = v_nucleo;
  end if;
  if v_municipio is null then
    raise exception 'municipio_id obrigatório no cadastro';
  end if;

  insert into public.perfis (id, nome, telefone, papel, municipio_id)
  values (new.id,
          coalesce(new.raw_user_meta_data ->> 'nome', split_part(new.email, '@', 1)),
          new.raw_user_meta_data ->> 'telefone',
          v_papel,
          v_municipio);

  if v_papel = 'membro' and v_nucleo is not null then
    insert into public.membros (perfil_id, nucleo_id, status)
    values (new.id, v_nucleo, 'pendente');
  end if;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_novo_usuario();

-- --------------------------------------- ocorrência: área de risco mais próxima
create or replace function public.ocorrencia_area_risco()
returns trigger language plpgsql set search_path = public, extensions as $$
begin
  if new.area_risco_id is null then
    select a.id into new.area_risco_id
    from public.areas_risco a
    join public.nucleos n on n.id = new.nucleo_id and n.municipio_id = a.municipio_id
    where extensions.st_dwithin(a.area::extensions.geography, new.local::extensions.geography, 200)
    order by extensions.st_distance(a.area::extensions.geography, new.local::extensions.geography)
    limit 1;
  end if;
  return new;
end;
$$;

create trigger ocorrencias_area_risco
  before insert on public.ocorrencias
  for each row execute function public.ocorrencia_area_risco();

-- ---------------------------------------- alerta novo entra na fila de disparo
create or replace function public.enfileirar_disparo()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.alerta_disparos (alerta_id) values (new.id)
  on conflict do nothing;
  return new;
end;
$$;

create trigger alertas_enfileirar
  after insert on public.alertas
  for each row execute function public.enfileirar_disparo();

-- ------------------------------- gerar entregas (chamado pela Edge Function)
-- Cria uma linha em alerta_entregas para cada membro aprovado dos núcleos
-- cujo polígono intersecta a área do alerta. Retorna as entregas com token.
create or replace function public.gerar_entregas(p_alerta_id uuid)
returns table (o_entrega_id uuid, o_membro_id uuid, o_expo_push_token text)
language plpgsql security definer set search_path = public, extensions as $$
#variable_conflict use_column
begin
  insert into public.alerta_entregas (alerta_id, membro_id, nucleo_id, status)
  select a.id, m.id, n.id,
         case when exists (select 1 from public.dispositivos d where d.perfil_id = m.perfil_id)
              then 'enviado'::public.status_entrega else 'sem_dispositivo'::public.status_entrega end
  from public.alertas a
  join public.nucleos n on n.municipio_id = a.municipio_id
                       and n.status = 'ativo'
                       and extensions.st_intersects(n.area, a.area)
  join public.membros m on m.nucleo_id = n.id and m.status = 'aprovado'
  where a.id = p_alerta_id
  on conflict (alerta_id, membro_id) do nothing;

  return query
    select e.id, e.membro_id, d.expo_push_token
    from public.alerta_entregas e
    join public.membros m on m.id = e.membro_id
    join public.dispositivos d on d.perfil_id = m.perfil_id
    where e.alerta_id = p_alerta_id and e.enviado_em is null;
end;
$$;

-- --------------------------------------------- prévia de alcance de um alerta
-- Usada pelo painel antes de disparar: quantos núcleos e membros serão atingidos.
create or replace function public.previa_alerta(p_area_geojson jsonb)
returns table (nucleo_id uuid, nucleo_nome text, membros_aprovados bigint, com_dispositivo bigint)
language sql stable security definer set search_path = public, extensions as $$
  with area as (
    select extensions.st_setsrid(extensions.st_geomfromgeojson(p_area_geojson::text), 4326) as g
  )
  select n.id, n.nome,
         count(m.id),
         count(m.id) filter (where exists (select 1 from public.dispositivos d where d.perfil_id = m.perfil_id))
  from public.nucleos n
  cross join area
  left join public.membros m on m.nucleo_id = n.id and m.status = 'aprovado'
  where n.municipio_id = public.auth_municipio()
    and n.status = 'ativo'
    and extensions.st_intersects(n.area, area.g)
  group by n.id, n.nome
  order by n.nome;
$$;

-- --------------------------------------------- criar alerta a partir de GeoJSON
create or replace function public.criar_alerta(
  p_tipo public.tipo_alerta,
  p_severidade public.severidade_alerta,
  p_titulo text,
  p_mensagem text,
  p_area_geojson jsonb,
  p_origem public.origem_alerta default 'manual'
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
  v_geom extensions.geometry;
begin
  if public.auth_papel() <> 'coordenador' then
    raise exception 'apenas coordenador pode criar alerta';
  end if;
  v_geom := extensions.st_multi(extensions.st_setsrid(extensions.st_geomfromgeojson(p_area_geojson::text), 4326));
  insert into public.alertas (municipio_id, origem, tipo, severidade, titulo, mensagem, area, criado_por)
  values (public.auth_municipio(), p_origem, p_tipo, p_severidade, p_titulo, p_mensagem, v_geom, auth.uid())
  returning id into v_id;
  return v_id;
end;
$$;

-- ------------------------------------------------- confirmar recebimento
create or replace function public.confirmar_alerta(p_alerta_id uuid, p_confirmado_em timestamptz default now())
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.alerta_entregas
     set confirmado_em   = coalesce(confirmado_em, least(p_confirmado_em, now())),
         sincronizado_em = coalesce(sincronizado_em, now())
   where alerta_id = p_alerta_id
     and membro_id = public.auth_membro();
end;
$$;

-- ------------------------------------------------- registrar dispositivo
create or replace function public.registrar_dispositivo(p_token text, p_plataforma text default 'android', p_app_versao text default null)
returns void language plpgsql security definer set search_path = public as $$
begin
  insert into public.dispositivos (perfil_id, expo_push_token, plataforma, app_versao)
  values (auth.uid(), p_token, p_plataforma, p_app_versao)
  on conflict (expo_push_token) do update
    set perfil_id = excluded.perfil_id,
        app_versao = excluded.app_versao,
        atualizado_em = now();
end;
$$;

-- ------------------------------------------------- geometria como GeoJSON
-- Facilita o consumo no app e no painel sem lidar com WKB.
create or replace function public.geojson(g extensions.geometry) returns jsonb
language sql immutable set search_path = extensions as $$
  select extensions.st_asgeojson(g)::jsonb;
$$;
