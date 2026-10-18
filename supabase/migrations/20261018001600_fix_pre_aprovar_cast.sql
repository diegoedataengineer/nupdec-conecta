-- Nupdec Conecta — correção: CASE devolvia text para a coluna enum status_membro
create or replace function public.lider_pre_aprovar_membro(p_membro_id uuid, p_aprovar boolean, p_motivo text default null)
returns public.status_membro language plpgsql security definer set search_path = public as $$
declare
  v public.membros%rowtype;
  v_novo public.status_membro;
begin
  select * into v from public.membros where id = p_membro_id for update;
  if not found then raise exception 'membro não encontrado'; end if;
  if not public.auth_e_lider_de(v.nucleo_id) then raise exception 'apenas o líder do núcleo pode pré-aprovar'; end if;
  if v.status <> 'pendente' then raise exception 'cadastro não está pendente (status atual: %)', v.status; end if;

  v_novo := case when p_aprovar then 'pre_aprovado'::public.status_membro else 'rejeitado'::public.status_membro end;
  update public.membros
     set status = v_novo,
         pre_aprovado_por = auth.uid(), pre_aprovado_em = now(),
         motivo_rejeicao = case when p_aprovar then null else p_motivo end
   where id = p_membro_id;
  return v_novo;
end;
$$;
