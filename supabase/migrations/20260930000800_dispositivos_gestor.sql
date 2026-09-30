-- Nupdec Conecta — gestores enxergam os dispositivos do município
-- Sem isso, v_nucleo_atividade.dispositivos (security_invoker) e a lista de
-- membros do painel sempre mostram zero para agente/coordenador.

create policy "dispositivos: gestor lê os do município"
  on public.dispositivos for select to authenticated
  using (
    public.auth_e_gestor()
    and exists (select 1 from public.perfis p where p.id = dispositivos.perfil_id and p.municipio_id = public.auth_municipio())
  );
