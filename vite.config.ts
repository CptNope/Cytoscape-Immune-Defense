import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import {defineConfig, loadEnv} from 'vite';
import {VitePWA} from 'vite-plugin-pwa';

export default defineConfig(({mode}) => {
  const env = loadEnv(mode, '.', '');
  return {
    base: '/Cytoscape-Immune-Defense/',
    plugins: [
      react(),
      tailwindcss(),
      VitePWA({
        registerType: 'prompt',
        includeAssets: [
          'favicon.ico',
          'apple-touch-icon.png',
          'icon.svg',
          'icons/*.png',
        ],
        manifest: {
          name: 'Cytoscape: Immune Defense',
          short_name: 'Cytoscape',
          description: 'A cellular biology themed Asteroids game where you control a T-cell defending against invading pathogens.',
          theme_color: '#0a0505',
          background_color: '#0a0505',
          display: 'standalone',
          orientation: 'any',
          scope: '/Cytoscape-Immune-Defense/',
          start_url: '/Cytoscape-Immune-Defense/',
          categories: ['games', 'entertainment'],
          icons: [
            { src: 'icons/icon-48x48.png', sizes: '48x48', type: 'image/png' },
            { src: 'icons/icon-72x72.png', sizes: '72x72', type: 'image/png' },
            { src: 'icons/icon-96x96.png', sizes: '96x96', type: 'image/png' },
            { src: 'icons/icon-128x128.png', sizes: '128x128', type: 'image/png' },
            { src: 'icons/icon-144x144.png', sizes: '144x144', type: 'image/png' },
            { src: 'icons/icon-152x152.png', sizes: '152x152', type: 'image/png' },
            { src: 'icons/icon-192x192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-384x384.png', sizes: '384x384', type: 'image/png' },
            { src: 'icons/icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
            { src: 'icons/icon-192x192-maskable.png', sizes: '192x192', type: 'image/png', purpose: 'maskable' },
            { src: 'icons/icon-512x512-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
          ],
        },
        workbox: {
          globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}'],
          runtimeCaching: [
            {
              urlPattern: /^https:\/\/fonts\.googleapis\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'google-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
            {
              urlPattern: /^https:\/\/fonts\.gstatic\.com\/.*/i,
              handler: 'CacheFirst',
              options: {
                cacheName: 'gstatic-fonts-cache',
                expiration: { maxEntries: 10, maxAgeSeconds: 60 * 60 * 24 * 365 },
                cacheableResponse: { statuses: [0, 200] },
              },
            },
          ],
        },
      }),
    ],
    define: {
      'process.env.GEMINI_API_KEY': JSON.stringify(env.GEMINI_API_KEY),
      '__APP_VERSION__': JSON.stringify(process.env.npm_package_version || '1.0.0'),
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, '.'),
      },
    },
    server: {
      // HMR is disabled in AI Studio via DISABLE_HMR env var.
      // Do not modify—file watching is disabled to prevent flickering during agent edits.
      hmr: process.env.DISABLE_HMR !== 'true',
    },
  };
});
