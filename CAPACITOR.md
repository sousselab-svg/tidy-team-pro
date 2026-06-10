# Capacitor — iOS & Android

Este projeto está configurado com **Capacitor** para gerar apps nativos iOS e Android a partir do código web existente, prontos para submissão na **App Store** e **Google Play**.

## Pré-requisitos

- **macOS + Xcode 15+** (obrigatório para iOS)
- **Android Studio** (obrigatório para Android)
- **Node 20+** e **Bun** (ou npm)
- Conta paga **Apple Developer** ($99/ano) para publicar na App Store
- Conta **Google Play Console** ($25 único) para publicar na Play Store

## Fluxo rápido (modo desenvolvimento com hot-reload)

O `capacitor.config.ts` já vem com `server.url` apontando para o preview do Lovable. Isso permite rodar o app no celular vendo as mudanças em tempo real.

```bash
# 1. Exportar o projeto Lovable → GitHub e clonar localmente
git clone <seu-repo>
cd <seu-repo>

# 2. Instalar dependências
bun install

# 3. Adicionar as plataformas nativas (faça isso UMA vez por máquina)
bunx cap add ios
bunx cap add android

# 4. Sempre que mudar dependências nativas / config:
bunx cap sync

# 5. Rodar no dispositivo / emulador
bunx cap run ios
bunx cap run android
```

> Toda vez que você puxar novas mudanças do repositório, rode `git pull` e depois `bunx cap sync`.

## Build de produção (para submeter às lojas)

Esse projeto usa **TanStack Start (SSR)**. Para empacotar o app web dentro do binário nativo (sem depender da URL de preview), você precisa de um build estático. Recomendamos uma das duas abordagens:

### Opção A — Manter `server.url` apontando para o domínio publicado (mais simples)

1. Publique o app no Lovable e configure um domínio próprio (ex.: `app.suamarca.com`).
2. Em `capacitor.config.ts`, troque `server.url` para o seu domínio de produção.
3. Faça `bunx cap sync` e gere os binários.

✅ Vantagem: atualizações de UI vão pro ar instantaneamente sem nova submissão.
⚠️ Atenção: a Apple pode rejeitar apps que sejam apenas "wrapper" de um site. Garanta uso de recursos nativos (push, câmera, biometria, etc.).

### Opção B — Empacotar build estático dentro do binário

Requer adaptar o build para SPA estática (sem SSR). Posso ajudar a configurar quando você decidir seguir por esse caminho.

## Abrindo nas IDEs nativas

```bash
bunx cap open ios       # abre o projeto no Xcode
bunx cap open android   # abre o projeto no Android Studio
```

No Xcode/Android Studio você configura: ícone do app, splash screen, bundle ID definitivo, certificados de assinatura e gera o `.ipa` / `.aab` para submissão.

## Recursos nativos já instalados

- `@capacitor/app` — eventos de ciclo de vida do app
- `@capacitor/haptics` — vibração / feedback tátil
- `@capacitor/keyboard` — controle do teclado virtual
- `@capacitor/status-bar` — cor / estilo da status bar
- `@capacitor/splash-screen` — tela de carregamento inicial

Para adicionar mais (câmera, geolocalização, push, biometria, etc.), consulte: https://capacitorjs.com/docs/plugins

## Checklist antes de submeter

- [ ] Ícone do app em todas as resoluções (1024×1024 base)
- [ ] Splash screen configurado
- [ ] Bundle ID definitivo (`app.suaempresa.fieldservice`)
- [ ] Versão e build number definidos
- [ ] Política de Privacidade publicada (URL pública)
- [ ] Termos de Uso publicados
- [ ] Screenshots em todos os tamanhos exigidos pela loja
- [ ] Descrição, palavras-chave e categoria preenchidas
- [ ] Conta de teste (caso o app exija login) para os revisores da Apple

---

Documentação oficial: https://capacitorjs.com/docs

## Permissões nativas (iOS Info.plist + Android Manifest)

Os plugins já estão instalados (`@capacitor/geolocation`, `@capacitor/camera`,
`@capacitor/push-notifications`, `@capacitor/local-notifications`). Quando você
rodar `bunx cap add ios` e `bunx cap add android`, as pastas nativas serão
geradas. Em seguida, cole os textos abaixo nos arquivos indicados.

