import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  // Relative base so the build works at https://<user>.github.io/<repo>/ without knowing the repo name.
  base: './',
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['apple-touch-icon.png', 'favicon.svg'],
      manifest: {
        name: 'Rememberance',
        short_name: 'Rememberance',
        description: 'Arabic voice notes, organised by category.',
        start_url: './',
        scope: './',
        display: 'standalone',
        background_color: '#f5f5f7',
        theme_color: '#f5f5f7',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
