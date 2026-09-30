# ADR-0006: Autenticação com Supabase Auth e RLS

- **Status:** Aceita
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

Três perfis usam a solução com permissões diferentes: **membro** do Nupdec (vê alertas do seu
núcleo, confirma recebimento, reporta ocorrência), **agente** da Defesa Civil municipal (valida
núcleos e membros, faz triagem de ocorrências) e **coordenador** da Compdec (dispara alertas,
cadastra áreas de risco, vê métricas). O NeuroAgora usa Cognito, mas aqui o backend é Supabase.

## Opções consideradas

1. **Cognito** (como no NeuroAgora). Reaproveita código, mas cria um segundo provedor e obriga
   a validar JWT externo no Supabase.
2. **Supabase Auth com e-mail + senha e RLS por perfil.** Integrado ao Postgres; o JWT já chega
   nas políticas via `auth.uid()`.
3. **Supabase Auth com OTP por telefone.** Ideal para comunidade (muita gente não tem e-mail),
   mas exige provedor de SMS pago (Twilio) e configuração extra.

## Decisão

**Supabase Auth com e-mail + senha** para o protótipo, com o perfil e o vínculo ao município e
ao núcleo guardados na tabela `perfis` (1:1 com `auth.users`). OTP por telefone fica registrado
como evolução natural para produção, dado o público.

Regras de acesso, aplicadas via RLS (detalhe em [specs/04-modelo-de-dados.md](../../specs/04-modelo-de-dados.md)):

| Tabela | membro | agente | coordenador |
|---|---|---|---|
| `nucleos` | lê o seu | lê/edita os do seu município | lê/edita os do seu município |
| `membros` | lê os do seu núcleo; edita o próprio | valida (aprova/rejeita) | idem agente |
| `areas_risco` | lê as do seu município | lê | cria/edita |
| `alertas` | lê os direcionados ao seu núcleo | lê os do município | cria |
| `alerta_entregas` | insere/atualiza a própria confirmação | lê | lê |
| `ocorrencias` | cria; lê as do seu núcleo | lê/triagem no município | lê/triagem |
| `dispositivos` | insere/atualiza o próprio token | — | — |

Cadastro de membro: o próprio cidadão cria a conta no app e escolhe o núcleo; o agente aprova.
Contas de agente e coordenador são criadas pelo painel (convite por e-mail).

## Consequências

- **Positivas:** um provedor só; políticas em SQL versionadas nas migrations; testável com
  `set role` + `request.jwt.claims` em testes SQL.
- **Negativas / riscos:** e-mail exclui parte do público real (aceito no protótipo); esquecer
  RLS em uma tabela nova expõe dados — a migration que cria tabela sempre habilita RLS na mesma
  transação.
- **Obrigatório:** `service_role` nunca sai das Edge Functions; app e painel só usam `anon` +
  sessão do usuário.

## Referências

- Supabase, Row Level Security: <https://supabase.com/docs/guides/database/postgres/row-level-security>
- [ADR-0002](0002-supabase-backend-unico.md)
