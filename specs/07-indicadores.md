# 07 — Indicadores

Dois indicadores distintos, e a entrega precisa deixar claro qual é qual.

## Indicador da meta (oficial) [9]

**Percentual de municípios prioritários com Nupdecs apoiados** — alvos 30 % (2027), 40 %
(2031), 90 % (2035). Medido pela Sedec. A solução não mede esse indicador; ela **produz a
evidência** que permite classificar um município como "com Nupdec apoiado": núcleo cadastrado,
membros aprovados, alertas entregues e confirmados, ocorrências reportadas. A view
`v_nucleo_atividade` ([04-modelo-de-dados.md](04-modelo-de-dados.md)) resume isso por núcleo.

## Indicador de resultado da solução [15]

> **Aumentar de 0 % para 80 % o percentual de membros de Nupdec que confirmam o recebimento do
> alerta em até 10 minutos após o envio.**

- **Linha de base: 0 %.** Hoje não existe confirmação; a Compdec dispara e não sabe se chegou.
  Qualquer número acima de zero já é informação nova.
- **Meta do protótipo: 80 % em 10 min**, medido por alerta e como média móvel dos últimos 30
  dias por município.
- **Por que 10 minutos:** é a janela em que o repasse porta a porta ainda muda o desfecho em
  um evento de chuva intensa; alinha com o exemplo do enunciado ("reduzir de 30 para 10
  minutos").

### Definição operacional

```
pct_confirmado_10min(alerta) =
    nº de entregas com confirmado_em ≤ enviado_em + 10 min
    ───────────────────────────────────────────────────────  × 100
    nº de entregas do alerta (inclui sem_dispositivo)
```

O denominador inclui quem não tem dispositivo de propósito: membro cadastrado sem app
instalado é um problema que a Compdec precisa ver, não esconder.

`confirmado_em` é a hora do toque no aparelho, não a hora em que a confirmação chegou ao
servidor (`sincronizado_em`). Assim, quem confirmou offline conta. A diferença entre os dois
é um segundo indicador de saúde da rede.

### SQL

```sql
-- por alerta
select titulo, inicio_em, destinatarios, confirmados_10min, pct_confirmado_10min, mediana_tempo
from v_alerta_confirmacao
where municipio_id = :municipio
order by inicio_em desc;

-- média móvel 30 dias do município
select round(avg(pct_confirmado_10min), 1) as pct_30d
from v_alerta_confirmacao
where municipio_id = :municipio
  and inicio_em > now() - interval '30 days';
```

## Indicadores secundários (mostrados no painel, não prometidos como meta)

| Indicador | Cálculo | Serve para |
|---|---|---|
| Tempo mediano até confirmação | `percentile_cont(0.5)` de `confirmado_em − enviado_em` | Ver se a rede está ficando mais rápida |
| Cobertura de dispositivo | membros aprovados com token válido / membros aprovados | Saber quem precisa de ajuda para instalar |
| Taxa de entrega do push | `entregue_em not null` / `enviado_em not null` | Distinguir "push não chegou" de "pessoa não viu" |
| Ocorrências triadas em 24 h | ocorrências com status ≠ `nova` em ≤ 24 h / total | Medir a resposta da Compdec, não só da comunidade |
| Núcleos ativos | núcleos com ≥ 1 confirmação ou ocorrência em 90 dias | Evidência para o indicador oficial |

## Como será demonstrado na entrega

1. Seed com dois alertas históricos: um com 62 % em 10 min, outro com 84 %.
2. No vídeo, um alerta disparado ao vivo do painel chega no celular, é confirmado, e o painel
   atualiza o percentual em tempo real.
3. Captura de tela da view `v_alerta_confirmacao` no SQL editor do Supabase, para mostrar que o
   número sai do banco, não do slide.
