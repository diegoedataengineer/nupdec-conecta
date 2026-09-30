-- Nupdec Conecta — seed do município fictício "Vale Sereno – SP"
-- Contas de teste (senha padrão do protótipo: Nupdec@2026):
--   coordenador@valesereno.exemplo   coordenador
--   agente1@valesereno.exemplo       agente
--   lider.esperanca@valesereno.exemplo  membro líder do Nupdec Morro da Esperança
--   membroNN@valesereno.exemplo      membros (NN = 01..96)
-- Coordenadas fictícias na região do Vale do Paraíba (SP).

set search_path = public, extensions;

do $$
declare
  v_senha      text := crypt('Nupdec@2026', gen_salt('bf'));
  v_mun        uuid;
  v_coord      uuid := gen_random_uuid();
  v_agente     uuid := gen_random_uuid();
  v_lider      uuid := gen_random_uuid();
  v_nucleos    uuid[] := array[gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid(), gen_random_uuid()];
  v_nomes      text[] := array['Nupdec Morro da Esperança', 'Nupdec Vila do Córrego', 'Nupdec Alto da Serra', 'Nupdec Jardim das Águas', 'Nupdec Bairro Novo'];
  v_comun      text[] := array['Morro da Esperança', 'Vila do Córrego', 'Alto da Serra', 'Jardim das Águas', 'Bairro Novo'];
  -- polígonos (lon lat) — quadriláteros de ~600 m em torno de pontos distintos
  v_areas      text[] := array[
    'POLYGON((-45.905 -23.195, -45.897 -23.195, -45.897 -23.201, -45.905 -23.201, -45.905 -23.195))',
    'POLYGON((-45.915 -23.205, -45.907 -23.205, -45.907 -23.211, -45.915 -23.211, -45.915 -23.205))',
    'POLYGON((-45.895 -23.185, -45.887 -23.185, -45.887 -23.191, -45.895 -23.191, -45.895 -23.185))',
    'POLYGON((-45.925 -23.190, -45.917 -23.190, -45.917 -23.196, -45.925 -23.196, -45.925 -23.190))',
    'POLYGON((-45.885 -23.210, -45.877 -23.210, -45.877 -23.216, -45.885 -23.216, -45.885 -23.210))'];
  v_alerta1    uuid;
  v_alerta2    uuid;
  v_uid        uuid;
  v_membro_id  uuid;
  i int; j int; n int := 0;
  v_primeiros  text[] := array['Ana','Bruno','Carla','Diego','Elaine','Fábio','Gisele','Hugo','Iara','João','Karina','Luís','Marta','Nilton','Olívia','Paulo','Quésia','Rafael','Sônia','Tiago','Úrsula','Vera','Wagner','Xavier','Yara','Zeca'];
  v_sobren     text[] := array['Silva','Santos','Oliveira','Souza','Pereira','Lima','Costa','Ferreira','Rodrigues','Almeida','Nascimento','Araújo','Ribeiro','Carvalho','Gomes'];
