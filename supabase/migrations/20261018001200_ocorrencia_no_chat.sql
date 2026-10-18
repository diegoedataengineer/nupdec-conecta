-- Nupdec Conecta — ocorrência reportada vira mensagem no chat do núcleo
-- Quando um membro reporta uma ocorrência, o núcleo inteiro fica sabendo na
-- hora pelo chat (e a Compdec, pelo painel). A mensagem carrega o id da
-- ocorrência para o app renderizar um cartão com tipo, foto e status.

alter table public.mensagens_nucleo
  add column if not exists ocorrencia_id uuid references public.ocorrencias (id) on delete set null;
create index if not exists mensagens_nucleo_ocorrencia_idx on public.mensagens_nucleo (ocorrencia_id);

create or replace function public.rotulo_tipo_ocorrencia(t public.tipo_ocorrencia) returns text
language sql immutable as $$
  select case t
    when 'trinca' then 'Trinca'
    when 'deslizamento' then 'Deslizamento'
    when 'alagamento' then 'Alagamento'
    when 'arvore' then 'Árvore caída'
    when 'bueiro' then 'Bueiro entupido'
    else 'Outro' end;
$$;

create or replace function public.ocorrencia_para_chat()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_autor uuid;
begin
  select perfil_id into v_autor from public.membros where id = new.membro_id;
  if v_autor is null then return new; end if;
  insert into public.mensagens_nucleo (nucleo_id, autor_id, texto, alerta_id, ocorrencia_id)
  values (
    new.nucleo_id,
    v_autor,
    format('Ocorrência reportada: %s%s%s',
           public.rotulo_tipo_ocorrencia(new.tipo),
           case when new.descricao is not null and new.descricao <> '' then ' — ' || new.descricao else '' end,
           case when new.foto_path is not null then ' (com foto)' else '' end),
    new.alerta_id,
    new.id
  );
  return new;
end;
$$;

drop trigger if exists ocorrencias_para_chat on public.ocorrencias;
create trigger ocorrencias_para_chat
  after insert on public.ocorrencias
  for each row execute function public.ocorrencia_para_chat();

-- quando a Compdec muda o status, o núcleo também fica sabendo
create or replace function public.triagem_para_chat()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if new.status is distinct from old.status and new.triado_por is not null then
    insert into public.mensagens_nucleo (nucleo_id, autor_id, texto, ocorrencia_id)
    values (
      new.nucleo_id,
      new.triado_por,
      format('Ocorrência "%s" marcada como %s%s',
             public.rotulo_tipo_ocorrencia(new.tipo),
             case new.status when 'em_analise' then 'em análise' when 'atendida' then 'atendida' when 'descartada' then 'descartada' else 'nova' end,
             case when new.observacao_triagem is not null and new.observacao_triagem <> '' then ': ' || new.observacao_triagem else '' end),
      new.id
    );
  end if;
  return new;
end;
$$;

drop trigger if exists ocorrencias_triagem_para_chat on public.ocorrencias;
create trigger ocorrencias_triagem_para_chat
  after update of status on public.ocorrencias
  for each row execute function public.triagem_para_chat();
