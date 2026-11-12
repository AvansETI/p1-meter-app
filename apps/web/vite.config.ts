import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';
import pkg from './package.json' with { type: 'json' };

const apiProxy = { '/api': 'http://127.0.0.1:3000' };

export default defineConfig({
  define: {
    __APP_VERSION__: JSON.stringify(pkg.version),
  },
  plugins: [
    react(),
    VitePWA({
      registerType: 'prompt',
      injectRegister: false,
      manifest: {
        name: 'MNEXT Energiemeter',
        short_name: 'Energiemeter',
        description: 'Live en historisch energieverbruik van je huishouden',
        lang: 'nl',
        display: 'standalone',
        start_url: '/',
        scope: '/',
        background_color: '#EFF3F2',
        theme_color: '#293D66',
        icons: [
          { src: '/brand/pwa-64x64.png', sizes: '64x64', type: 'image/png' },
          { src: '/brand/pwa-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/brand/pwa-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          {
            src: '/brand/maskable-icon-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallback: 'index.html',
        // Files such as /third-party-licenses.txt are not app routes (#59).
        navigateFallbackDenylist: [/^\/api\//, /^[^?]*\.\w+(?:\?.*)?$/],
      },
      devOptions: { enabled: false },
    }),
  ],
  server: {
    host: '0.0.0.0',
    port: 5173,
    proxy: apiProxy,
  },
  preview: {
    // LAN access for testing on phones (docs/design/2026-11-09-install-hints.md §7).
    host: '0.0.0.0',
    port: 4173,
    proxy: apiProxy,
  },
});
