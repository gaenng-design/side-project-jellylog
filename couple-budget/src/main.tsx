import './index.css'
import './design-system/ds.css'
import {
  ensureSupabaseSessionForSync,
  resolveSessionAndHouseholdBeforeHydrate,
  getSyncHouseholdId,
  clearCoupleBudgetLocalDataKeepAuth,
} from '@/services/authHousehold'
import { hydrateFromSupabaseBeforeApp } from '@/services/supabase-sync'
import { rehydrateAllPersistedStores } from '@/store/rehydratePersistedStores'

const sessionResult = await ensureSupabaseSessionForSync()
if (!sessionResult.ok) {
  console.error(
    '[couple-budget] Supabase 익명 세션 실패 → 대시보드 Users에 사용자가 안 생길 수 있음:',
    sessionResult.reason,
  )
}
await resolveSessionAndHouseholdBeforeHydrate()
/** 가계에 연결되지 않은 세션이면 로컬에 남은 월별·템플릿·설정 캐시 제거 → 미연결 UI는 빈 상태 */
if (!getSyncHouseholdId()) {
  clearCoupleBudgetLocalDataKeepAuth()
}
await hydrateFromSupabaseBeforeApp()
/** persist 초기 hydration과 hydrate 타이밍이 겹치면 빈 상태가 남을 수 있어 한 번 더 맞춤 */
await rehydrateAllPersistedStores()

const { createRoot } = await import('react-dom/client')
const { StrictMode } = await import('react')
const { default: App } = await import('./App')

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
