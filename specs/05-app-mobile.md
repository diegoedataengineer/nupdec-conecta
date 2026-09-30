# 05 — App Android (Expo)

Stack e estrutura conforme [ADR-0003](../docs/adr/0003-app-mobile-expo-stack-neuroagora.md).
Código em `mobile/`.

## Rotas (expo-router)

```
app/
├── _layout.tsx                 # providers: QueryClient persistido, Auth, tema, notificações
├── (auth)/
│   ├── entrar.tsx              # e-mail + senha
│   ├── cadastrar.tsx           # nome, e-mail, senha, telefone, município, núcleo
│   └── aguardando.tsx          # "seu cadastro está em análise pela Defesa Civil"
├── (tabs)/
│   ├── _layout.tsx             # abas: Alertas · Ocorrências · Núcleo · Perfil
│   ├── index.tsx               # Alertas: vigentes em destaque, histórico abaixo
│   ├── ocorrencias.tsx         # lista das ocorrências do núcleo, com status
│   ├── nucleo.tsx              # membros, líder, área no mapa; agente vê pendências
│   └── perfil.tsx              # dados, versão do APK, sair
├── alerta/[id].tsx             # detalhe + botão "Recebi e estou ciente"
├── ocorrencia/nova.tsx         # foto, GPS, tipo, descrição
├── ocorrencia/[id].tsx         # detalhe; agente muda status
└── membro/[id].tsx             # agente: aprovar / rejeitar
```

## Telas do protótipo (mock para a entrega)

| Tela | Elementos | Estado offline |
|---|---|---|
| **Alertas** | Cartão grande do alerta vigente (severidade em cor, título, hora, "toque para confirmar"); lista do histórico; selo "última sincronização há N min" | Mostra cache; banner "sem conexão" |
| **Detalhe do alerta** | Mensagem completa, mapa com a área e o polígono do meu núcleo, botão **Recebi e estou ciente** (vira "Confirmado às 14:32"), botão "Reportar ocorrência" | Confirmação enfileirada; botão muda na hora |
| **Nova ocorrência** | Câmera/galeria, GPS automático com precisão, tipo (chips), descrição, enviar | Salva local; sobe ao reconectar |
| **Ocorrências** | Lista com foto, tipo, status colorido, hora | Cache + itens pendentes com relógio |
| **Núcleo** | Nome, comunidade, mapa da área, líder, lista de membros; agente vê "3 pendentes" | Cache |
| **Perfil** | Nome, papel, município, núcleo, versão do APK, sair | — |
| **Cadastro** | Formulário; após enviar, tela "aguardando aprovação" com contato da Compdec | — |

## Fluxos

### Primeiro uso
1. Instala o APK pela página de download (ou pelo WhatsApp do agente).
2. Cadastra-se, escolhe município e núcleo.
3. App registra o token push em `dispositivos` assim que a permissão é concedida.
4. Fica em "aguardando" até o agente aprovar; push "Seu cadastro foi aprovado" leva às abas.

### Receber e confirmar alerta
1. Push chega → toque abre `alerta/[id]`.
2. Botão "Recebi e estou ciente" grava `confirmado_em = agora (aparelho)` via mutação
   offline-first.
3. Ao sincronizar, o servidor grava `sincronizado_em`.
4. Se o app for aberto sem push (push perdido), a aba Alertas consulta os alertas vigentes e
   mostra o cartão do mesmo jeito.

### Reportar ocorrência
1. Da aba Ocorrências ou do detalhe do alerta.
2. `id` UUID gerado no cliente; foto comprimida (≤ 1600 px, JPEG 80 %).
3. Envio: upload ao Storage → insert em `ocorrencias`. Offline: os dois passos ficam na fila.

### Agente no app
- Aba Núcleo mostra pendências; `membro/[id]` aprova ou rejeita.
- `ocorrencia/[id]` muda o status (nova → em análise → atendida / descartada).

## Notificações

- `expo-notifications`: canal Android "alertas" com importância máxima, som e vibração;
  canal "geral" para aprovação de cadastro e triagem.
- Token renovado a cada abertura do app (`getExpoPushTokenAsync`) e enviado se mudou.
- Toque na notificação navega por deep link `nupdec://alerta/{id}`.

## Configuração

`src/config.ts` lê `EXPO_PUBLIC_SUPABASE_URL` e `EXPO_PUBLIC_SUPABASE_ANON_KEY`; sem elas,
aponta para valores de desenvolvimento local (`supabase start`).

`app.json` (trechos relevantes):

```json
{
  "expo": {
    "name": "Nupdec Conecta",
    "slug": "nupdec-conecta",
    "scheme": "nupdec",
    "newArchEnabled": true,
    "android": {
      "package": "br.com.nupdecconecta.app",
      "permissions": [
        "android.permission.CAMERA",
        "android.permission.ACCESS_FINE_LOCATION",
        "android.permission.POST_NOTIFICATIONS"
      ],
      "googleServicesFile": "./google-services.json"
    },
    "plugins": ["expo-router", "expo-font", "expo-notifications", "expo-camera", "expo-location"]
  }
}
```

`google-services.json` é gerado no Firebase (projeto só para FCM) e fica **fora do git**
(`.gitignore`), enviado ao EAS como *secret file*.

## Verificações antes de gerar o APK

```bash
cd mobile
npx tsc --noEmit
npx eslint app src
npx expo-doctor
eas build --profile apk --platform android
```
