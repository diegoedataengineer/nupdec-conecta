-- Nupdec Conecta — apoio à demonstração
-- Simula a resposta da comunidade a um alerta vigente: confirma p_pct % das
-- entregas de membros com dispositivo SIMULADO (tokens seed-/sim-), com
-- horários espalhados nos primeiros 9 minutos após o envio. Nunca toca em
-- entregas de dispositivos reais. Só o coordenador pode chamar.
create or replace function public.simular_confirmacoes(p_alerta_id uuid, p_pct int default 80)
returns int language plpgsql security definer set search_path = public as $$
declare
  v_n int;
begin
  if public.auth_papel() <> 'coordenador' then
    raise exception 'apenas coordenador pode simular confirmações';
  end if;
  if not exists (select 1 from public.alertas a where a.id = p_alerta_id and a.municipio_id = public.auth_municipio()) then
    raise exception 'alerta não pertence ao município';
  end if;

  with candidatas as (
    select e.id, e.enviado_em, row_number() over (order by random()) as r, count(*) over () as total
    from public.alerta_entregas e
    join public.membros m on m.id = e.membro_id
    join public.dispositivos d on d.perfil_id = m.perfil_id
    where e.alerta_id = p_alerta_id
      and e.confirmado_em is null
      and e.enviado_em is not null
      and d.expo_push_token ~ '^Expo(nent)?PushToken\[(sim|seed)-'
  ), escolhidas as (
    select id, least(now(), enviado_em + ((20 + floor(random() * 520))::int) * interval '1 second') as quando
    from candidatas
    where r <= ceil(total * p_pct / 100.0)
  )
  update public.alerta_entregas e
     set confirmado_em = x.quando, sincronizado_em = x.quando + interval '3 seconds'
    from escolhidas x
   where x.id = e.id;
  get diagnostics v_n = row_count;
  return v_n;
end;
$$;
grant execute on function public.simular_confirmacoes(uuid, int) to authenticated;
