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
