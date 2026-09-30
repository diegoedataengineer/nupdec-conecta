# Registros de decisão de arquitetura (ADRs)

Formato: [MADR](https://adr.github.io/madr/) simplificado. Um arquivo por decisão, numerado em
sequência, nunca editado depois de aceito — uma decisão que muda gera uma nova ADR que
substitui a anterior.

| Nº | Decisão | Status | Data |
|---|---|---|---|
| [0001](0001-meta-8-1-2-nupdecs.md) | Meta 8.1.2 (Nupdecs) como escopo do projeto | Aceita | 2026-09-29 |
| [0002](0002-supabase-backend-unico.md) | Supabase como backend único | Aceita | 2026-09-29 |
| [0003](0003-app-mobile-expo-stack-neuroagora.md) | App mobile com a stack Expo do NeuroAgora | Aceita | 2026-09-29 |
| [0004](0004-distribuicao-apk-sideload.md) | Distribuição por APK Android (sideload), sem Play Store | Aceita | 2026-09-29 |
| [0005](0005-painel-web-subdominio-hostinger.md) | Painel web e página de download em subdomínio da Hostinger | Aceita | 2026-09-29 |
| [0006](0006-autenticacao-supabase-auth.md) | Autenticação com Supabase Auth e RLS | Aceita | 2026-09-29 |
| [0007](0007-entrega-de-alertas-geoespacial-push.md) | Entrega de alertas por regra geoespacial + Expo Push | Proposta | 2026-09-29 |
| [0008](0008-offline-first-tanstack-query.md) | Offline-first com TanStack Query persistido | Proposta | 2026-09-29 |

Status possíveis: **Proposta** (aguarda validação), **Aceita**, **Substituída por ADR-nnnn**,
**Rejeitada**.

Modelo para novas ADRs: [template.md](template.md).
