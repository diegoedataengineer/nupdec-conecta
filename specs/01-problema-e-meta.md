# 01 — Problema e meta

## Problema [3]

O enunciado pede quatro respostas.

**O que está acontecendo?**
Os Núcleos Comunitários de Proteção e Defesa Civil (Nupdecs) são a ponta da cadeia de alerta:
voluntários da própria comunidade que recebem a informação da Defesa Civil municipal e a
repassam porta a porta, organizam a evacuação e reportam o que veem na rua. Na prática, a
maioria dos núcleos funciona em grupos de WhatsApp, sem cadastro estruturado, sem saber quem
está ativo, sem registro de que o alerta chegou e sem canal padronizado para relatar uma
rachadura, um alagamento ou um bueiro entupido. A Compdec dispara o alerta e fica sem saber se
ele foi lido.

**Quem é afetado?**
- Moradores de áreas de risco nos municípios prioritários (o Cemaden monitora cerca de 1.100
  municípios; o PN-PDC fala em 1.942 sob maior risco). São predominantemente famílias de baixa
  renda em encostas e margens de rios.
- Os voluntários dos Nupdecs, que carregam a responsabilidade do repasse sem ferramenta.
- Os agentes e coordenadores das Compdecs, que não têm visibilidade do que acontece depois do
  disparo.

**Onde o problema ocorre?**
Nos municípios prioritários do Sinpdec, com maior concentração no Sudeste (Serra Fluminense,
Baixada Santista, Grande BH), no Sul (vale do Itajaí, região metropolitana de Porto Alegre) e no
Nordeste (Recife, Salvador). O protótipo usa um município-exemplo com dados fictícios.

**Por que uma solução computacional pode contribuir?**
Porque o problema é de **informação**, não de infraestrutura: o alerta existe, o voluntário
existe, o que falta é o canal com cadastro, entrega direcionada, confirmação e retorno. Um
backend com cadastro geoespacial e push, um app no celular do voluntário e um painel para a
Compdec fecham esse ciclo e, de quebra, geram o dado que o indicador oficial da meta precisa:
quantos municípios têm Nupdec apoiado e ativo.

## Público afetado [4]

| Público | Papel na solução | Volume estimado (município-exemplo) |
|---|---|---|
| Moradores de áreas de risco organizados em Nupdecs | Membro: recebe alerta, confirma, reporta | 5 núcleos × 20 membros = 100 |
| Agentes da Defesa Civil municipal | Agente: valida cadastros, faz triagem de ocorrências | 3 |
| Coordenação da Compdec | Coordenador: cadastra áreas de risco, dispara alertas, acompanha métricas | 1 |

## Meta do PN-PDC selecionada [5]

> **8.1.2** — Incentivar a criação e manutenção de Núcleos Comunitários de Proteção e Defesa
> Civil (Nupdecs) em parceria com os municípios.

Fonte: PN-PDC 2025–2035, Quadro 11 — Objetivos, metas e indicadores da Diretriz Participação da
Sociedade Civil, p. 138–139. Imagem da página em
[../docs/pnpdc-quadro-11-p138-139.png](../docs/pnpdc-quadro-11-p138-139.png).

## Objetivo relacionado [6]

**Objetivo 8.1** — Fomentar ação integrada entre instituições da sociedade civil organizada,
entidades privadas e entes federativos.

Diretriz 8 — Participação da sociedade civil na gestão de riscos e de desastres.

## Eixo de atuação [7]

A meta está marcada nos **cinco eixos**: prevenção (Pv), mitigação (Mt), preparação (Pp),
resposta (Rp) e recuperação (Rc). A solução atua com mais força em **preparação** (cadastro,
áreas de risco, membros validados) e **resposta** (alerta, confirmação, reporte de ocorrência).

## Prazo da meta [8]

| Horizonte (Decreto 12.652/2025) | Ano | Alvo |
|---|---|---|
| Curto prazo | 2027 | 30 % |
| Médio prazo | 2031 | 40 % |
| Longo prazo | 2035 | 90 % |

Linha de base: não informada ("-").

## Indicador da meta [9]

**Percentual de municípios prioritários com Nupdecs apoiados.** Fonte de dados e responsável:
Sedec. Ministério: MIDR.

Como a solução contribui para esse indicador: um município passa a ter Nupdec "apoiado" quando
o núcleo existe, está cadastrado e opera com apoio da Compdec. A solução oferece a ferramenta de
cadastro e operação, e o próprio banco de dados vira a evidência de que o núcleo está ativo
(membros aprovados, alertas confirmados, ocorrências reportadas). O indicador de resultado da
solução, separado deste, está em [07-indicadores.md](07-indicadores.md).
