# Nupdec Conecta — painel web e página de download

SPA com duas partes no mesmo build (ADR-0005, spec 06):

| Rota | Conteúdo |
|---|---|
| `/` | Página pública de download do APK (QR code, passo a passo, meta 8.1.2) |
| `/painel/entrar` | Login e-mail/senha (Supabase Auth) |
| `/painel` | Visão geral: 4 números, mapa do município, alertas vigentes |
| `/painel/alertas`, `/painel/alertas/novo`, `/painel/alertas/:id` | Histórico, disparo (coordenador) e acompanhamento ao vivo (Realtime) |
| `/painel/nucleos`, `/painel/nucleos/:id` | Núcleos no mapa, criar/editar (coordenador), aprovar membros |
| `/painel/areas-risco` | Áreas de risco com hachura por nível, criar/editar (coordenador) |
| `/painel/ocorrencias` | Mapa + lista com filtros, detalhe com foto e triagem |

Estilo e estrutura seguem o portal web do NeuroAgora: React 18 + Vite 5 (SWC), Tailwind 3 +
shadcn/ui, lucide-react, TanStack Query 5, React Router 6, react-hook-form + zod, sonner.
Mapas com MapLibre GL (tiles do OpenFreeMap) e desenho de polígonos com terra-draw.
Dados direto no Supabase pelo `anon` + sessão do usuário; a autorização é a RLS (ADR-0006).

## Rodar

```bash
cd web
cp .env.example .env      # ou scripts/gerar-env.sh na raiz do repositório
npm ci
npm run dev               # http://localhost:8080
```

## Build e checagem

```bash
npm run build             # dist/
npm run typecheck         # tsc --noEmit
```

## Variáveis (`.env`, nunca commitado)

| Variável | Uso |
|---|---|
| `VITE_SUPABASE_URL` | URL do projeto Supabase |
| `VITE_SUPABASE_ANON_KEY` | chave `anon` (pública; a segurança está na RLS) |
| `VITE_MAP_STYLE_URL` | estilo do MapLibre; padrão `https://tiles.openfreemap.org/styles/liberty` |
| `VITE_APK_VERSION` | versão exibida na página de download |
| `VITE_APK_URL` | link do APK; padrão `/downloads/nupdec-conecta.apk` |

## Deploy (subdomínio na Hostinger, site estático)

1. Copie o APK para `public/downloads/nupdec-conecta.apk` (ou ajuste `VITE_APK_URL`).
2. `npm run build`.
3. Envie o conteúdo de `dist/` para a pasta do subdomínio. O `public/.htaccess` vai junto e
   faz o rewrite de todas as rotas para `index.html` (BrowserRouter em Apache/LiteSpeed),
   além do MIME type do `.apk`.
4. Registre a URL do subdomínio em *Authentication → URL Configuration → Redirect URLs* no
   Supabase.

## Contas de teste (seed)

| Conta | Papel | Senha |
|---|---|---|
| `coordenador@valesereno.exemplo` | coordenador (dispara alertas, cadastra áreas e núcleos) | `Nupdec@2026` |
| `agente1@valesereno.exemplo` | agente (aprova membros, faz triagem) | `Nupdec@2026` |

Membros de núcleo não entram no painel — usam o aplicativo.

## Estrutura

```
src/
├── pages/                 # uma página por rota (Download, NotFound, painel/*)
├── components/
│   ├── layout/            # PainelLayout (header sticky) + PainelSidebar (shadcn Sidebar)
│   ├── ui/                # shadcn/ui copiado da referência
│   ├── mapa/              # Mapa (MapLibre, camadas declarativas) e DesenhoPoligono (terra-draw)
│   ├── alertas/           # badge de severidade, barra e gráfico de confirmação
│   ├── ocorrencias/       # diálogo de detalhe + triagem
│   └── shared/            # cartão de métrica, skeletons, cabeçalho, estados vazios
├── contexts/AuthContext   # sessão + perfil (RPC auth_perfil)
├── hooks/                 # queries/mutations por domínio (use-alertas, use-nucleos, ...)
├── integrations/supabase/ # client.ts e types.ts (schema tipado à mão)
└── lib/                   # utils (cn), rotulos (enums em pt-BR + cores), geo (EWKT, união, bbox)
```
