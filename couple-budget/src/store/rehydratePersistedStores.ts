import { withSuppressedSyncTrackingAsync } from '@/services/syncMeta'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'

/**
 * Supabase hydrate 등으로 localStorage만 갱신한 뒤, Zustand 메모리 상태를 스토리지와 맞춥니다.
 * (같은 탭에서 가계 재연결 시 persist가 이미 빈 상태로 올라간 뒤라 UI가 비는 문제 방지)
 *
 * 리하이드레이션 후 startedMonths 에 없는 달의 템플릿 월별 오버라이드를 정리합니다.
 * (cloudSyncReady=false 상태이므로 이 정리가 즉시 push를 유발하지 않습니다.)
 */
export async function rehydrateAllPersistedStores(): Promise<void> {
  await withSuppressedSyncTrackingAsync(async () => {
    const stores = [
      useAppStore,
      useFixedTemplateStore,
      useInvestTemplateStore,
      usePlanExtraStore,
      useSettlementStore,
    ] as const
    await Promise.all(stores.map((s) => Promise.resolve(s.persist.rehydrate())))

    const activeMonths = new Set(useAppStore.getState().startedMonths)
    useFixedTemplateStore.getState().pruneMonthOverrides(activeMonths)
    useInvestTemplateStore.getState().pruneMonthOverrides(activeMonths)
  })
}
