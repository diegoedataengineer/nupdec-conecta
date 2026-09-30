-- Nupdec Conecta — apoio às Edge Functions ingerir-alerta e recibos-push

-- Inserção de alerta externo (chamada só com service_role pela Edge Function).
create or replace function public.inserir_alerta_externo(
  p_municipio_id uuid,
  p_origem public.origem_alerta,
  p_origem_ref text,
  p_tipo public.tipo_alerta,
  p_severidade public.severidade_alerta,
  p_titulo text,
  p_mensagem text,
  p_area_geojson jsonb
) returns uuid
language plpgsql security definer set search_path = public, extensions as $$
declare
  v_id uuid;
begin
  insert into public.alertas (municipio_id, origem, origem_ref, tipo, severidade, titulo, mensagem, area)
  values (p_municipio_id, p_origem, p_origem_ref, p_tipo, p_severidade, p_titulo, p_mensagem,
          st_multi(st_setsrid(st_geomfromgeojson(p_area_geojson::text), 4326)))
  returning id into v_id;
  return v_id;
end;
$$;
revoke execute on function public.inserir_alerta_externo(uuid, public.origem_alerta, text, public.tipo_alerta, public.severidade_alerta, text, text, jsonb) from public, anon, authenticated;

-- Entregas com ticket e sem recibo processado: lidas pela função recibos-push.
create or replace view public.v_entregas_sem_recibo as
select id, push_ticket, enviado_em
from public.alerta_entregas
where status = 'enviado'
  and push_ticket is not null
  and entregue_em is null
  and enviado_em > now() - interval '24 hours';
revoke select on public.v_entregas_sem_recibo from anon, authenticated;
