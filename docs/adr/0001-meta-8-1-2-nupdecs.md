# ADR-0001: Meta 8.1.2 (Nupdecs) como escopo do projeto

- **Status:** Aceita
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

A sistematização da disciplina exige escolher **uma meta específica** do PN-PDC 2025–2035 e
seguir a sequência problema → meta → solução → arquitetura → protótipo → pitch. A meta vale 1,5
dos 10 pontos e a contextualização (objetivo, eixo, prazo) mais 0,5.

Restrições que pesaram na escolha:

- O enunciado direciona a turma para o Objetivo 2.2 (monitoramento e alerta de chuva, rio,
  encosta). Queríamos uma meta menos disputada, para que a proposta se diferencie.
- Queríamos uma meta em que **cadastro e alerta** fossem o núcleo, para justificar um app mobile
  e um painel sobre o mesmo backend.
- Metas com alvo "X" (binário: feito ou não feito) enfraquecem o item "indicador" da avaliação.
  Preferimos meta com linha de base e faixa numérica.
- Prazo de 19 dias até a entrega: o problema precisa ser fácil de explicar em um pitch de 5
  minutos.

## Opções consideradas

1. **2.2.4** — monitoramento e alertas antecipados de riscos geológicos e hidrológicos
   (Cemaden). Numérica (1133 → 2500 municípios), mas é a meta mais óbvia da turma.
2. **1.1.7** — expandir o banco de dados sobre população e moradias em áreas de risco com o
   Censo (IBGE/Cemaden). Excelente para engenharia de dados, mas sem app nem alerta.
3. **3.1.3 + 3.1.4** — cadastro nacional de voluntários institucionais e protocolo de
   acionamento (Sedec). Encaixa app + alerta, mas o alvo é binário (X).
4. **8.2.2** — mapear cozinhas comunitárias nos 1.942 municípios sob maior risco (Sesan/MDS).
   Numérica e original, mas o alerta é secundário.
5. **8.1.2** — incentivar a criação e manutenção de Nupdecs em parceria com os municípios
   (Sedec/MIDR). Numérica (30 % → 90 %), cadastro + alerta no núcleo da meta, cinco eixos.

## Decisão

**Meta 8.1.2.** Dados oficiais, conferidos no Quadro 11 do PN-PDC (páginas 138–139, imagem em
[docs/pnpdc-quadro-11-p138-139.png](../pnpdc-quadro-11-p138-139.png)):

| Campo | Valor |
|---|---|
| ID | 8.1.2 |
| Descrição oficial | Incentivar a criação e manutenção de Núcleos Comunitários de Proteção e Defesa Civil (Nupdecs) em parceria com os municípios. |
| Diretriz | 8 — Participação da sociedade civil na gestão de riscos e de desastres |
| Objetivo | 8.1 — Fomentar ação integrada entre instituições da sociedade civil organizada, entidades privadas e entes federativos |
| Linha de base | — |
| Alvos | 30 % (2027) · 40 % (2031) · 90 % (2035) |
| Indicador | Percentual de municípios prioritários sem Nupdecs apoiados |
| Fonte de dados / responsável / ministério | Sedec / Sedec / MIDR |
| Eixos de atuação | Pv, Mt, Pp, Rp, Rc (os cinco) |
| Horizonte (Decreto 12.652/2025) | curto prazo até 2027, médio até 2031, longo até 2035 |

O Nupdec é o grupo de voluntários da própria comunidade organizado pela Defesa Civil municipal.
O plano o cita repetidamente como elo entre poder público e população, mas na prática os núcleos
operam por WhatsApp, sem cadastro estruturado nem confirmação de que o alerta chegou.

## Consequências

- **Positivas:** meta com indicador numérico; problema humano fácil de contar; cobre os cinco
  eixos, o que dá margem para a contextualização; pouca concorrência na turma.
- **Negativas / riscos:** o indicador oficial mede "municípios apoiados", não a eficácia do
  núcleo. A solução precisa definir um **indicador de resultado próprio** (ver
  [specs/07-indicadores.md](../../specs/07-indicadores.md)) e explicar como contribui para a meta
  sem prometer medir o indicador oficial.
- **Obrigatório:** todo documento de entrega cita a meta com o código, a descrição oficial
  literal, o objetivo, o eixo e o prazo exatamente como na tabela acima.

## Referências

- PN-PDC 2025–2035, Quadro 11, p. 138–139.
- Enunciado da sistematização (H3-AC), seções 4 e 12.
