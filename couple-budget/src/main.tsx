import './index.css'
import {
  ensureSupabaseSessionForSync,
  resolveSessionAndHouseholdBeforeHydrate,
} from '@/services/authHousehold'
import { hydrateFromSupabaseBeforeApp } from '@/services/supabase-sync'

const sessionResult = await ensureSupabaseSessionForSync()
if (!sessionResult.ok) {
  console.error(
    '[couple-budget] Supabase 익명 세션 실패 → 대시보드 Users에 사용자가 안 생길 수 있음:',
    sessionResult.reason,
  )
}
await resolveSessionAndHouseholdBeforeHydrate()
await hydrateFromSupabaseBeforeApp()

const { createRoot } = await import('react-dom/client')
const { StrictMode } = await import('react')
const { default: App } = await import('./App')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