### iOS — `ios/App/App/Info.plist`

Adicione dentro de `<dict>...</dict>`:

```xml
<!-- GPS — usado para auto-check-in via geofence -->
<key>NSLocationWhenInUseUsageDescription</key>
<string>O CleanOps usa sua localização para confirmar automaticamente o check-in quando você chega no endereço do cliente.</string>

<!-- GPS em segundo plano — necessário para rastreamento ao vivo da equipe -->
<key>NSLocationAlwaysAndWhenInUseUsageDescription</key>
<string>Para compartilhar sua posição com o supervisor durante o expediente, mesmo com o app em segundo plano.</string>

<!-- Câmera — fotos antes/depois -->
<key>NSCameraUsageDescription</key>
<string>O CleanOps usa a câmera para registrar fotos do serviço (antes/depois) e da assinatura do cliente.</string>

<!-- Galeria — anexar comprovantes -->
<key>NSPhotoLibraryUsageDescription</key>
<string>Para anexar fotos já existentes do serviço ou comprovantes de pagamento.</string>

<!-- Salvar fotos do serviço na galeria -->
<key>NSPhotoLibraryAddUsageDescription</key>
<string>Para salvar uma cópia das fotos do serviço no seu rolo de câmera quando você desejar.</string>

<!-- Microfone (caso vá gravar áudios na ordem de serviço — opcional) -->
<key>NSMicrophoneUsageDescription</key>
<string>Opcional: para gravar observações em áudio sobre o serviço.</string>

<!-- Notificações: iOS não exige string aqui; o pedido aparece via push API -->
```

### Android — `android/app/src/main/AndroidManifest.xml`

Adicione dentro de `<manifest>`, antes do `<application>`:

```xml
<uses-permission android:name="android.permission.INTERNET" />
<uses-permission android:name="android.permission.ACCESS_NETWORK_STATE" />
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
<!-- Android 10+: GPS em segundo plano -->
<uses-permission android:name="android.permission.ACCESS_BACKGROUND_LOCATION" />
<uses-permission android:name="android.permission.CAMERA" />
<uses-permission android:name="android.permission.READ_MEDIA_IMAGES" />
<!-- Compatibilidade Android 12 e anterior -->
<uses-permission android:name="android.permission.READ_EXTERNAL_STORAGE"
    android:maxSdkVersion="32" />
<!-- Android 13+: notificações push exigem permissão explícita -->
<uses-permission android:name="android.permission.POST_NOTIFICATIONS" />
<uses-permission android:name="android.permission.VIBRATE" />
```

Não esqueça de `<uses-feature android:name="android.hardware.camera" android:required="false" />`
e `<uses-feature android:name="android.hardware.location.gps" android:required="false" />`
para o app continuar instalável em tablets sem GPS/câmera.

---

## Build TestFlight (passo a passo no Mac)

Pré-requisitos: macOS, Xcode 15+, conta Apple Developer ativa.

```bash
# 1. Clonar o repositório do GitHub
git clone <seu-repo> cleanops && cd cleanops
bun install

# 2. Build estático SEM o server.url do Lovable preview
CAP_ENV=production bun run build
bunx cap add ios          # primeira vez por máquina
bunx cap sync

# 3. (Opcional, primeira vez) gerar ícones/splash
bunx @capacitor/assets generate \
  --iconBackgroundColor '#10b981' \
  --splashBackgroundColor '#10b981'

# 4. Colar no Info.plist os textos de permissão (seção acima)

# 5. Abrir no Xcode
bunx cap open ios
```

No **Xcode**:

1. Selecione o target **App** → aba **Signing & Capabilities**
   - Time: sua conta Apple Developer
   - Bundle Identifier: `com.cleanops.fieldservice` (defina o seu)
   - Capabilities: adicione *Push Notifications* e *Background Modes →
     Location updates / Remote notifications* (se for usar push em background).
