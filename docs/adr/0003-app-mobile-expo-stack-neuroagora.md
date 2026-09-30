# ADR-0003: App mobile com a stack Expo do NeuroAgora

- **Status:** Aceita
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

O app precisa rodar em Android, receber push, tirar foto, ler GPS e funcionar com internet
instável (cenário típico de desastre). O autor já mantém um app mobile em produção, o
NeuroAgora (`neuroagora-system-mobile-app`), com stack conhecida, estrutura de pastas definida
e padrões de cache offline resolvidos. Reaproveitar reduz o risco de prazo.

## Opções consideradas

1. **PWA** (React + Vite, instalável). Um só build para web e celular, mas push em Android via
   PWA é menos confiável, não há acesso pleno a GPS em segundo plano e o protótipo perde o
   "instalar o APK" que fortalece o pitch.
2. **Flutter.** Bom desempenho, mas stack nova para o autor, sem código de referência.
3. **Expo / React Native, mesma stack do NeuroAgora.** Código de referência pronto, build
   nos servidores do Expo (EAS), módulos nativos já validados.

## Decisão

**Expo, replicando a stack do NeuroAgora.** Versões fixadas em setembro/2026:

| Camada | Tecnologia |
|---|---|
| Base | Expo SDK 54, React Native 0.81 (nova arquitetura), React 19.1, TypeScript 5.9, expo-router 6 |
| Pacotes | yarn 1 via corepack, declarado em `packageManager` |
| Dados | TanStack Query 5 com cache persistido em AsyncStorage (`PersistQueryClientProvider`); NetInfo alimenta o `onlineManager` |
| Sessão | Supabase JS client com storage em `expo-secure-store` |
| Nativos | expo-notifications (push), expo-camera e expo-image-picker (foto do reporte), expo-location (GPS), expo-device |
| UI | tema próprio; fontes via `@expo-google-fonts` |

Estrutura de pastas idêntica à do NeuroAgora, em `mobile/`:

```
mobile/
├── app/                # rotas expo-router: (auth), (tabs), alerta/[id], ocorrencia/nova, nucleo…
├── src/
│   ├── api/            # supabase.ts (client), queries por domínio
│   ├── state/          # AuthContext, NucleoContext
│   ├── features/       # alertas, ocorrencias, nucleo, membros, perfil, notificacoes
│   ├── components/  theme/  hooks/  constants/  utils/
│   └── config.ts       # EXPO_PUBLIC_SUPABASE_URL, EXPO_PUBLIC_SUPABASE_ANON_KEY
├── app.json
└── eas.json
```

Diferenças deliberadas em relação ao NeuroAgora:

- autenticação com **Supabase Auth**, não Cognito (ADR-0006);
- **sem iOS**: nada de `bundleIdentifier`, entitlements, TestFlight;
- **sem envio a loja** (ADR-0004);
- sem biometria, áudio, impressão e WebView, que não têm uso aqui.

## Consequências

- **Positivas:** curva de aprendizado zero; padrões de offline e de estrutura já resolvidos;
  `npx tsc --noEmit`, `npx eslint app src` e `npx expo-doctor` como verificação padrão.
- **Negativas / riscos:** build depende dos servidores do Expo (EAS); a nova arquitetura do RN
  0.81 restringe bibliotecas compatíveis — usar apenas as já validadas no NeuroAgora.
- **Obrigatório:** manter as versões da tabela; toda dependência nova passa pelo
  `expo install` para respeitar o SDK.

## Referências

- `/home/diegonunes/neuro_agora_ecossistema/neuroagora-system-mobile-app/README.md`
- [specs/05-app-mobile.md](../../specs/05-app-mobile.md)
