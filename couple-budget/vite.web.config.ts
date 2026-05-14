import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

/** Electron 없이 브라우저만 배포할 때: `npm run build:web` */
export default defineConfig({
  root: 'src',
  envDir: resolve('.'),
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['pwa-icon.svg'],
      manifest: {
        name: '부부 가계부',
        short_name: '가계부',
        description: '부부를 위한 정산·자산 관리 가계부',
        theme_color: '#4f8cff',
        background_color: '#ffffff',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        lang: 'ko',
        icons: [
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'any',
          },
          {
            src: 'pwa-icon.svg',
            sizes: 'any',
            type: 'image/svg+xml',
            purpose: 'maskable',
          },
        ],
      },
      workbox: {
        // SPA fallback
        navigateFallback: '/index.html',
        // 정적 자산 + index 캐시 (앱 셸)
        globPatterns: ['**/*.{js,css,html,svg,png,ico}'],
        // GitHub API 응답은 캐시하지 않음 (실시간 동기화 필요)
        runtimeCaching: [
          {
            urlPattern: /^https:\/\/api\.github\.com\/.*/,
            handler: 'NetworkOnly',
            options: { cacheName: 'github-api-no-cache' },
          },
        ],
      },
      devOptions: {
        enabled: false, // 개발 모드에서는 비활성화 (production 빌드에서만 SW 활성)
      },
    }),
  ],
  resolve: {
    alias: { '@': resolve('src') },
  },
  build: {
    outDir: resolve('dist-web'),
    emptyOutDir: true,
    target: 'es2022',
    rollupOptions: {
      input: resolve('src/index.html'),
    },
  },
  base: '/',
})
