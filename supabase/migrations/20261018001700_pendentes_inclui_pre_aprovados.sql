-- Nupdec Conecta — "pendentes" do núcleo inclui os pré-aprovados (aguardam o coordenador)
create or replace view public.v_nucleo_atividade
with (security_invoker = true) as
select n.id as nucleo_id, n.municipio_id, n.nome, n.comunidade, n.status,
       count(distinct m.id) filter (where m.status = 'aprovado')  as membros_aprovados,
       count(distinct m.id) filter (where m.status in ('pendente', 'pre_aprovado'))  as membros_pendentes,
       count(distinct d.id)                                        as dispositivos,
       max(e.confirmado_em)                                        as ultima_confirmacao,
       count(distinct o.id) filter (where o.criado_em > now() - interval '90 days') as ocorrencias_90d
from public.nucleos n
left join public.membros m on m.nucleo_id = n.id
left join public.dispositivos d on d.perfil_id = m.perfil_id
left join public.alerta_entregas e on e.nucleo_id = n.id
left join public.ocorrencias o on o.nucleo_id = n.id
group by n.id;
