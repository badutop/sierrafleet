import path from 'node:path'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import legacy from '@vitejs/plugin-legacy'
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
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});