2. Aba **General** → Version `1.0.0`, Build `1`.
3. Topo: selecione **Any iOS Device (arm64)** como destino.
4. Menu **Product → Archive** (leva 2-5 min).
5. Quando abrir o Organizer: **Distribute App → App Store Connect → Upload**.
6. Aguarde o e-mail "App processed" da Apple (10-30 min).
7. Em [appstoreconnect.apple.com](https://appstoreconnect.apple.com) →
   **TestFlight** → adicione o build a um grupo de testadores internos.

Pronto. Os testadores recebem convite e instalam pelo app **TestFlight**.

---

## Revisão da App Store / Play Store

### Conta demo para os revisores (já criada)

No App Store Connect → **App Information → App Review Information** cole:

```
Sign-in required: Yes
Username: apple-reviewer@cleanops.com
Password: CleanOps2026!Review

Notes:
The reviewer account is a pre-populated admin demo. Suggested flow:
1. Home dashboard → see today's revenue, jobs and team in field
2. Tap any "in progress" job → see checklist, photos, signature, geofence
3. Schedule (Agenda) → swipe through coming days to see scheduled jobs
4. Clients → 5 customers (residential + commercial); open Hotel Vista Verde
   to see recurring contract
5. Team → invite/resend operator email; live tracking map
6. NPS → 2 customer responses (scores 9 and 10) + average chart
7. Finance → paid / open / overdue invoices
```

No Google Play Console → **App content → App access** mesma credencial.

### Privacy Manifest (iOS 17+)

A partir do iOS 17 a Apple exige `PrivacyInfo.xcprivacy` declarando APIs
sensíveis usadas. Crie em `ios/App/App/PrivacyInfo.xcprivacy`:

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>NSPrivacyCollectedDataTypes</key>
  <array>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypeEmailAddress</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypePreciseLocation</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
    <dict>
      <key>NSPrivacyCollectedDataType</key><string>NSPrivacyCollectedDataTypePhotosorVideos</string>
      <key>NSPrivacyCollectedDataTypeLinked</key><true/>
      <key>NSPrivacyCollectedDataTypeTracking</key><false/>
      <key>NSPrivacyCollectedDataTypePurposes</key>
      <array><string>NSPrivacyCollectedDataTypePurposeAppFunctionality</string></array>
    </dict>
  </array>
  <key>NSPrivacyTracking</key><false/>
</dict>
</plist>
```

### Motivos comuns de rejeição e como evitar

| Motivo | Prevenção |
|---|---|
| **Guideline 4.2** (app é só um wrapper de site) | Buildar com `CAP_ENV=production` para empacotar bundle estático; usar plugins nativos (já temos GPS, câmera, push, hápticos). |
| **Guideline 5.1.1** (permissões sem justificativa) | Strings `NSXxxUsageDescription` em PT-BR claros (já fornecidos acima). |
| **Guideline 5.1.5** (uso de GPS em background) | Declarar *Background Modes → Location updates* no Xcode e justificar no review notes. |
| **Guideline 2.1** (revisor não consegue testar) | Conta demo pré-populada já criada (`apple-reviewer@cleanops.com`). |
| **Privacy Manifest ausente** | Arquivo `PrivacyInfo.xcprivacy` acima. |
| **Política de Privacidade inacessível** | URL pública: `https://<seu-domínio>/privacidade` — publique o app no Lovable antes de submeter. |

## Ícone e Splash Screen

Os assets-fonte já estão no projeto:

- `src/assets/app-icon.png` — ícone do app (1024×1024, vassoura + sparkle, gradiente verde)
- `src/assets/splash.png` — splash screen (1248×1920, logo CleanOps em fundo verde)

Para gerar todas as resoluções nativas (iOS + Android), use o `@capacitor/assets`:

```bash
bun add -d @capacitor/assets
mkdir -p assets
cp src/assets/app-icon.png assets/icon.png
cp src/assets/splash.png assets/splash.png
cp src/assets/splash.png assets/splash-dark.png
bunx @capacitor/assets generate --iconBackgroundColor '#10b981' --splashBackgroundColor '#10b981'
bunx cap sync
```

Isso gera automaticamente todos os ícones (iOS @1x/@2x/@3x, Android mdpi/hdpi/xhdpi/xxhdpi/xxxhdpi, adaptive icons) e splash screens nas pastas nativas. A cor de fundo verde (#10b981) já está configurada em `capacitor.config.ts` (plugin `SplashScreen`).