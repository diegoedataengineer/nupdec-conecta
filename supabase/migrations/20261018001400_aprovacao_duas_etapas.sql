-- Nupdec Conecta — aprovação em duas etapas (2/2): colunas, funções, políticas
-- A palavra final é do coordenador, mas só depois da pré-aprovação do líder do
-- núcleo (membro apontado em nucleos.responsavel_membro_id). Rejeição pode
-- acontecer nas duas etapas. Transições só por estas funções (security definer).

alter table public.membros
  add column if not exists pre_aprovado_por uuid references public.perfis (id),
  add column if not exists pre_aprovado_em timestamptz,
  add column if not exists motivo_rejeicao text;

-- o membro logado é o líder do núcleo informado?
create or replace function public.auth_e_lider_de(p_nucleo_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.nucleos n
    join public.membros m on m.id = n.responsavel_membro_id
    where n.id = p_nucleo_id and m.perfil_id = auth.uid() and m.status = 'aprovado'
  );
$$;

-- etapa 1: líder pré-aprova (ou rejeita) um cadastro pendente do seu núcleo
create or replace function public.lider_pre_aprovar_membro(p_membro_id uuid, p_aprovar boolean, p_motivo text default null)
returns public.status_membro language plpgsql security definer set search_path = public as $$
declare
  v public.membros%rowtype;
begin
  select * into v from public.membros where id = p_membro_id for update;
  if not found then raise exception 'membro não encontrado'; end if;
  if not public.auth_e_lider_de(v.nucleo_id) then raise exception 'apenas o líder do núcleo pode pré-aprovar'; end if;
  if v.status <> 'pendente' then raise exception 'cadastro não está pendente (status atual: %)', v.status; end if;

  update public.membros
     set status = case when p_aprovar then 'pre_aprovado' else 'rejeitado' end,
         pre_aprovado_por = auth.uid(), pre_aprovado_em = now(),
         motivo_rejeicao = case when p_aprovar then null else p_motivo end
   where id = p_membro_id;
  return case when p_aprovar then 'pre_aprovado'::public.status_membro else 'rejeitado'::public.status_membro end;
end;
$$;

-- etapa 2: coordenador aprova (só se pré-aprovado) ou rejeita (em qualquer etapa)
create or replace function public.coordenador_decidir_membro(p_membro_id uuid, p_aprovar boolean, p_motivo text default null)
returns public.status_membro language plpgsql security definer set search_path = public as $$
declare
  v public.membros%rowtype;
begin
  if public.auth_papel() <> 'coordenador' then raise exception 'apenas o coordenador da Compdec decide a aprovação'; end if;
  select m.* into v from public.membros m join public.nucleos n on n.id = m.nucleo_id
   where m.id = p_membro_id and n.municipio_id = public.auth_municipio() for update of m;
  if not found then raise exception 'membro não encontrado no seu município'; end if;

  if p_aprovar then
    if v.status <> 'pre_aprovado' then
      raise exception 'aprovação final exige a pré-aprovação do líder do núcleo (status atual: %)', v.status;
    end if;
    update public.membros set status = 'aprovado', aprovado_por = auth.uid(), aprovado_em = now(), motivo_rejeicao = null where id = p_membro_id;
    return 'aprovado';
  else
    if v.status not in ('pendente', 'pre_aprovado') then
      raise exception 'só cadastros pendentes ou pré-aprovados podem ser rejeitados';
    end if;
    update public.membros set status = 'rejeitado', aprovado_por = auth.uid(), aprovado_em = now(), motivo_rejeicao = p_motivo where id = p_membro_id;
    return 'rejeitado';
  end if;
end;
$$;

grant execute on function public.auth_e_lider_de(uuid), public.lider_pre_aprovar_membro(uuid, boolean, text), public.coordenador_decidir_membro(uuid, boolean, text) to authenticated;

-- gestores não mudam status por update direto: só pelas funções acima
drop policy if exists "membros: gestor aprova/rejeita no município" on public.membros;
create policy "membros: gestor edita função no município"
  on public.membros for update to authenticated
  using (public.auth_e_gestor() and exists (
          select 1 from public.nucleos n where n.id = membros.nucleo_id and n.municipio_id = public.auth_municipio()))
  with check (status = (select m2.status from public.membros m2 where m2.id = membros.id));

-- o núcleo fica sabendo pelo chat quando alguém é aprovado
create or replace function public.aprovacao_para_chat()
returns trigger language plpgsql security definer set search_path = public as $$
declare v_nome text;
begin
  if new.status = 'aprovado' and old.status is distinct from 'aprovado' and new.aprovado_por is not null then
    select nome into v_nome from public.perfis where id = new.perfil_id;
    insert into public.mensagens_nucleo (nucleo_id, autor_id, texto)
    values (new.nucleo_id, new.aprovado_por, format('%s entrou no núcleo — cadastro aprovado pela Defesa Civil.', coalesce(v_nome, 'Novo membro')));
  end if;
  return new;
end;
$$;
drop trigger if exists membros_aprovacao_para_chat on public.membros;
create trigger membros_aprovacao_para_chat
  after update of status on public.membros
  for each row execute function public.aprovacao_para_chat();
