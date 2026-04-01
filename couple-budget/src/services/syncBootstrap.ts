/**
 * 가계 ID가 정해진 뒤 공통 pull 경로: 로컬 메모리 ↔ persist 정렬 → dirty면 먼저 push → 그다음 원격 hydrate.
 * resolveSessionAndHouseholdBeforeHydrate 는 household_id 만 맞추고 hydrate 는 여기서만(또는 가계 생성/참여 RPC 직후) 수행합니다.
 */
import { preflightPushDirtyLocalBeforeHydrate } from '@/services/debouncedCloudSync'
import { hydrateFromSupabaseBeforeApp } from '@/services/supabase-sync'
import { rehydrateAllPersistedStores } from '@/store/rehydratePersistedStores'

export async function rehydrateThenPreflightPullRehydrate(): Promise<void> {
  await rehydrateAllPersistedStores()
  const { skipRemoteHydrate } = await preflightPushDirtyLocalBeforeHydrate()
  if (skipRemoteHydrate) {
    console.warn(
      '[local-first] 미전송 로컬 변경이 있는데 업로드에 실패해 서버에서 당겨오지 않았습니다. 네트워크 확인 후 설정에서 저장을 다시 시도하세요.',
    )
    return
  }
  await hydrateFromSupabaseBeforeApp()
  await rehydrateAllPersistedStores()
}
