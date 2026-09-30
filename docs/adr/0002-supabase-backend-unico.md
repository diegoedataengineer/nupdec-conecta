# ADR-0002: Supabase como backend único

- **Status:** Aceita
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

O app mobile e o painel web precisam compartilhar cadastro de núcleos, membros, áreas de risco,
alertas, confirmações de recebimento e reportes de ocorrência. Há 19 dias até a entrega e uma
pessoa no projeto. O enunciado exige pelo menos três componentes tecnológicos com função
definida e um diagrama de arquitetura.

## Opções consideradas

1. **Backend próprio** (Node/NestJS ou FastAPI + Postgres em VPS). Controle total, mas exige
   escrever autenticação, upload, WebSocket e deploy do zero.
2. **Firebase** (Firestore + Auth + Cloud Functions + FCM). Push nativo, mas Firestore é NoSQL
   sem consulta geoespacial por polígono, o que complica a regra "alerta ∩ área do núcleo".
3. **Supabase** (Postgres + PostGIS, Auth, Storage, Edge Functions, Realtime). Relacional e
   geoespacial nativo, SQL para os indicadores, um projeto só.

## Decisão

**Supabase.** Cada serviço assume um papel explícito na arquitetura:

| Serviço | Função na solução |
|---|---|
| Postgres + PostGIS | Cadastro (municípios, núcleos, membros, dispositivos), polígonos de área de risco, alertas, confirmações e ocorrências; consulta "quem está dentro do polígono do alerta" |
| Auth | Login de membro do Nupdec, agente municipal e coordenador; RLS separa o que cada perfil vê |
| Storage | Fotos dos reportes de ocorrência |
| Edge Functions | Ingestão de alertas externos (Cemaden/INMET/manual), regra alerta ∩ polígono → push, geração de métricas |
| Realtime | Painel da Compdec acompanhando confirmações e ocorrências ao vivo |

O projeto Supabase será criado pelo autor no momento oportuno e o acesso liberado via MCP. Até
lá, schema, migrations e seed ficam versionados em `supabase/` prontos para aplicar.

## Consequências

- **Positivas:** um único projeto para os dois frontends; SQL direto para calcular o indicador
  de resultado; PostGIS resolve o geoespacial sem serviço extra; plano gratuito cobre o
  protótipo.
- **Negativas / riscos:** dependência de fornecedor (risco aceito para um protótipo);
  Edge Functions em Deno têm limites de tempo de execução; RLS mal configurada expõe dados,
  portanto cada tabela nasce com RLS habilitada e política explícita.
- **Obrigatório:** nenhuma credencial no repositório; `service_role` só em Edge Functions;
  app e painel usam apenas a chave `anon` + JWT do usuário.

## Referências

- [specs/03-arquitetura.md](../../specs/03-arquitetura.md)
- [specs/04-modelo-de-dados.md](../../specs/04-modelo-de-dados.md)
