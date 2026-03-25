import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'

/**
 * Supabase hydrate 등으로 localStorage만 갱신한 뒤, Zustand 메모리 상태를 스토리지와 맞춥니다.
 * (같은 탭에서 가계 재연결 시 persist가 이미 빈 상태로 올라간 뒤라 UI가 비는 문제 방지)
 */
export async function rehydrateAllPersistedStores(): Promise<void> {
  const stores = [
    useAppStore,
    useFixedTemplateStore,
    useInvestTemplateStore,
    usePlanExtraStore,
    useSettlementStore,
  ] as const
  await Promise.all(
    stores.map((s) => Promise.resolve(s.persist.rehydrate())),
  )
}
