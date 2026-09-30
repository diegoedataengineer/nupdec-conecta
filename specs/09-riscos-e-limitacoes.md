# 09 — Limitações e riscos [17]

## Limitações do protótipo

| Limitação | Por quê | Evolução prevista |
|---|---|---|
| Só Android, por APK sideload | Prazo e custo de conta de loja; público-alvo majoritariamente Android | Play Store trilha interna; iOS via TestFlight |
| Push não é garantido | Celular desligado, sem internet, otimização de bateria matando o app | SMS via provedor (canal pago) e cell broadcast oficial como complemento; o app já consulta alertas ao abrir |
| Login por e-mail + senha | OTP por SMS exige provedor pago | OTP por telefone (Supabase Auth + Twilio) |
| Ingestão do Cemaden não automatizada em produção | Não há webhook público; a interface oficial é o portal e o S2iD | Consulta periódica ao portal de alertas do Cemaden ou integração via IDAP; no protótipo, alerta manual e payload simulado |
| Município fictício no seed | Sem convênio com uma Compdec real no prazo | Piloto com um município prioritário |
| Sem IA no protótipo | Prioridade em fechar o ciclo alerta → confirmação | Classificação da foto da ocorrência por gravidade (visão computacional) para priorizar triagem |

## Riscos técnicos

| Risco | Impacto | Mitigação |
|---|---|---|
| Edge Function estourar o tempo limite com muitos membros | Alerta não chega a todos | Processar em lotes de 100 e re-enfileirar; medir tempo por lote no seed de 100 membros |
| Token push inválido acumulado | Push "enviado" sem chegar | Função `recibos-push` remove tokens com `DeviceNotRegistered`; painel mostra cobertura de dispositivo |
| RLS mal configurada | Vazamento entre municípios | Cada migration que cria tabela habilita RLS na mesma transação; testes SQL por papel antes do deploy |
| Conflito de sincronização offline | Perda de confirmação ou ocorrência duplicada | UUID gerado no cliente (idempotência); `confirmado_em` vem do aparelho |
| Dependência do EAS para o build | Sem build, sem APK | Fazer o primeiro build já na semana 1; fallback com `expo run:android` local e `gradlew assembleRelease` |
| Relógio do aparelho errado | `confirmado_em` inválido | Registrar também `sincronizado_em`; descartar diferenças negativas ou > 24 h nas views |

## Riscos éticos e de LGPD (Unidade 4)

| Tema | Como a solução trata |
|---|---|
| **Minimização** | Só nome, e-mail, telefone opcional, núcleo. Sem CPF, sem endereço exato do morador |
| **Finalidade** | Dados usados apenas para alerta, confirmação e reporte de Defesa Civil; texto explícito no cadastro |
| **Localização** | GPS lido **só no momento do reporte**, com consentimento na hora; nenhum rastreamento contínuo |
| **Fotos** | Bucket privado, URL assinada de 1 h; orientação para não fotografar pessoas |
| **Exclusão** | Membro pode se desligar; dados pessoais anonimizados, mantendo agregados estatísticos |
| **Viés e exclusão digital** | Quem não tem celular ou dados não some do sistema: entra como `sem_dispositivo` e o líder do núcleo é orientado a fazer o repasse presencial. A taxa de cobertura de dispositivo é exibida justamente para não esconder essa lacuna |
| **Accountability** | Todo alerta tem `criado_por`; toda triagem tem `triado_por`; trilha de auditoria por design |
| **Responsabilidade** | O app não decide evacuar ninguém; a decisão é da Compdec e da própria pessoa. A solução transporta informação e registra confirmação |

## Riscos de projeto

| Risco | Mitigação |
|---|---|
| Escopo crescer (chat, mapa 3D, IA) | Lista "fora do escopo" fixada em [02-solucao.md](02-solucao.md); nada entra sem ADR |
| Pitch passar de 5 min | Roteiro cronometrado em [08](08-entrega-e-pitch.md); dois ensaios |
| Perder o prazo por bug no build | Cronograma com um dia de folga; entrega em 17/10 |
