import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['favicon.svg', 'apple-touch-icon.png'],
      manifest: {
        name: 'Personal Video Studio',
        short_name: 'VideoStudio',
        description: 'Plataforma personal de publicación y reproducción de vídeos.',
        lang: 'es',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        orientation: 'any',
        background_color: '#0b0b0e',
        theme_color: '#0b0b0e',
        icons: [
          { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
          { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
          { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        // Solo se precachean los assets del build. Los vídeos viven en Vercel Blob
        // (otro origen) y NUNCA deben entrar en la caché del Service Worker.
        globPatterns: ['**/*.{js,css,html,svg,png,ico,woff2}'],
        navigateFallbackDenylist: [/^\/api\//],
        runtimeCaching: [
          {
            // Cinturón y tirantes: aunque los vídeos estén en otro origen,
            // ningún archivo de vídeo pasa por la caché.
            urlPattern: ({ url }) => /\.(mp4|webm|mov|m4v|ogv|mkv)(\?|$)/i.test(url.pathname),
            handler: 'NetworkOnly',
          },
        ],
      },
    }),
  ],
  server: {
    port: 5173,
  },
});
