# 06 — Painel web da Compdec e página de download

Hospedagem e stack conforme [ADR-0005](../docs/adr/0005-painel-web-subdominio-hostinger.md).
Código em `web/`. React + Vite + TypeScript, `@supabase/supabase-js`, MapLibre GL com
`@mapbox/mapbox-gl-draw` (compatível) para desenhar polígonos, TanStack Query.

## Rotas

| Rota | Acesso | Conteúdo |
|---|---|---|
| `/` | público | Página de download: o que é, QR code + botão "Baixar APK", passo a passo de instalação com capturas, versão e data do build |
| `/painel/entrar` | público | Login |
| `/painel` | coordenador, agente | Visão geral do município |
| `/painel/nucleos` | coordenador, agente | Lista e mapa dos núcleos; criar/editar (coordenador) |
| `/painel/nucleos/:id` | coordenador, agente | Membros (aprovar/rejeitar), área, atividade |
| `/painel/areas-risco` | coordenador, agente | Mapa com polígonos; criar/editar (coordenador) |
| `/painel/alertas` | coordenador, agente | Histórico com taxa de confirmação; **Novo alerta** (coordenador) |
| `/painel/alertas/:id` | coordenador, agente | Acompanhamento ao vivo: % confirmado, tempo mediano, lista por núcleo, quem não confirmou |
| `/painel/ocorrencias` | coordenador, agente | Mapa + lista; triagem |

## Telas do protótipo

### Visão geral
- Quatro números grandes: núcleos ativos, membros aprovados, alertas nos últimos 30 dias,
  taxa média de confirmação em 10 min.
- Mapa do município com núcleos (polígonos) e áreas de risco (hachura por nível).
- Alertas vigentes com barra de progresso de confirmação.

### Novo alerta (coordenador)
1. Tipo e severidade.
2. Área: escolher áreas de risco existentes (multi-seleção) **ou** desenhar polígono **ou**
   "município inteiro".
3. Prévia: "Este alerta atingirá N núcleos e M membros" (consulta `ST_Intersects` antes de
   salvar).
4. Título e mensagem (modelos prontos por tipo).
5. Disparar → redireciona para o acompanhamento.

### Acompanhamento do alerta (Realtime)
- Assinatura no canal `alerta:{id}` (mudanças em `alerta_entregas`).
- Gráfico de confirmações acumuladas por minuto, com linha em 10 min.
- Tabela por núcleo: destinatários, confirmados, %, líder e telefone.
- Botão "Encerrar alerta".

### Ocorrências
- Mapa com pontos coloridos por status; clique abre foto, descrição, membro, hora, área de
  risco associada.
- Filtros: status, tipo, núcleo, período.
- Ação: mudar status e registrar observação de triagem.

### Página de download (`/`)
- Cabeçalho: "Nupdec Conecta — o alerta da Defesa Civil no celular do seu núcleo".
- Botão "Baixar APK (Android)" + QR code apontando para o mesmo arquivo.
- Passo a passo: baixar → abrir → permitir "instalar apps desconhecidos" → instalar → abrir e
  cadastrar. Uma captura por passo.
- Rodapé: meta 8.1.2 do PN-PDC, link para o repositório, versão do build.

## Build e deploy

```bash
cd web
npm ci
npm run build        # dist/
```

Deploy do `dist/` no subdomínio via MCP da Hostinger (site estático). O APK é copiado para
`dist/downloads/nupdec-conecta-<versão>.apk` antes do build, e `index.html` referencia o nome
da versão.

Variáveis: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_APK_VERSION`.

## Segurança

- Rotas `/painel/*` verificam sessão e papel no cliente **e** a RLS garante no servidor.
- URL do subdomínio registrada nos *redirect URLs* do Supabase Auth.
- Fotos por URL assinada com validade de 1 h.
