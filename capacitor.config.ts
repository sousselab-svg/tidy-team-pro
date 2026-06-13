import type { CapacitorConfig } from '@capacitor/cli';

// Set CAP_ENV=dev (ou qualquer valor diferente de "production") para habilitar o
// hot-reload apontando para o preview do Lovable. Para builds que vão para a
// App Store / Play Store, rode:  CAP_ENV=production bunx cap sync
const isProduction = process.env.CAP_ENV === 'production' || process.env.NODE_ENV === 'production';

const config: CapacitorConfig = {
  appId: 'app.lovable.6a6af60f372a40a6a7dc46010b75f6d4',
  appName: 'Field Service',
  webDir: 'dist/client',
  // Em produção NÃO definimos `server.url` — o app carrega o bundle estático
  // empacotado dentro do binário, como exige a Apple (apps que são apenas
  // "wrapper" de um site são rejeitados na review).
  ...(isProduction
    ? {}
    : {
        server: {
          url: 'https://id-preview--6a6af60f-372a-40a6-a7dc-46010b75f6d4.lovable.app?forceHideBadge=true',
          cleartext: true,
        },
      }),
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  },
  plugins: {
    SplashScreen: {
      // Native splash stays visible until the in-app video splash mounts
      // and calls SplashScreen.hide() — this masks the white/black flashes
      // between the native boot and the first React paint.
      launchAutoHide: false,
      launchShowDuration: 3000,
      launchFadeOutDuration: 250,
      backgroundColor: '#ffffff',
      showSpinner: false,
      androidScaleType: 'CENTER_CROP',
      splashFullScreen: true,
      splashImmersive: true,
    },
    StatusBar: {
      style: 'DARK',
      backgroundColor: '#ffffff',
    },
  },
};

export default config;