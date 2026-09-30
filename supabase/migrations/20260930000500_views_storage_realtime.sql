-- Nupdec Conecta — views de indicadores, storage e realtime

-- ------------------------------------------------ taxa de confirmação por alerta
create or replace view public.v_alerta_confirmacao
with (security_invoker = true) as
select a.id as alerta_id, a.municipio_id, a.titulo, a.tipo, a.severidade, a.inicio_em, a.encerrado_em,
       count(e.id)                                                  as destinatarios,
       count(e.id) filter (where e.status <> 'sem_dispositivo')     as com_dispositivo,
       count(e.confirmado_em)                                       as confirmados,
       count(e.confirmado_em) filter (
         where e.confirmado_em <= e.enviado_em + interval '10 minutes'
           and e.confirmado_em >= e.enviado_em - interval '5 minutes')   as confirmados_10min,
       round(100.0 * count(e.confirmado_em) filter (
         where e.confirmado_em <= e.enviado_em + interval '10 minutes'
           and e.confirmado_em >= e.enviado_em - interval '5 minutes')
         / nullif(count(e.id), 0), 1)                               as pct_confirmado_10min,
       percentile_cont(0.5) within group (order by e.confirmado_em - e.enviado_em)
         filter (where e.confirmado_em is not null and e.enviado_em is not null) as mediana_tempo
from public.alertas a
left join public.alerta_entregas e on e.alerta_id = a.id
group by a.id;

-- ------------------------------------------------ confirmação por núcleo/alerta
create or replace view public.v_alerta_confirmacao_nucleo
with (security_invoker = true) as
select e.alerta_id, n.id as nucleo_id, n.nome as nucleo_nome, n.responsavel_membro_id,
       count(e.id)                as destinatarios,
       count(e.confirmado_em)     as confirmados,
       round(100.0 * count(e.confirmado_em) / nullif(count(e.id), 0), 1) as pct_confirmado
from public.alerta_entregas e
join public.nucleos n on n.id = e.nucleo_id
group by e.alerta_id, n.id;

-- ------------------------------------------------ atividade do núcleo (evidência)
create or replace view public.v_nucleo_atividade
with (security_invoker = true) as
select n.id as nucleo_id, n.municipio_id, n.nome, n.comunidade, n.status,
       count(distinct m.id) filter (where m.status = 'aprovado')  as membros_aprovados,
       count(distinct m.id) filter (where m.status = 'pendente')  as membros_pendentes,
       count(distinct d.id)                                        as dispositivos,
       max(e.confirmado_em)                                        as ultima_confirmacao,
       count(distinct o.id) filter (where o.criado_em > now() - interval '90 days') as ocorrencias_90d
from public.nucleos n
left join public.membros m on m.nucleo_id = n.id
left join public.dispositivos d on d.perfil_id = m.perfil_id
left join public.alerta_entregas e on e.nucleo_id = n.id
left join public.ocorrencias o on o.nucleo_id = n.id
group by n.id;

-- ------------------------------------------------ resumo do município (visão geral)
create or replace view public.v_municipio_resumo
with (security_invoker = true) as
select mu.id as municipio_id, mu.nome, mu.uf,
       (select count(*) from public.nucleos n where n.municipio_id = mu.id and n.status = 'ativo') as nucleos_ativos,
       (select count(*) from public.membros m join public.nucleos n on n.id = m.nucleo_id
         where n.municipio_id = mu.id and m.status = 'aprovado') as membros_aprovados,
       (select count(*) from public.alertas a where a.municipio_id = mu.id and a.inicio_em > now() - interval '30 days') as alertas_30d,
       (select round(avg(v.pct_confirmado_10min), 1) from public.v_alerta_confirmacao v
         where v.municipio_id = mu.id and v.inicio_em > now() - interval '30 days') as pct_confirmado_10min_30d
from public.municipios mu;

grant select on public.v_alerta_confirmacao, public.v_alerta_confirmacao_nucleo,
                public.v_nucleo_atividade, public.v_municipio_resumo to authenticated;

-- ------------------------------------------------ storage: fotos de ocorrência
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('ocorrencias', 'ocorrencias', false, 5242880, array['image/jpeg', 'image/png', 'image/webp'])
on conflict (id) do nothing;

-- caminho: <municipio_id>/<nucleo_id>/<ocorrencia_id>.jpg
create policy "fotos: membro aprovado envia no próprio núcleo"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'ocorrencias'
    and (storage.foldername(name))[2] = public.auth_nucleo()::text
  );

create policy "fotos: leitura por quem vê o núcleo"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'ocorrencias'
    and (
      (storage.foldername(name))[2] = public.auth_nucleo()::text
      or (public.auth_e_gestor() and (storage.foldername(name))[1] = public.auth_municipio()::text)
    )
  );

-- ------------------------------------------------ realtime: painel ao vivo
alter publication supabase_realtime add table public.alerta_entregas;
alter publication supabase_realtime add table public.ocorrencias;
alter publication supabase_realtime add table public.alertas;
