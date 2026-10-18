-- Nupdec Conecta — chat do núcleo
-- Mensagens de texto entre os membros aprovados de um Nupdec. Gestores do
-- município leem (acompanhamento) e podem escrever (orientação da Compdec).

create table public.mensagens_nucleo (
  id          uuid primary key default gen_random_uuid(),
  nucleo_id   uuid not null references public.nucleos (id) on delete cascade,
  autor_id    uuid not null references public.perfis (id) on delete cascade,
  texto       text not null check (char_length(texto) between 1 and 2000),
  alerta_id   uuid references public.alertas (id) on delete set null,   -- mensagem no contexto de um alerta
  criado_em   timestamptz not null default now()
);
alter table public.mensagens_nucleo enable row level security;
create index mensagens_nucleo_idx on public.mensagens_nucleo (nucleo_id, criado_em desc);

-- membro aprovado do núcleo, ou gestor do município do núcleo
create or replace function public.pode_ver_nucleo(p_nucleo_id uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.membros m
    where m.perfil_id = auth.uid() and m.nucleo_id = p_nucleo_id and m.status = 'aprovado'
  ) or exists (
    select 1 from public.perfis p join public.nucleos n on n.municipio_id = p.municipio_id
    where p.id = auth.uid() and p.papel in ('agente','coordenador') and n.id = p_nucleo_id
  );
$$;

create policy "chat: lê quem participa do núcleo"
  on public.mensagens_nucleo for select to authenticated
  using (public.pode_ver_nucleo(nucleo_id));

create policy "chat: escreve quem participa, como autor"
  on public.mensagens_nucleo for insert to authenticated
  with check (autor_id = auth.uid() and public.pode_ver_nucleo(nucleo_id));

create policy "chat: autor apaga a própria mensagem"
  on public.mensagens_nucleo for delete to authenticated
  using (autor_id = auth.uid());

grant select, insert, delete on public.mensagens_nucleo to authenticated;
grant execute on function public.pode_ver_nucleo(uuid) to authenticated;

alter publication supabase_realtime add table public.mensagens_nucleo;
