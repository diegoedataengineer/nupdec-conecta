-- Nupdec Conecta — membros enxergam nome e papel dos gestores do município
-- Necessário para o chat mostrar "Defesa Civil" nas mensagens da Compdec e
-- para o app exibir quem aprovou/triou. Só perfis com papel agente/coordenador.
create policy "perfis: gestores do município são visíveis a todos"
  on public.perfis for select to authenticated
  using (papel in ('agente', 'coordenador') and municipio_id = public.auth_municipio());
