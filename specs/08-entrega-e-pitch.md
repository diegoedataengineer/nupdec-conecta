# 08 — Entrega e pitch

## Formato da entrega

Um único arquivo `.zip` enviado no Moodle até **18/10/2026, 23:55**, contendo:

- `Nupdec-Conecta-Sistematizacao.pdf` — documento com os 17 itens (exportado do slide ou do
  Markdown);
- `Nupdec-Conecta-Pitch.mp4` — vídeo de até 5 minutos;
- `prototipo/` — capturas de tela do app e do painel, link do repositório e do subdomínio,
  APK.

## Os 17 itens e onde cada um está

| # | Item | Fonte no repositório | Status |
|---|---|---|---|
| 1 | Nome do projeto | **Nupdec Conecta** | ok |
| 2 | Integrante | Diego Nunes de Morais | ok |
| 3 | Problema | [01-problema-e-meta.md](01-problema-e-meta.md) § Problema | ok |
| 4 | Público afetado | [01](01-problema-e-meta.md) § Público | ok |
| 5 | Meta do PN-PDC selecionada | [01](01-problema-e-meta.md) § Meta — 8.1.2 literal | ok |
| 6 | Objetivo relacionado | [01](01-problema-e-meta.md) § Objetivo — 8.1 | ok |
| 7 | Eixo de atuação | [01](01-problema-e-meta.md) § Eixo — os cinco; foco Pp e Rp | ok |
| 8 | Prazo da meta | [01](01-problema-e-meta.md) § Prazo — 2027/2031/2035 | ok |
| 9 | Indicador da meta | [01](01-problema-e-meta.md) § Indicador; [07](07-indicadores.md) | ok |
| 10 | Solução proposta | [02-solucao.md](02-solucao.md) | ok |
| 11 | Entrada, processamento e saída | [02](02-solucao.md) § tabela E/P/S | ok |
| 12 | Arquitetura | [03-arquitetura.md](03-arquitetura.md) diagrama; [04](04-modelo-de-dados.md) | ok |
| 13 | Tecnologias utilizadas | [03](03-arquitetura.md) § tabela de 8 componentes com função | ok |
| 14 | Protótipo (mock) | [05-app-mobile.md](05-app-mobile.md), [06-painel-web.md](06-painel-web.md) + capturas | a produzir |
| 15 | Indicador de resultado da solução | [07-indicadores.md](07-indicadores.md) — 0 % → 80 % em 10 min | ok |
| 16 | Benefício esperado | abaixo | ok |
| 17 | Limitação ou risco | [09-riscos-e-limitacoes.md](09-riscos-e-limitacoes.md) | ok |

### Benefício esperado [16]

- **Para o morador:** o alerta chega no celular de quem conhece a rua e sabe em que porta
  bater; a comunidade age nos primeiros minutos em vez de esperar.
- **Para o Nupdec:** cadastro, função e área definidos; o voluntário deixa de depender da
  memória do grupo de WhatsApp.
- **Para a Compdec:** saber, em minutos, que percentual da rede recebeu o alerta e quem não
  recebeu; ocorrências georreferenciadas com foto em vez de áudio solto.
- **Para a meta 8.1.2:** o próprio banco de dados é a evidência de "Nupdec apoiado e ativo",
  algo que hoje a Sedec precisa levantar por formulário.
- **Para o Sinpdec:** modelo replicável, distribuído sem loja de aplicativos e com custo de
  operação próximo de zero para município pequeno.

## Rubrica e o que cada critério exige de nós

| Critério | Pontos | Evidência que vamos mostrar |
|---|---|---|
| Problema | 1,0 | As quatro perguntas respondidas com número de municípios e perfil do público |
| Meta PN-PDC | 1,5 | Código 8.1.2, texto literal, captura da p. 138–139 |
| Contextualização | 0,5 | Objetivo 8.1, cinco eixos, horizontes 2027/2031/2035 |
| Solução computacional | 1,5 | Tabela entrada/processamento/saída por fluxo |
| Arquitetura | 1,5 | Diagrama Mermaid renderizado + camadas e responsabilidades |
| Tecnologias | 1,0 | Oito componentes, cada um com o problema que resolve |
| Protótipo | 1,0 | APK instalado no celular + painel no subdomínio, no vídeo |
| Indicador | 0,5 | 0 % → 80 % em 10 min, com SQL que calcula |
| Pitch | 0,5 | Cinco perguntas em ≤ 5 min, cronometrado |

## Roteiro do pitch (5 minutos)

| Tempo | Pergunta obrigatória | Conteúdo | Tela |
|---|---|---|---|
| 0:00–0:50 | **1. Qual é o problema?** | Chove, o Cemaden alerta, a Compdec dispara… e ninguém sabe se chegou na dona Maria da encosta. Nupdecs operam no WhatsApp, sem cadastro, sem confirmação, sem retorno. | Foto de encosta + print de grupo de WhatsApp genérico |
| 0:50–1:30 | **2. Qual meta do PN-PDC?** | Meta 8.1.2, Objetivo 8.1, Diretriz 8; alvos 30/40/90 %; cinco eixos; indicador oficial. | Captura da p. 138–139 com a linha destacada |
| 1:30–2:20 | **3. Como a Computação contribui?** | O problema é de informação. Backend geoespacial + app + painel fecham o ciclo alerta → confirmação → retorno, e geram a evidência de núcleo ativo. | Diagrama de arquitetura |
| 2:20–4:00 | **4. Como a solução funciona?** | Demonstração ao vivo: coordenador dispara alerta no painel → push no celular → "Recebi" → painel sobe para 81 % → membro reporta trinca com foto → agente faz triagem. | Tela dividida: painel e celular |
| 4:00–4:40 | **5. Como será medido?** | Indicador: de 0 % para 80 % de confirmações em 10 min. SQL da view, gráfico do painel. Indicadores secundários em uma frase. | View no SQL editor + gráfico |
| 4:40–5:00 | Fechamento | Limitação principal (push não é garantido; SMS como evolução), APK distribuído pelo próprio agente, repositório aberto. | Página de download com QR |

Gravar com OBS: painel no navegador + espelhamento do celular (scrcpy). Narração gravada por
cima, sem improviso, texto lido de um teleprompter. Ensaiar duas vezes com cronômetro.

## Cronograma até a entrega

| Período | Entrega parcial |
|---|---|
| 29/09 – 01/10 | ADRs e specs (este commit); criar projeto Supabase; migrations + seed |
| 02/10 – 06/10 | App: auth, alertas, confirmação, ocorrência com foto/GPS, offline; primeiro APK |
| 07/10 – 10/10 | Painel: login, mapa, novo alerta, acompanhamento Realtime, ocorrências; página de download; deploy Hostinger |
| 11/10 – 12/10 | Edge Functions (disparar-alerta, recibos); teste ponta a ponta com push real |
| 13/10 – 14/10 | Documento dos 17 itens em PDF; capturas de tela |
| 15/10 – 16/10 | Gravar e editar o pitch |
| 17/10 | Revisão final, zip, envio (um dia antes do prazo) |
| 18/10 | Folga para imprevistos |
