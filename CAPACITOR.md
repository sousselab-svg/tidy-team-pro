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