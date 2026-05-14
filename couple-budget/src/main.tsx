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

// PWA Service Worker 등록 (production 빌드에서만, virtual 모듈 의존 없이 직접 /sw.js 등록)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js', { scope: '/' })
      .then((reg) => {
        console.log('[PWA] Service Worker registered', reg.scope)
      })
      .catch((err) => {
        // /sw.js 가 없는 환경(Electron 등)에서는 조용히 무시
        console.warn('[PWA] SW registration skipped:', err?.message ?? err)
      })
  })
}
