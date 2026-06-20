import { fileURLToPath, URL } from 'node:url'
import { readFileSync } from 'node:fs'
import { defineConfig } from 'vitest/config'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import VueI18nPlugin from '@intlify/unplugin-vue-i18n/vite'
import { VitePWA } from 'vite-plugin-pwa'

const pkg = JSON.parse(readFileSync(new URL('./package.json', import.meta.url), 'utf-8')) as {
  version: string
}

// Where the dev proxy forwards Moonraker REST/WS (override with MOONRAKER_HTTP).
const moonrakerHttp = process.env.MOONRAKER_HTTP ?? 'http://localhost:7125'
// The lean backend (serves the SPA + /api). Dev proxies /api here.
const backend = process.env.FILAMIND_BACKEND ?? 'http://localhost:8030'

export default defineConfig({
  base: './', // portable: mount under any sub-path on the printer host
  define: { __APP_VERSION__: JSON.stringify(pkg.version) },
  plugins: [
    vue(),
    tailwindcss(),
    VueI18nPlugin({
      include: [fileURLToPath(new URL('./src/locales/**', import.meta.url))],
      // Locales are loaded at runtime via import.meta.glob (not the plugin transform), so
      // vue-i18n must keep its message compiler to interpolate {params} — runtimeOnly would
      // ship the compiler-less build and render literal "{v}"/"{axes}".
      runtimeOnly: false,
      compositionOnly: true,
      strictMessage: false,
      escapeHtml: false,
    }),
    VitePWA({
      registerType: 'autoUpdate',
      injectRegister: 'auto',
      devOptions: { enabled: false },
      manifest: {
        name: 'FilaMind 3d',
        short_name: 'FilaMind',
        description: 'Modern web control for Klipper / Moonraker',
        theme_color: '#0E0F12',
        background_color: '#0E0F12',
        display: 'standalone',
        start_url: './',
        icons: [
          { src: 'favicon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' },
        ],
      },
    }),
  ],
  resolve: { alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) } },
  server: {
    port: 5273,
    proxy: {
      '/server': { target: moonrakerHttp, changeOrigin: true },
      '/printer': { target: moonrakerHttp, changeOrigin: true },
      '/access': { target: moonrakerHttp, changeOrigin: true },
      '/machine': { target: moonrakerHttp, changeOrigin: true },
      '/websocket': { target: moonrakerHttp.replace(/^http/, 'ws'), ws: true, changeOrigin: true },
      '/api': { target: backend, changeOrigin: true },
    },
  },
  build: { target: 'es2022', sourcemap: false },
  test: { environment: 'jsdom' },
})
