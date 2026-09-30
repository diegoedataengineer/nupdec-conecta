# ADR-0005: Painel web e página de download em subdomínio da Hostinger

- **Status:** Aceita
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

A coordenação municipal (Compdec) precisa de um painel para cadastrar áreas de risco, disparar
alertas manuais e acompanhar confirmações e ocorrências. Também é preciso um endereço público
para baixar o APK (ADR-0004). O autor já tem conta e domínio na Hostinger, com MCP disponível
para DNS e deploy.

## Opções consideradas

1. **Vercel / Netlify.** Deploy fácil, mas mais um provedor e mais uma conta.
2. **Supabase Hosting.** Não existe como produto de site estático.
3. **Subdomínio da Hostinger.** Conta já existente; deploy de site estático via MCP; DNS no
   mesmo lugar.

## Decisão

**Site estático em um subdomínio da Hostinger**, com duas partes no mesmo build:

| Rota | Conteúdo |
|---|---|
| `/` | Página pública: o que é o projeto, link e QR code do APK, instruções de instalação |
| `/painel` | Painel da Compdec (login obrigatório): mapa de núcleos e áreas de risco, disparo de alerta, confirmações em tempo real, ocorrências |

Tecnologia do painel: **React + Vite + TypeScript**, `@supabase/supabase-js`, mapa com
**MapLibre GL** (tiles abertos) e desenho de polígonos. Sem framework de servidor — tudo
conversa direto com o Supabase pelo JWT do usuário.

Subdomínio e domínio-pai serão definidos pelo autor quando o painel estiver pronto para deploy.

## Consequências

- **Positivas:** um provedor a menos; DNS e hospedagem no mesmo painel; site estático não tem
  servidor para manter.
- **Negativas / riscos:** sem SSR, a chave `anon` fica no bundle (esperado no modelo Supabase;
  a segurança está na RLS); o painel precisa de rota de login antes de qualquer dado.
- **Obrigatório:** HTTPS no subdomínio (certificado da Hostinger); a URL do subdomínio entra
  na lista de *redirect URLs* do Supabase Auth.

## Referências

- [specs/06-painel-web.md](../../specs/06-painel-web.md)
- [ADR-0004](0004-distribuicao-apk-sideload.md)
