# 02 — Solução proposta

## Em uma frase [10]

**Nupdec Conecta** é um app Android para os membros dos Núcleos Comunitários de Proteção e
Defesa Civil e um painel web para a Compdec, sobre um backend único, que faz o cadastro do
núcleo, entrega alertas direcionados por área de risco com confirmação de recebimento e recebe
reportes de ocorrência com foto e localização.

## Perfis

| Perfil | Onde usa | O que faz |
|---|---|---|
| **Membro** do Nupdec | App | Cria conta, entra num núcleo, recebe alerta, confirma recebimento, reporta ocorrência, vê membros do núcleo |
| **Agente** da Defesa Civil | App e painel | Aprova/rejeita membros, faz triagem de ocorrências, vê alertas do município |
| **Coordenador** da Compdec | Painel | Cadastra núcleos e áreas de risco, dispara alerta manual, acompanha confirmações e métricas |

## Funcionalidades (escopo do protótipo)

Obrigatórias para a entrega:

1. **Cadastro de núcleo** com nome, bairro/comunidade, polígono da área de atuação e
   responsável.
2. **Cadastro de membro** (auto-cadastro no app + aprovação pelo agente).
3. **Cadastro de área de risco** (polígono, tipo: deslizamento, inundação, enxurrada; nível).
4. **Alerta** criado manualmente pelo coordenador ou ingerido de fonte externa, com área,
   severidade, mensagem e validade.
5. **Entrega direcionada** aos membros dos núcleos que intersectam a área do alerta, via push.
6. **Confirmação de recebimento** com um toque ("Recebi e estou ciente").
7. **Reporte de ocorrência** com foto, GPS, tipo e descrição; triagem pelo agente.
8. **Painel em tempo real** com taxa de confirmação por alerta e mapa de ocorrências.

Fora do escopo do protótipo (registradas como evolução em [09-riscos-e-limitacoes.md](09-riscos-e-limitacoes.md)):
SMS, OTP por telefone, integração automática com o Cemaden em produção, chat entre membros,
classificação de fotos por IA, iOS.

## Entrada, processamento e saída [11]

| | Entrada | Processamento | Saída |
|---|---|---|---|
| **Cadastro** | Dados do núcleo, polígono desenhado no mapa, dados do membro, token push do aparelho | Validação, vínculo membro↔núcleo↔município, aprovação pelo agente, políticas de acesso (RLS) | Núcleo ativo com membros aprovados e dispositivos aptos a receber push |
| **Alerta** | Alerta manual (painel) ou externo (Cemaden/INMET) com área e severidade | `ST_Intersects(area_alerta, area_nucleo)` seleciona os núcleos; gera uma entrega por membro aprovado; envia push em lotes; registra ticket | Notificação no celular de cada membro afetado; registro `alerta_entregas` por membro |
| **Confirmação** | Toque do membro em "Recebi" (online ou offline) | Grava `confirmado_em` (hora do clique) e `sincronizado_em` (hora que chegou ao servidor); recalcula taxa por alerta | Painel mostra % confirmado e tempo mediano; lista de quem não confirmou para contato direto |
| **Ocorrência** | Foto, coordenadas GPS, tipo, descrição | Upload da foto ao Storage; ponto geográfico; associação ao núcleo e à área de risco mais próxima; fila de triagem | Ocorrência no mapa do painel com status (nova, em análise, atendida, descartada) |
| **Métricas** | Tabelas de entregas, confirmações e ocorrências | Views SQL agregadas por alerta, núcleo e período | Indicador de resultado (taxa de confirmação em 10 min) e evidência de núcleo ativo para o indicador oficial |

## Fluxo principal (dia de chuva forte)

```
1. Cemaden emite alerta de risco alto de deslizamento para o município (ou a Compdec dispara manual)
2. Backend cruza a área do alerta com os polígonos dos núcleos → 3 núcleos, 58 membros
3. Push chega nos 58 celulares em segundos; app abre a tela do alerta
4. 47 membros tocam "Recebi" nos primeiros 10 minutos → painel mostra 81 %
5. Coordenador vê os 11 que não confirmaram e liga para os líderes desses núcleos
6. Membro fotografa uma trinca no muro de arrimo e envia com GPS
7. Agente faz triagem: "em análise" → equipe vai ao local → "atendida"
8. Ao fim do evento, o histórico vira relatório do núcleo (evidência de Nupdec ativo)
```

## O que a solução NÃO é

- Não substitui o alerta oficial (Defesa Civil Alerta por cell broadcast / SMS 40199). Ela
  complementa: garante que o alerta chegue à rede organizada da comunidade e volte com
  confirmação.
- Não é um sistema de monitoramento (sensores, pluviômetros). Ela consome alertas de quem
  monitora.