begin
  -- município
  insert into public.municipios (codigo_ibge, nome, uf, prioritario, limite)
  values ('3599999', 'Vale Sereno', 'SP', true,
          st_multi(st_geomfromtext('POLYGON((-45.94 -23.17, -45.86 -23.17, -45.86 -23.23, -45.94 -23.23, -45.94 -23.17))', 4326)))
  returning id into v_mun;

  -- núcleos
  for i in 1..5 loop
    insert into public.nucleos (id, municipio_id, nome, comunidade, area)
    values (v_nucleos[i], v_mun, v_nomes[i], v_comun[i], st_geomfromtext(v_areas[i], 4326));
  end loop;

  -- áreas de risco (sobrepõem parcialmente os núcleos 1, 2, 3 e 4)
  insert into public.areas_risco (municipio_id, nome, tipo, nivel, area, fonte) values
    (v_mun, 'Encosta do Morro da Esperança', 'deslizamento', 'muito_alto',
      st_geomfromtext('POLYGON((-45.903 -23.194, -45.898 -23.194, -45.898 -23.199, -45.903 -23.199, -45.903 -23.194))', 4326), 'SGB 2024'),
    (v_mun, 'Margem do Córrego Sereno', 'inundacao', 'alto',
      st_geomfromtext('POLYGON((-45.914 -23.206, -45.906 -23.206, -45.906 -23.209, -45.914 -23.209, -45.914 -23.206))', 4326), 'Compdec'),
    (v_mun, 'Talude do Alto da Serra', 'deslizamento', 'alto',
      st_geomfromtext('POLYGON((-45.894 -23.186, -45.889 -23.186, -45.889 -23.190, -45.894 -23.190, -45.894 -23.186))', 4326), 'SGB 2024'),
    (v_mun, 'Baixada do Jardim das Águas', 'enxurrada', 'medio',
      st_geomfromtext('POLYGON((-45.923 -23.191, -45.918 -23.191, -45.918 -23.195, -45.923 -23.195, -45.923 -23.191))', 4326), 'Compdec');

  -- usuários de gestão (trigger cria perfis)
  insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                          raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
  values
    (v_coord, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'coordenador@valesereno.exemplo', v_senha, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('nome', 'Marcos Vieira', 'papel', 'coordenador', 'municipio_id', v_mun, 'telefone', '(12) 99999-0001'),
     now(), now(), '', '', '', '', '', '', '', ''),
    (v_agente, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'agente1@valesereno.exemplo', v_senha, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('nome', 'Patrícia Ramos', 'papel', 'agente', 'municipio_id', v_mun, 'telefone', '(12) 99999-0002'),
     now(), now(), '', '', '', '', '', '', '', ''),
    (v_lider, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
     'lider.esperanca@valesereno.exemplo', v_senha, now(),
     '{"provider":"email","providers":["email"]}',
     jsonb_build_object('nome', 'Maria das Dores', 'papel', 'membro', 'municipio_id', v_mun, 'nucleo_id', v_nucleos[1], 'telefone', '(12) 99999-0100'),
     now(), now(), '', '', '', '', '', '', '', '');

  -- líder aprovada e responsável pelo núcleo 1
  update public.membros set status = 'aprovado', funcao = 'líder', aprovado_por = v_agente, aprovado_em = now() - interval '60 days'
   where perfil_id = v_lider returning id into v_membro_id;
  update public.nucleos set responsavel_membro_id = v_membro_id where id = v_nucleos[1];
  insert into public.dispositivos (perfil_id, expo_push_token, app_versao)
  values (v_lider, 'ExponentPushToken[seed-lider-0001]', '0.1.0');

  -- 96 membros: ~19 por núcleo; 88 aprovados, 6 pendentes, 2 rejeitados; 80% com dispositivo
  for i in 1..5 loop
    for j in 1..(case when i = 1 then 20 else 19 end) loop
      n := n + 1;
      v_uid := gen_random_uuid();
      insert into auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at,
                              raw_app_meta_data, raw_user_meta_data, created_at, updated_at,
                          confirmation_token, recovery_token, email_change, email_change_token_new,
                          email_change_token_current, phone_change, phone_change_token, reauthentication_token)
      values (v_uid, '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated',
              format('membro%s@valesereno.exemplo', lpad(n::text, 2, '0')), v_senha, now(),
              '{"provider":"email","providers":["email"]}',
              jsonb_build_object('nome', v_primeiros[1 + (n % 26)] || ' ' || v_sobren[1 + (n % 15)],
                                 'papel', 'membro', 'municipio_id', v_mun, 'nucleo_id', v_nucleos[i]),
              now() - (n || ' days')::interval, now(), '', '', '', '', '', '', '', '');
      if n % 16 = 0 then
        update public.membros set status = 'pendente' where perfil_id = v_uid;
      elsif n % 48 = 1 then
        update public.membros set status = 'rejeitado' where perfil_id = v_uid;
      else
        update public.membros set status = 'aprovado', aprovado_por = v_agente, aprovado_em = now() - (n || ' days')::interval,
               funcao = case when j = 1 and i > 1 then 'líder' else 'apoio' end
         where perfil_id = v_uid;
        if n % 5 <> 0 then
          insert into public.dispositivos (perfil_id, expo_push_token, app_versao)
          values (v_uid, format('ExponentPushToken[seed-%s]', lpad(n::text, 4, '0')), '0.1.0');
        end if;
        if j = 1 and i > 1 then
          update public.nucleos set responsavel_membro_id = (select id from public.membros where perfil_id = v_uid) where id = v_nucleos[i];
        end if;
      end if;
    end loop;
  end loop;

  -- ------------------------------------------------ alerta histórico 1 (62 %)
  insert into public.alertas (municipio_id, origem, tipo, severidade, titulo, mensagem, area, inicio_em, encerrado_em, criado_por)
  values (v_mun, 'cemaden', 'deslizamento', 'alerta',
          'Risco alto de deslizamento — chuva acumulada',
          'Acumulado de 90 mm em 24 h. Moradores das encostas devem ficar atentos a trincas, estalos e água barrenta. Em caso de sinal, saia e avise o núcleo.',
          st_multi(st_geomfromtext('POLYGON((-45.91 -23.18, -45.88 -23.18, -45.88 -23.205, -45.91 -23.205, -45.91 -23.18))', 4326)),
          now() - interval '21 days', now() - interval '20 days', v_coord)
  returning id into v_alerta1;
  perform public.gerar_entregas(v_alerta1);
  update public.alerta_entregas set enviado_em = (select inicio_em from public.alertas where id = v_alerta1) + interval '20 seconds'
   where alerta_id = v_alerta1;
  update public.alerta_entregas set entregue_em = enviado_em + interval '4 seconds' where alerta_id = v_alerta1 and status = 'enviado';
  -- 62 % confirmam em 10 min, mais 10 % depois
  with numerados as (
    select id, row_number() over (order by id) as r, count(*) over () as total
    from public.alerta_entregas where alerta_id = v_alerta1
  )
  update public.alerta_entregas e
     set confirmado_em = e.enviado_em + (case when nu.r <= nu.total * 0.62 then (30 + (nu.r * 37) % 540) else (700 + nu.r * 60) end) * interval '1 second',
         sincronizado_em = e.enviado_em + (case when nu.r <= nu.total * 0.62 then (35 + (nu.r * 37) % 540) else (705 + nu.r * 60) end) * interval '1 second'
    from numerados nu
   where nu.id = e.id and nu.r <= nu.total * 0.72;

  -- ------------------------------------------------ alerta histórico 2 (84 %)
  insert into public.alertas (municipio_id, origem, tipo, severidade, titulo, mensagem, area, inicio_em, encerrado_em, criado_por)
  values (v_mun, 'manual', 'inundacao', 'alerta_maximo',
          'Córrego Sereno transbordando — evacuar margens',
          'Nível do córrego subiu 1,8 m em 40 minutos. Moradores da Vila do Córrego e do Jardim das Águas devem sair para o ponto de apoio da escola municipal.',
          st_multi(st_geomfromtext('POLYGON((-45.93 -23.185, -45.90 -23.185, -45.90 -23.215, -45.93 -23.215, -45.93 -23.185))', 4326)),
          now() - interval '6 days', now() - interval '5 days 18 hours', v_coord)
  returning id into v_alerta2;
  perform public.gerar_entregas(v_alerta2);
  update public.alerta_entregas set enviado_em = (select inicio_em from public.alertas where id = v_alerta2) + interval '15 seconds'
   where alerta_id = v_alerta2;
  update public.alerta_entregas set entregue_em = enviado_em + interval '3 seconds' where alerta_id = v_alerta2 and status = 'enviado';
  with numerados as (
    select id, row_number() over (order by id) as r, count(*) over () as total
    from public.alerta_entregas where alerta_id = v_alerta2
  )
  update public.alerta_entregas e
     set confirmado_em = e.enviado_em + (case when nu.r <= nu.total * 0.84 then (20 + (nu.r * 29) % 500) else (800 + nu.r * 45) end) * interval '1 second',
         sincronizado_em = e.enviado_em + (case when nu.r <= nu.total * 0.84 then (24 + (nu.r * 29) % 500) else (803 + nu.r * 45) end) * interval '1 second'
    from numerados nu
   where nu.id = e.id and nu.r <= nu.total * 0.90;

  update public.alerta_disparos set status = 'concluido' where alerta_id in (v_alerta1, v_alerta2);

  -- ------------------------------------------------ ocorrências (12)
  insert into public.ocorrencias (id, membro_id, nucleo_id, alerta_id, tipo, descricao, local, precisao_m, status, triado_por, triado_em, criado_em)
  select gen_random_uuid(), m.id, m.nucleo_id,
         case when k <= 7 then v_alerta1 else v_alerta2 end,
         (array['trinca','deslizamento','alagamento','arvore','bueiro','trinca','alagamento','alagamento','bueiro','trinca','deslizamento','outro'])[k]::public.tipo_ocorrencia,
         (array['Trinca nova no muro de arrimo atrás da casa 14','Barranco cedeu parcialmente na viela 3','Água entrando nas casas da rua de baixo','Árvore caída bloqueando a escada','Bueiro entupido, rua alagando','Rachadura no chão da laje','Rua principal com 40 cm de água','Córrego cobrindo a passarela','Boca de lobo transbordando','Trinca em parede de casa vazia','Deslizamento pequeno atrás da igreja','Poste inclinado'])[k],
         st_setsrid(st_makepoint(x, y), 4326), 8 + k,
         (array['atendida','atendida','atendida','descartada','atendida','em_analise','atendida','atendida','atendida','em_analise','nova','nova'])[k]::public.status_ocorrencia,
         case when k <= 10 then v_agente end,
         case when k <= 10 then now() - interval '5 days' end,
         case when k <= 7 then now() - interval '21 days' + (k * 11) * interval '1 minute'
              else now() - interval '6 days' + (k * 7) * interval '1 minute' end
  from (values
    (1, -45.9005, -23.1965), (2, -45.9015, -23.1975), (3, -45.9100, -23.2075), (4, -45.9020, -23.1990),
    (5, -45.9095, -23.2080), (6, -45.8915, -23.1875), (7, -45.9105, -23.2070), (8, -45.9200, -23.1930),
    (9, -45.9210, -23.1940), (10, -45.9000, -23.1980), (11, -45.9010, -23.1960), (12, -45.8800, -23.2120)
  ) as p(k, x, y)
  join lateral (
    select mm.id, mm.nucleo_id from public.membros mm
    join public.nucleos nn on nn.id = mm.nucleo_id
    where mm.status = 'aprovado' and st_contains(nn.area, st_setsrid(st_makepoint(p.x, p.y), 4326))
    order by mm.id limit 1
  ) m on true;

  -- identidades (GoTrue exige uma por usuário com provider email)
  insert into auth.identities (id, user_id, provider_id, provider, identity_data, last_sign_in_at, created_at, updated_at)
  select gen_random_uuid(), u.id, u.id::text, 'email',
         jsonb_build_object('sub', u.id::text, 'email', u.email, 'email_verified', true),
         now(), now(), now()
  from auth.users u
  where u.email like '%@valesereno.exemplo'
    and not exists (select 1 from auth.identities i where i.user_id = u.id);
end $$;
