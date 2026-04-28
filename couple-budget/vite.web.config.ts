import { resolve } from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/** Electron 없이 브라우저만 배포할 때: `npm run build:web` */
export default defineConfig({
  root: 'src',
  envDir: resolve('.'),
  plugins: [react()],
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
  base: '/side-project-jellylog/',
})
