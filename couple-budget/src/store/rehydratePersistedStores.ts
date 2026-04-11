import { withSuppressedSyncTrackingAsync } from '@/services/syncMeta'
import { useAppStore, DEFAULT_FIXED_CATEGORIES, YEAR_PICKER_MIN } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { SUB_HUES, subOklch } from '@/styles/oklchSubColors'

const now = new Date()
const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

function defaultYearPickerMaxYear() {
  return Math.max(YEAR_PICKER_MIN, new Date().getFullYear())
}

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

/**
 * 가계 전환 시 Zustand 메모리 상태를 초기값으로 리셋합니다.
 * (로컬스토리지는 이미 clearCoupleBudgetLocalDataKeepAuth()로 지워진 상태)
 * 같은 탭에서 다른 가계로 전환할 때 이전 가계 데이터가 메모리에 남아있는 문제를 방지합니다.
 */
export function resetAllStoresInMemory(): void {
  // useAppStore 초기값으로 리셋
  useAppStore.setState({
    currentYearMonth: defaultYM,
    settings: {
      personAName: '유저 1',
      personBName: '유저 2',
      personAIncome: 0,
      personBIncome: 0,
      personAIncomeDay: 25,
      personBIncomeDay: 25,
      currency: 'KRW',
      sharedLivingCost: 0,
      sharedLivingCostRatioMode: '50:50' as const,
      sharedLivingCostRatio: [50, 50],
      user1Color: subOklch(SUB_HUES[0]),
      user2Color: subOklch(SUB_HUES[1]),
      sharedColor: subOklch(SUB_HUES[2]),
      fixedCategories: DEFAULT_FIXED_CATEGORIES,
    },
    startedMonths: [defaultYM],
    settledMonths: [],
    lastSavedByMonth: {},
    householdName: null,
    yearPickerMaxYear: defaultYearPickerMaxYear(),
  })

  // useFixedTemplateStore 초기값으로 리셋 (빈 배열, Supabase에서 로드됨)
  useFixedTemplateStore.setState({
    templates: [],
    exclusions: [],
    monthlyAmounts: {},
    monthlySeparations: {},
  })

  // useInvestTemplateStore 초기값으로 리셋 (빈 배열, Supabase에서 로드됨)
  useInvestTemplateStore.setState({
    templates: [],
    exclusions: [],
    monthlyAmounts: {},
  })

  // usePlanExtraStore 초기값으로 리셋 (빈 객체)
  usePlanExtraStore.setState({
    extraRowsByMonth: {},
    separateExpenseRowsByMonth: {},
    templateSnapshotsByMonth: {},
    defaultSalaryExcludedByMonth: {},
  })

  // useSettlementStore 초기값으로 리셋
  useSettlementStore.setState({
    settlements: [],
    transfers: {},
  })
}
