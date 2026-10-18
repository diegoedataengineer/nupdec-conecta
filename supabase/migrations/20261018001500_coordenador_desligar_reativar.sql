-- Nupdec Conecta — coordenador desliga um membro aprovado ou reabre um cadastro
create or replace function public.coordenador_desligar_membro(p_membro_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.auth_papel() <> 'coordenador' then raise exception 'apenas o coordenador desliga membros'; end if;
  update public.membros m set status = 'desligado'
   from public.nucleos n
   where m.id = p_membro_id and n.id = m.nucleo_id and n.municipio_id = public.auth_municipio() and m.status = 'aprovado';
  if not found then raise exception 'membro não encontrado ou não está aprovado'; end if;
end;
$$;

-- reabrir: volta para "pendente" e o fluxo recomeça pelo líder
create or replace function public.coordenador_reabrir_cadastro(p_membro_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if public.auth_papel() <> 'coordenador' then raise exception 'apenas o coordenador reabre cadastros'; end if;
  update public.membros m
     set status = 'pendente', pre_aprovado_por = null, pre_aprovado_em = null, aprovado_por = null, aprovado_em = null, motivo_rejeicao = null
   from public.nucleos n
   where m.id = p_membro_id and n.id = m.nucleo_id and n.municipio_id = public.auth_municipio() and m.status in ('rejeitado', 'desligado');
  if not found then raise exception 'membro não encontrado ou não está rejeitado/desligado'; end if;
end;
$$;
grant execute on function public.coordenador_desligar_membro(uuid), public.coordenador_reabrir_cadastro(uuid) to authenticated;
