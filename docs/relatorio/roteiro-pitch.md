# Roteiro do pitch — Nupdec Conecta (até 5 minutos)

Formato sugerido: gravação de tela com OBS, painel no navegador à esquerda e o simulador de celular à direita (ou `/demo` com 4 celulares), narração por cima. Texto pensado para ser lido em ritmo de apresentação: **~680 palavras ≈ 4 min 25 s**, com folga para as pausas de demonstração.

Antes de gravar:
- Abra duas janelas lado a lado: `https://nupdec-conecta.mundodosdadosbr.com/painel` (logado como `coordenador@valesereno.exemplo`) e `…/app` (logado como `lider.esperanca@valesereno.exemplo`), senha `Nupdec@2026`.
- Deixe pronta a aba `…/diretoria` (logada como `diretoria.sp@valesereno.exemplo`) e a página inicial (download).
- Confira que não há alerta vigente "velho" no painel (encerre se houver).

---

## 0:00 – 0:45 · 1. Qual é o problema?
**Tela:** página inicial do projeto (landing) e, em seguida, a Figura 1 do relatório ou um print de um grupo de WhatsApp genérico.

> Chove forte numa encosta. O Cemaden emite o alerta, a Defesa Civil municipal dispara o aviso… e ninguém sabe se ele chegou na dona Maria, que mora na última casa da viela.
>
> Entre a Defesa Civil e o morador existe um elo que o próprio Plano Nacional de Proteção e Defesa Civil reconhece: o **Nupdec**, o Núcleo Comunitário de Proteção e Defesa Civil — voluntários da própria comunidade que repassam o alerta porta a porta.
>
> Na prática, esses núcleos funcionam em grupos de WhatsApp: sem cadastro de quem está ativo, sem registro de que o alerta chegou a cada pessoa, sem canal para dizer "tem uma trinca no muro da casa 14". A Compdec dispara e fica no escuro. Não falta alerta — falta **informação organizada** na ponta.

## 0:45 – 1:25 · 2. Qual meta do PN-PDC está sendo trabalhada?
**Tela:** Quadro 11 do PN-PDC (Figura 1 do relatório), com a linha 8.1.2 em destaque.

> A meta escolhida é a **8.1.2** do PN-PDC 2025–2035: *"Incentivar a criação e manutenção de Núcleos Comunitários de Proteção e Defesa Civil em parceria com os municípios."*
>
> Ela está no Objetivo 8.1, da diretriz de participação da sociedade civil, marcada nos cinco eixos — prevenção, mitigação, preparação, resposta e recuperação — e tem alvo numérico: **30% dos municípios prioritários com Nupdec apoiado até 2027, 40% até 2031 e 90% até 2035**. O indicador oficial é medido pela Sedec.
>
> Escolhi uma meta de participação, e não de monitoramento, porque o gargalo aqui é de informação — onde a Computação resolve mais com menos.

## 1:25 – 2:10 · 3. Como a Computação contribui para atingir essa meta?
**Tela:** diagrama de arquitetura (Figura 4) e, depois, o diagrama de processos (Figuras 2–3).

> O **Nupdec Conecta** fecha o ciclo *alerta → confirmação → ocorrência* com um backend único e dois clientes.
>
> No backend, o Supabase: Postgres com PostGIS guarda os polígonos dos núcleos e das áreas de risco; ao criar um alerta, uma função cruza a área com os núcleos — `ST_Intersects` — e gera uma entrega por membro; o push sai em lotes; a confirmação volta com hora; uma view SQL calcula o indicador. Regras de acesso por linha garantem que cada perfil só vê o que é seu.
>
> Nos clientes: um painel web para a Compdec e para a diretoria, e o aplicativo do voluntário — hoje simulado na web, com o mesmo backend.
>
> E a governança acompanha a realidade do país: uma **diretoria** cria coordenações com área delimitada e designa os coordenadores; o coordenador cadastra núcleos e áreas de risco; o líder do núcleo pré-aprova quem entra; o coordenador dá a palavra final.

## 2:10 – 4:00 · 4. Como a solução funciona? (demonstração)
**Tela:** painel + celular lado a lado. Fale enquanto executa; não narre o que a tela já mostra.

> Vou mostrar em um minuto e meio.
>
> *(painel → Alertas → Novo alerta)* A coordenadora cria um alerta de deslizamento. Escolhe a área de risco "Encosta do Morro da Esperança" e, antes de disparar, o sistema já diz: **1 núcleo e 19 membros** serão atingidos. Disparo.
>
> *(celular)* Dois segundos depois, o celular da líder do núcleo vibra: a notificação chega. Ela toca, vê a mensagem, o mapa com a área do alerta sobre a foto de satélite da encosta, e confirma: **"Recebi e estou ciente"**.
>
> *(painel → acompanhamento)* No painel, a confirmação aparece na hora. Clico em "simular comunidade" para representar os outros membros — o painel sobe para **68%** em dez minutos e lista quem não confirmou, inclusive quem nem tem o aplicativo: esses a líder avisa de porta em porta.
>
> *(celular → Reportar ocorrência)* A líder vê uma trinca no muro de arrimo. Foto, GPS, tipo "trinca", enviar. *(painel → Ocorrências)* A ocorrência aparece no mapa da Compdec e, ao mesmo tempo, **no chat do núcleo**, para que todos saibam. A agente faz a triagem e o status volta para o núcleo.
>
> *(aba diretoria, rápido)* E a diretoria vê a rede inteira: coordenações no mapa, núcleos cobertos, confirmação média por coordenação.

## 4:00 – 4:40 · 5. Como será medido o resultado?
**Tela:** seção 8 do relatório (fórmula) e o cartão "Em 10 minutos" do painel; opcionalmente a view no SQL editor.

> O indicador de resultado é simples e sai do próprio banco: **percentual de membros que confirmam o recebimento do alerta em até dez minutos**. Linha de base, zero — hoje não existe confirmação. Meta, **80%**.
>
> Nos alertas do protótipo deu 61%, 84% e 68%. O denominador inclui quem não tem o aplicativo, de propósito: o que a Compdec precisa enxergar não pode ficar escondido. E o próprio banco vira a evidência do indicador oficial: núcleo cadastrado, membros aprovados, alertas confirmados — um "Nupdec apoiado e ativo".

## 4:40 – 5:00 · Fechamento
**Tela:** página inicial com o QR code e o link do repositório.

> Limitações: o push não é garantido, por isso o app também consulta os alertas ao abrir; o aplicativo Android nativo será compilado se o projeto for aprovado — por enquanto a demonstração roda na web. Tudo está publicado, com o código no repositório.
>
> Nupdec Conecta: para que o alerta chegue em quem conhece a rua — e a Defesa Civil saiba que chegou. Obrigado.

---

## Checklist de gravação
- [ ] Cronometrar duas leituras; cortar frases se passar de 4 min 50 s.
- [ ] Gravar o bloco 4 (demonstração) primeiro, sem narração, e narrar por cima na edição — evita travar na fala enquanto clica.
- [ ] Limpar o alerta de teste no final (botão "Encerrar alerta") antes de gravar a tela da diretoria.
- [ ] Exportar em 1080p, MP4 (H.264). Nome: `Nupdec-Conecta-Pitch.mp4`, dentro de `entrega/`.
