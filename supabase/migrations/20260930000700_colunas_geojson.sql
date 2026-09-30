-- Nupdec Conecta — colunas computadas GeoJSON para o PostgREST
-- Uso no supabase-js: .select('id, nome, area_geojson')  /  .select('*, local_geojson')
-- (PostgREST expõe funções cujo único argumento é o tipo da tabela como colunas computadas.)

create or replace function public.area_geojson(n public.nucleos) returns jsonb
language sql stable set search_path = extensions as $$ select extensions.st_asgeojson(n.area)::jsonb $$;

create or replace function public.area_geojson(a public.areas_risco) returns jsonb
language sql stable set search_path = extensions as $$ select extensions.st_asgeojson(a.area)::jsonb $$;

create or replace function public.area_geojson(al public.alertas) returns jsonb
language sql stable set search_path = extensions as $$ select extensions.st_asgeojson(al.area)::jsonb $$;

create or replace function public.local_geojson(o public.ocorrencias) returns jsonb
language sql stable set search_path = extensions as $$ select extensions.st_asgeojson(o.local)::jsonb $$;

create or replace function public.limite_geojson(m public.municipios) returns jsonb
language sql stable set search_path = extensions as $$ select extensions.st_asgeojson(m.limite)::jsonb $$;

-- centroide, útil para centralizar o mapa
create or replace function public.centro(n public.nucleos) returns jsonb
language sql stable set search_path = extensions as $$ select extensions.st_asgeojson(extensions.st_centroid(n.area))::jsonb $$;

grant execute on function
  public.area_geojson(public.nucleos), public.area_geojson(public.areas_risco), public.area_geojson(public.alertas),
  public.local_geojson(public.ocorrencias), public.limite_geojson(public.municipios), public.centro(public.nucleos)
to anon, authenticated;
