import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/index.ts'),
      },
    },
    resolve: {
      alias: { '@': resolve('src') },
    },
  },
  preload: {
    plugins: [externalizeDepsPlugin()],
    build: {
      lib: {
        entry: resolve('electron/preload.ts'),
      },
    },
  },
  renderer: {
    root: 'src',
    envDir: resolve('.'),   // 프로젝트 루트의 .env 파일을 읽음 (VITE_* 변수)
    build: {
      rollupOptions: {
        input: resolve('src/index.html'),
      },
    },
    resolve: {
      alias: { '@': resolve('src') },
    },
    plugins: [react()],
  },
})
