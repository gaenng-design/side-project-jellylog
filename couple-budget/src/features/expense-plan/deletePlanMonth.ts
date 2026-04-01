import { incomeRepo } from '@/data/repository'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'

/**
 * 지출 계획「작성 삭제」— 컴포넌트 언마운트와 무관하게 레포·Zustand를 한 번에 비움.
 * (훅의 remove+refresh는 라우트 이탈 시 타이밍 이슈가 날 수 있음)
 */
export async function deletePlanMonthCore(yearMonth: string): Promise<void> {
  const rows = await incomeRepo.query((i) => i.yearMonth === yearMonth)
  for (const inc of rows) {
    await incomeRepo.remove(inc.id)
  }

  usePlanExtraStore.getState().clearMonth(yearMonth)
  useFixedTemplateStore.getState().clearMonthForYearMonth(yearMonth)
  useInvestTemplateStore.getState().clearMonthForYearMonth(yearMonth)
  useAppStore.getState().removeStartedMonth(yearMonth)
  useAppStore.getState().unsetSettleMonth(yearMonth)
  useSettlementStore.getState().cancelSettlement(yearMonth)
  useSettlementStore.getState().clearTransfersForMonth(yearMonth)
}
