import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
import { VitePWA } from 'vite-plugin-pwa'
import { defineConfig } from 'vite'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// https://vite.dev/config/
export default defineConfig({
  logLevel: 'error', // Suppress warnings, only show errors
  plugins: [
    react(),
    // Vite's default build targets Safari 14+ (ES2020 modules, optional
    // chaining, etc.) — this app is used on older iPads (iOS/Safari 12),
    // which fails to even parse that bundle (blank screen, app "won't
    // open"). plugin-legacy emits an additional transpiled+polyfilled
    // bundle and auto-detects which one an old browser needs.
    legacy({
      targets: ['defaults', 'iOS >= 12', 'Safari >= 12'],
    }),
    // PWA : installable sur écran d'accueil + shell applicatif mis en cache
    // pour un chargement plus rapide. Ne met en cache QUE les fichiers du
    // build (JS/CSS/images) — jamais les appels réseau vers Supabase, pour
    // ne jamais risquer d'afficher des données figées (rotations, véhicules,
    // etc. changent en permanence). registerType 'autoUpdate' : le service
    // worker se met à jour tout seul au prochain chargement après un
    // déploiement, sans quoi un utilisateur pourrait rester bloqué sur une
    // vieille version mise en cache.
    VitePWA({
      registerType: 'autoUpdate',
      // Le bundle applicatif (+ son double transpilé par plugin-legacy pour
      // les vieux iPad) dépasse la limite par défaut de Workbox (2 Mio) —
      // relevée pour que les deux restent précachés.
      workbox: {
        maximumFileSizeToCacheInBytes: 6 * 1024 * 1024,
      },
      manifest: {
        name: 'Sierra Logistics',
        short_name: 'Sierra Fleet',
        description: 'Gestion de flotte Sierra Logistics',
        start_url: '/',
        display: 'standalone',
        background_color: '#F6F7F9',
        theme_color: '#1A2F4D',
        icons: [
          { src: '/assets/pwa-icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: '/assets/pwa-icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: '/assets/pwa-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
    }),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});