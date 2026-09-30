-- Nupdec Conecta — políticas RLS
-- Matriz em specs/04-modelo-de-dados.md e ADR-0006.
-- service_role ignora RLS (Edge Functions e seed).

-- ---------------------------------------------------------------- municipios
create policy "municipios: leitura pública para cadastro"
  on public.municipios for select
  to anon, authenticated using (true);

-- -------------------------------------------------------------------- perfis
create policy "perfis: ver o próprio, os colegas de núcleo ou, gestor, os do município"
  on public.perfis for select to authenticated
  using (
    id = auth.uid()
    or (public.auth_e_gestor() and municipio_id = public.auth_municipio())
    or exists (select 1 from public.membros m where m.perfil_id = perfis.id and m.nucleo_id = public.auth_nucleo())
  );

create policy "perfis: editar o próprio (sem trocar papel/município)"
  on public.perfis for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and papel = public.auth_papel() and municipio_id = public.auth_municipio());

-- ------------------------------------------------------------------- nucleos
create policy "nucleos: leitura pública dos ativos (cadastro escolhe núcleo)"
  on public.nucleos for select
  to anon, authenticated using (true);

create policy "nucleos: coordenador cria"
  on public.nucleos for insert to authenticated
  with check (public.auth_papel() = 'coordenador' and municipio_id = public.auth_municipio());

create policy "nucleos: coordenador edita"
  on public.nucleos for update to authenticated
  using (public.auth_papel() = 'coordenador' and municipio_id = public.auth_municipio())
  with check (municipio_id = public.auth_municipio());

-- ------------------------------------------------------------------- membros
create policy "membros: ver os do meu núcleo ou, gestor, do município"
  on public.membros for select to authenticated
  using (
    perfil_id = auth.uid()
    or nucleo_id = public.auth_nucleo()
    or (public.auth_e_gestor() and exists (
          select 1 from public.nucleos n where n.id = membros.nucleo_id and n.municipio_id = public.auth_municipio()))
  );

create policy "membros: membro edita função própria"
  on public.membros for update to authenticated
  using (perfil_id = auth.uid())
  with check (perfil_id = auth.uid() and status = (select status from public.membros m2 where m2.id = membros.id));

create policy "membros: gestor aprova/rejeita no município"
  on public.membros for update to authenticated
  using (public.auth_e_gestor() and exists (
          select 1 from public.nucleos n where n.id = membros.nucleo_id and n.municipio_id = public.auth_municipio()))
  with check (true);

-- -------------------------------------------------------------- dispositivos
create policy "dispositivos: só os próprios"
  on public.dispositivos for all to authenticated
  using (perfil_id = auth.uid()) with check (perfil_id = auth.uid());

-- --------------------------------------------------------------- areas_risco
create policy "areas_risco: leitura no município"
  on public.areas_risco for select to authenticated
  using (municipio_id = public.auth_municipio());

create policy "areas_risco: coordenador gerencia"
  on public.areas_risco for all to authenticated
  using (public.auth_papel() = 'coordenador' and municipio_id = public.auth_municipio())
  with check (municipio_id = public.auth_municipio());

-- ------------------------------------------------------------------- alertas
create policy "alertas: membro vê os que recebeu; gestor vê os do município"
  on public.alertas for select to authenticated
  using (
    (public.auth_e_gestor() and municipio_id = public.auth_municipio())
    or exists (select 1 from public.alerta_entregas e where e.alerta_id = alertas.id and e.membro_id = public.auth_membro())
  );

create policy "alertas: coordenador encerra"
  on public.alertas for update to authenticated
  using (public.auth_papel() = 'coordenador' and municipio_id = public.auth_municipio())
  with check (municipio_id = public.auth_municipio());
-- insert só via criar_alerta() (security definer) ou service_role

-- ----------------------------------------------------------- alerta_entregas
create policy "entregas: membro vê as próprias; gestor vê as do município"
  on public.alerta_entregas for select to authenticated
  using (
    membro_id = public.auth_membro()
    or (public.auth_e_gestor() and exists (
          select 1 from public.nucleos n where n.id = alerta_entregas.nucleo_id and n.municipio_id = public.auth_municipio()))
  );
-- insert/update só via funções security definer (gerar_entregas, confirmar_alerta) ou service_role

-- --------------------------------------------------------------- ocorrencias
create policy "ocorrencias: ver as do meu núcleo ou, gestor, do município"
  on public.ocorrencias for select to authenticated
  using (
    nucleo_id = public.auth_nucleo()
    or (public.auth_e_gestor() and exists (
          select 1 from public.nucleos n where n.id = ocorrencias.nucleo_id and n.municipio_id = public.auth_municipio()))
  );

create policy "ocorrencias: membro aprovado reporta no próprio núcleo"
  on public.ocorrencias for insert to authenticated
  with check (
    membro_id = public.auth_membro()
    and nucleo_id = public.auth_nucleo()
    and exists (select 1 from public.membros m where m.id = public.auth_membro() and m.status = 'aprovado')
  );

create policy "ocorrencias: gestor faz triagem"
  on public.ocorrencias for update to authenticated
  using (public.auth_e_gestor() and exists (
          select 1 from public.nucleos n where n.id = ocorrencias.nucleo_id and n.municipio_id = public.auth_municipio()))
  with check (true);

-- ------------------------------------------------------------ alerta_disparos
create policy "disparos: gestor acompanha"
  on public.alerta_disparos for select to authenticated
  using (public.auth_e_gestor() and exists (
          select 1 from public.alertas a where a.id = alerta_disparos.alerta_id and a.municipio_id = public.auth_municipio()));

-- ------------------------------------------------------------------ grants
grant usage on schema public to anon, authenticated;
grant select on public.municipios, public.nucleos to anon;
grant select, insert, update on all tables in schema public to authenticated;
grant execute on all functions in schema public to authenticated;
grant execute on function public.geojson(extensions.geometry) to anon;
