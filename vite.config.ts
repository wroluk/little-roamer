import { defineConfig } from 'vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  base: './',
  plugins: [
    VitePWA({
      registerType: 'prompt',
      includeAssets: ['favicon-32.png', 'apple-touch-icon.png', 'roamer-mark.svg'],
      manifest: {
        name: 'Little Roamer · Toy 4WD',
        short_name: 'Little Roamer',
        description: 'A colorful offline four-wheel playground with sunny valleys and Icelandic highlands.',
        theme_color: '#315c4d',
        background_color: '#c5ddd5',
        display: 'standalone',
        scope: './',
        start_url: './',
        categories: ['games'],
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        cleanupOutdatedCaches: true,
        maximumFileSizeToCacheInBytes: 3 * 1024 * 1024,
        navigateFallback: 'index.html',
        globPatterns: ['**/*.{html,js,css,svg,png,wasm}'],
      },
    }),
  ],
  server: { host: '0.0.0.0' },
  worker: { format: 'es' },
  build: {
    target: 'safari16',
    rollupOptions: {
      output: {
        manualChunks: {
          three: ['three'],
          physics: ['@dimforge/rapier3d-compat'],
        },
      },
    },
  },
});
