import './index.css'
import './design-system/ds.css'
import { bootApp } from '@/services/appBoot'

// Initialize application (load persisted stores from localStorage)
await bootApp()

const { createRoot } = await import('react-dom/client')
const { StrictMode } = await import('react')
const { default: App } = await import('./App')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// PWA Service Worker 등록 (web 빌드 환경에서만 동작 — Electron에서는 자동 skip)
if ('serviceWorker' in navigator) {
  // vite-plugin-pwa가 주입한 virtual 모듈. Electron dev에서는 모듈이 없으므로 @vite-ignore로 정적 분석 회피
  const pwaRegisterModule = 'virtual:pwa-register'
  import(/* @vite-ignore */ pwaRegisterModule)
    .then((mod: { registerSW: (opts: Record<string, unknown>) => void }) => {
      mod.registerSW({
        immediate: true,
        onRegistered(reg: ServiceWorkerRegistration | undefined) {
          console.log('[PWA] Service Worker registered', reg)
        },
        onOfflineReady() {
          console.log('[PWA] App ready to work offline')
        },
        onNeedRefresh() {
          console.log('[PWA] New version available')
        },
      })
    })
    .catch(() => {
      // Electron dev나 PWA 플러그인이 없는 빌드에서는 무시
    })
}
