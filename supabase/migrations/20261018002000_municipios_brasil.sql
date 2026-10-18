-- Nupdec Conecta — municípios do Brasil (IBGE) para a diretoria federal
-- A tabela municipios passa a ter os 5.570 municípios (carga a partir da API
-- de localidades do IBGE; ver scripts/importar-municipios-ibge.sh). O app de
-- cadastro só lista municípios com núcleo ativo; a diretoria escolhe UF → município.

create index if not exists municipios_uf_idx on public.municipios (uf, nome);

-- municípios que já têm Nupdec ativo (para o cadastro no app)
create or replace function public.municipios_com_nucleos()
returns table (id uuid, nome text, uf char(2))
language sql stable security definer set search_path = public as $$
  select distinct m.id, m.nome, m.uf
  from public.municipios m
  join public.nucleos n on n.municipio_id = m.id and n.status = 'ativo'
  order by m.uf, m.nome;
$$;
grant execute on function public.municipios_com_nucleos() to anon, authenticated;

-- diretoria grava o limite oficial (malha IBGE) do município
create or replace function public.diretor_definir_limite_municipio(p_municipio_id uuid, p_geojson jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $$
begin
  if not public.auth_e_diretor() then raise exception 'apenas a diretoria define limites'; end if;
  update public.municipios
     set limite = st_multi(st_setsrid(st_geomfromgeojson(p_geojson::text), 4326))
   where id = p_municipio_id;
end;
$$;
grant execute on function public.diretor_definir_limite_municipio(uuid, jsonb) to authenticated;
