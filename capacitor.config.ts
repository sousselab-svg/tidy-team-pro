import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.6a6af60f372a40a6a7dc46010b75f6d4',
  appName: 'Field Service',
  webDir: 'dist',
  // Hot-reload from the Lovable preview during development.
  // Remove the `server` block before generating a production build for the app stores.
  server: {
    url: 'https://id-preview--6a6af60f-372a-40a6-a7dc-46010b75f6d4.lovable.app?forceHideBadge=true',
    cleartext: true,
  },
  ios: {
    contentInset: 'always',
  },
  android: {
    allowMixedContent: true,
  },
};

export default config;