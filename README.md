# Nupdec Conecta

Solução computacional para a **meta 8.1.2 do PN-PDC 2025–2035**: incentivar a criação e a
manutenção de Núcleos Comunitários de Proteção e Defesa Civil (Nupdecs) em parceria com os
municípios.

Um backend único (Supabase) atende um **app Android** para os membros do Nupdec e para os agentes
da Defesa Civil municipal, e um **painel web** para a coordenação (Compdec). O app faz o cadastro
do núcleo e dos membros, recebe alertas georreferenciados com confirmação de recebimento e envia
reportes de ocorrência com foto e GPS.

Trabalho de sistematização da disciplina **Arquiteturas Convergentes** (Turma C, 2026/2).
Entrega até **18/10/2026, 23:55**.

## Documentação

| Pasta | Conteúdo |
|---|---|
| [docs/adr/](docs/adr/) | Registros de decisão de arquitetura (ADRs) |
| [specs/](specs/) | Especificações: problema, meta, solução, arquitetura, dados, app, painel, indicadores, entrega |
| [docs/pnpdc-quadro-11-p138-139.png](docs/pnpdc-quadro-11-p138-139.png) | Página do PN-PDC com a meta 8.1.2 (Quadro 11) |

Comece por [specs/README.md](specs/README.md).

## Stack (resumo)

| Camada | Tecnologia | ADR |
|---|---|---|
| Backend | Supabase (Postgres + PostGIS, Auth, Storage, Edge Functions, Realtime) | [ADR-0002](docs/adr/0002-supabase-backend-unico.md) |
| App mobile | Expo SDK 54 / React Native 0.81 / expo-router 6 / TanStack Query 5 | [ADR-0003](docs/adr/0003-app-mobile-expo-stack-neuroagora.md) |
| Distribuição | APK Android por sideload, sem Play Store | [ADR-0004](docs/adr/0004-distribuicao-apk-sideload.md) |
| Painel web + download | Site estático em subdomínio da Hostinger | [ADR-0005](docs/adr/0005-painel-web-subdominio-hostinger.md) |
| Autenticação | Supabase Auth com RLS | [ADR-0006](docs/adr/0006-autenticacao-supabase-auth.md) |
| Alertas | Regra geoespacial no Postgres + Expo Push (FCM) | [ADR-0007](docs/adr/0007-entrega-de-alertas-geoespacial-push.md) |

## Estrutura prevista do repositório

```
nupdec-conecta/
├── docs/adr/        # decisões (este commit)
├── specs/           # especificações (este commit)
├── supabase/        # migrations, seed, edge functions   (próximo passo)
├── mobile/          # app Expo                            (próximo passo)
└── web/             # painel da Compdec + página do APK   (próximo passo)
```

## Fonte oficial

Ministério da Integração e do Desenvolvimento Regional — Plano Nacional de Proteção e Defesa
Civil 2025–2035: <https://www.gov.br/mdr/pt-br/assuntos/protecao-e-defesa-civil/pn-pdc>
