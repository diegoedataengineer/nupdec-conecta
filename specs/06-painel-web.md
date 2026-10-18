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
| `/diretoria`, `/diretoria/coordenacoes`, `/diretoria/coordenacoes/:id`, `/diretoria/gestores` | diretor | Camada acima das coordenações: cria coordenações com polígono (RPC `diretor_salvar_coordenacao`), vê resumo por coordenação (`v_coordenacao_resumo`), cria contas de coordenadores/agentes (Edge Function `criar-gestor`) e os vincula (`diretor_vincular_gestor`). Núcleos se vinculam à coordenação cuja área contém seu centro (gatilho). Migrations 20261018001800–1900 |
| `/painel/chat` | coordenador, agente | Chat de cada núcleo: lista de núcleos ordenada pela última mensagem, conversa em tempo real, resposta como Defesa Civil (destacada no app) |

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

## Simulador do app Android (`/app`) — adicionado em 18/10/2026

Enquanto o APK não existe, o painel inclui um **simulador do app** para a demonstração:
uma moldura de celular (390×800) com barra de status, abas inferiores e as telas da spec 05
(entrar, alertas, detalhe com "Recebi e estou ciente", nova ocorrência com foto e GPS,
ocorrências do núcleo, núcleo, perfil). Pontos de desenho:

- **Sessão própria** (`storageKey: nupdec-app-auth`): o membro no "celular" e o coordenador no
  painel convivem no mesmo navegador. Mesmo backend, mesma RLS.
- **Push simulado via Realtime**: o celular assina `alerta_entregas` filtrando o próprio
  `membro_id`; quando a Edge Function cria a entrega, o banner aparece com bipe e vibração.
  No app real o mesmo evento chega pelo Expo Push.
- **Token simulado** (`ExponentPushToken[sim-…]`): registrado no login via `registrar_dispositivo`;
  a Edge Function marca essas entregas como `entregue` sem chamar o Expo.
- **GPS**: usa o do navegador; se negado ou fora do município fictício, cai numa posição dentro
  do polígono do núcleo (indicado na tela como "posição simulada").
- **Botão "Simular comunidade (demo)"** no acompanhamento do alerta: RPC `simular_confirmacoes`
  confirma ~80 % das entregas de dispositivos simulados (seed), nunca de dispositivos reais.

- **Cadastro** (`/app/cadastrar`): nome, e-mail, senha, telefone, município e núcleo → `signUp` com
  metadados; o trigger cria perfil + membro **pendente**; o agente aprova no painel. O projeto
  roda com `mailer_autoconfirm = true` (sem e-mail de confirmação) para o protótipo.
- **Chat do núcleo** (aba Chat): tabela `mensagens_nucleo` (RLS: membros aprovados do núcleo e
  gestores do município; Realtime). Substitui o grupo de WhatsApp, com histórico ligado ao núcleo.
- **Mapas** nas telas de alerta, núcleo e novo reporte com o mesmo MapLibre do painel
  (`MapaCelular`). Todo mapa tem o botão **Mapa / Satélite** (Esri World Imagery + rótulos; preferência
  guardada no navegador); o componente reaplica as camadas após o `setStyle`.

- **Modo de demonstração `/demo`**: quatro celulares lado a lado, cada um com cliente Supabase próprio
  (`storageKey` por aparelho) e `MemoryRouter` próprio, logados como membros diferentes.
- **Ocorrência → chat**: gatilhos `ocorrencias_para_chat` e `ocorrencias_triagem_para_chat`
  (migration 20261018001200) publicam no chat do núcleo cada ocorrência reportada e cada mudança de
  status; a mensagem leva `ocorrencia_id` e o app a renderiza como cartão.

Código em `web/src/app-celular/`. Rota pública de entrada: `/app/entrar`; link na página de download.

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
