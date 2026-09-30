# ADR-0007: Entrega de alertas por regra geoespacial + Expo Push

- **Status:** Proposta
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

Um alerta (do Cemaden, do INMET ou disparado manualmente pela Compdec) tem uma área de
abrangência. Precisamos decidir **quem recebe** e **como recebe**, e registrar a confirmação de
recebimento para o indicador de resultado. O app é APK sideload (ADR-0004), então a solução de
push precisa funcionar fora da Play Store.

## Opções consideradas

Quem recebe:

1. **Todos os membros do município.** Simples, mas gera alerta irrelevante e fadiga.
2. **Membros dos núcleos cujo polígono intersecta a área do alerta** (PostGIS `ST_Intersects`).
   Preciso, e usa o cadastro de área de risco que já existe.

Como recebe:

1. **FCM direto.** Exige gerenciar credenciais do Firebase no backend.
2. **Expo Push Service** (usa FCM por baixo). Um token por dispositivo, uma chamada HTTP
   simples pela Edge Function, recibos de entrega disponíveis; já usado no NeuroAgora.
3. **SMS** como canal complementar. Chega sem internet, mas é pago; fica como evolução.

## Decisão

**Regra geoespacial no Postgres + Expo Push**, orquestrados por uma Edge Function
`disparar-alerta`:

```
alerta inserido (painel ou ingestão)
   └─ trigger → fila (tabela alerta_disparos, status = pendente)
        └─ Edge Function disparar-alerta
             ├─ SELECT membros m JOIN nucleos n JOIN dispositivos d
             │   WHERE ST_Intersects(n.area, alerta.area) AND m.status = 'aprovado'
             ├─ INSERT alerta_entregas (alerta_id, membro_id, enviado_em)
             ├─ POST https://exp.host/--/api/v2/push/send  (lotes de 100)
             └─ UPDATE alerta_entregas SET push_ticket = …
app recebe push
   └─ abre alerta/[id] → botão "Recebi e estou ciente"
        └─ UPDATE alerta_entregas SET confirmado_em = now()
```

Alerta manual: o coordenador desenha ou escolhe o polígono no painel. Alerta externo: a Edge
Function `ingerir-alerta` recebe o payload (Cemaden/INMET via webhook ou consulta periódica) e
cria o registro com a geometria do município ou da área informada.

Se o membro não tem dispositivo com token, a entrega fica registrada como `sem_dispositivo`, o
que já é um dado útil para a Compdec.

## Consequências

- **Positivas:** entrega direcionada; confirmação gravada por membro, que é a base do indicador
  "80 % confirmam em 10 min"; Expo Push funciona em APK sideload com `google-services.json` no
  build.
- **Negativas / riscos:** push não é garantido (celular desligado, sem internet) — o app
  também consulta alertas ativos ao abrir e mostra um banner; sem SMS no protótipo.
- **A validar antes de aceitar:** limite de execução da Edge Function com muitos membros
  (mitigação: processar em lotes e re-enfileirar); recibos do Expo Push para marcar
  `entregue_em`.

## Referências

- Expo Push notifications: <https://docs.expo.dev/push-notifications/sending-notifications/>
- PostGIS `ST_Intersects`: <https://postgis.net/docs/ST_Intersects.html>
- [specs/04-modelo-de-dados.md](../../specs/04-modelo-de-dados.md), [specs/07-indicadores.md](../../specs/07-indicadores.md)
