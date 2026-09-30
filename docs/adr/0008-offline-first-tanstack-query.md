# ADR-0008: Offline-first com TanStack Query persistido

- **Status:** Proposta
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

Durante um evento (chuva forte, deslizamento) a rede móvel degrada ou cai. O membro do Nupdec
precisa **ler o último alerta** e **registrar uma ocorrência** mesmo sem sinal, com sincronização
quando a conexão voltar. A Unidade 2 da disciplina trata exatamente disso: sistemas distribuídos
convivem com latência, partição e consistência eventual.

## Opções consideradas

1. **Sem offline.** Mais simples; falha justamente quando mais importa.
2. **Banco local completo** (WatermelonDB / SQLite + sync próprio). Robusto, mas é um projeto em
   si.
3. **TanStack Query com cache persistido em AsyncStorage + fila de mutações**, padrão já
   usado no NeuroAgora.

## Decisão

**TanStack Query persistido**, no mesmo desenho do NeuroAgora:

- `PersistQueryClientProvider` com `createAsyncStoragePersister`; `gcTime` de 7 dias para
  alertas e dados do núcleo.
- `onlineManager` alimentado por `@react-native-community/netinfo`.
- Mutações de **ocorrência** e **confirmação de alerta** com `networkMode: 'offlineFirst'`; a
  foto fica no cache local (`expo-file-system`) até o upload ao Storage concluir.
- Ao reconectar, `resumePausedMutations()` reenvia na ordem; o servidor usa `id` gerado no
  cliente (UUID v4) para tornar a operação idempotente.
- Tela de alerta mostra a hora da última sincronização e um selo "offline" quando aplicável.

## Consequências

- **Positivas:** o app continua útil sem rede; confirmação de alerta feita offline conta para
  o indicador com o horário do clique (`confirmado_em` vem do cliente) e o horário de
  sincronização (`sincronizado_em` vem do servidor), o que permite medir os dois.
- **Negativas / riscos:** conflito se o mesmo membro editar o perfil em dois aparelhos
  (aceito: último grava); cache pode mostrar alerta já encerrado — o app marca alertas com
  `encerrado_em` no passado.
- **A validar antes de aceitar:** comportamento das mutações pausadas após o app ser encerrado
  pelo sistema (o persister restaura, mas precisa de teste em aparelho real).

## Referências

- TanStack Query, "Persist Query Client": <https://tanstack.com/query/latest/docs/framework/react/plugins/persistQueryClient>
- `neuroagora-system-mobile-app/frontend/src/state/DataContext.tsx` (referência de implementação)
