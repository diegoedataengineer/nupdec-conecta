# ADR-0004: Distribuição por APK Android (sideload), sem Play Store

- **Status:** Aceita
- **Data:** 2026-09-29
- **Decisores:** Diego Nunes de Morais

## Contexto e problema

O protótipo precisa ser instalado no celular para o vídeo do pitch e para demonstração. Publicar
na Play Store exige conta de desenvolvedor, revisão, política de privacidade hospedada, testes
fechados com 12+ testadores por 14 dias (regra para contas pessoais novas) — incompatível com o
prazo. O NeuroAgora usa EAS com envio automático às lojas, mas esse fluxo não serve aqui.

## Opções consideradas

1. **Play Store (trilha interna).** Fluxo do NeuroAgora; barreiras de conta e prazo.
2. **Expo Go / development build.** Rápido, mas o usuário precisa do Expo Go instalado e do
   servidor Metro rodando; não é um app instalado.
3. **APK por sideload.** `eas build` gera um APK assinado; o usuário baixa o arquivo, permite
   "fontes desconhecidas" e instala.

## Decisão

**APK por sideload.** No `eas.json`:

```json
{
  "cli": { "version": ">= 16.0.0", "appVersionSource": "remote" },
  "build": {
    "apk": {
      "distribution": "internal",
      "android": { "buildType": "apk" },
      "autoIncrement": true,
      "env": {
        "APP_ENV": "prototipo",
        "EXPO_PUBLIC_SUPABASE_URL": "<definido no projeto Expo>",
        "EXPO_PUBLIC_SUPABASE_ANON_KEY": "<definido no projeto Expo>"
      }
    }
  }
}
```

Sem seção `submit`, sem workflow de auto-submit. A keystore fica gerenciada pelo Expo, nunca no
repositório. O APK gerado é publicado na página de download do subdomínio (ADR-0005), junto com
um QR code e instruções de instalação.

Isso encaixa no cenário real: em município pequeno, o agente da Defesa Civil distribui o APK
pelo grupo de WhatsApp da comunidade, sem depender de loja, conta Google ou aprovação.

## Consequências

- **Positivas:** instalação em minutos; sem custo de conta de desenvolvedor; argumento de
  pitch ("distribuição pelo próprio agente").
- **Negativas / riscos:** sem atualização automática (o usuário reinstala); alerta de
  "fonte desconhecida" pode assustar usuários leigos — a página de download precisa de
  instruções com capturas de tela; push via FCM continua funcionando em APK sideload, desde que
  o `google-services.json` esteja configurado no build.
- **Obrigatório:** versão visível na tela de perfil do app, para saber qual APK está instalado.

## Referências

- Expo, "Build APKs for Android emulators and devices": <https://docs.expo.dev/build-reference/apk/>
- [ADR-0005](0005-painel-web-subdominio-hostinger.md)
