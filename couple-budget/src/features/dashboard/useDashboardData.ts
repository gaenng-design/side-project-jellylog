import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useAssetStore, ASSET_CATEGORIES } from '@/store/useAssetStore'
import { useSharedExpenseStore } from '@/store/useSharedExpenseStore'
import { incomeRepo } from '@/data/repository'
import type { AssetItem, Income } from '@/types'
import {
  buildMonthlyFlow,
  buildYearFixedExpenseCategoryBreakdown,
  buildYearFixedItemBreakdown,
  buildYearIncomeSeries,
  buildYearInvestMonthlySeries,
  cumulativeFromMonthly,
  monthlySeparateTotal,
  padYearMonth,
} from '@/lib/dashboardYearStats'
import { getEffectiveEntry, getEffectivePnl, getEffectiveCash, getCumulativeRealized, ym as toYM, parseYM, addMonths } from '@/lib/assetCalc'

/** 대시보드가 고르는 기간 — 연도·월 하나로 모든 카드·차트가 움직인다 */
export interface DashboardPeriod {
  year: number
  monthIdx: number
  /** "YYYY-MM" (주기 이름 = 끝나는 달) */
  ym: string
  /** 오늘 기준 "이번 달"(주기 기준)과 같은지 */
  isCurrent: boolean
  /** 오늘 기준 "이번 달" */
  focusYM: string
  /** 선택한 달이 이번 달보다 미래인지 (예상값) */
  isFuture: boolean
}

/** 연간 지출 계획 데이터: 수입·고정·별도·생활비·저축을 월별로 모은다 */
export function useDashboardYearData(year: number) {
  const [incomes, setIncomes] = useState<Income[]>([])
  const startedMonths = useAppStore((s) => s.startedMonths)
  const settings = useAppStore((s) => s.settings)
  const defaultSalaryExcludedByMonth = usePlanExtraStore((s) => s.defaultSalaryExcludedByMonth)
  const extraRowsByMonth = usePlanExtraStore((s) => s.extraRowsByMonth)
  const separateRowsByMonth = usePlanExtraStore((s) => s.separateExpenseRowsByMonth)
  const sharedLivingByMonth = usePlanExtraStore((s) => s.sharedLivingCostByMonth)
  const templateSnapshotsByMonth = usePlanExtraStore((s) => s.templateSnapshotsByMonth)

  const getSortedFixedTemplates = useFixedTemplateStore((s) => s.getSortedTemplates)
  const fixedTemplates = useMemo(() => getSortedFixedTemplates(), [getSortedFixedTemplates])
  const getFixedMonthlyAmount = useFixedTemplateStore((s) => s.getMonthlyAmount)
  const isFixedExcluded = useFixedTemplateStore((s) => s.isExcluded)
  const fixedTemplatesKey = useFixedTemplateStore((s) => s.templates)
  const fixedExclusions = useFixedTemplateStore((s) => s.exclusions)
  const fixedMonthlyAmounts = useFixedTemplateStore((s) => s.monthlyAmounts)

  const getSortedInvestTemplates = useInvestTemplateStore((s) => s.getSortedTemplates)
  const investTemplates = useMemo(() => getSortedInvestTemplates(), [getSortedInvestTemplates])
  const getInvestMonthlyAmount = useInvestTemplateStore((s) => s.getMonthlyAmount)
  const isInvestExcluded = useInvestTemplateStore((s) => s.isExcluded)
  const investTemplatesKey = useInvestTemplateStore((s) => s.templates)
  const investExclusions = useInvestTemplateStore((s) => s.exclusions)
  const investMonthlyAmounts = useInvestTemplateStore((s) => s.monthlyAmounts)

  useEffect(() => {
    let cancelled = false
    const prefix = `${year}-`
    void incomeRepo.query((i) => i.yearMonth.startsWith(prefix)).then((rows) => {
      if (!cancelled) setIncomes(rows)
    })
    return () => {
      cancelled = true
    }
  }, [year])

  const incomeMonthly = useMemo(
    () => buildYearIncomeSeries(year, incomes, startedMonths, settings, defaultSalaryExcludedByMonth),
    [year, incomes, startedMonths, settings, defaultSalaryExcludedByMonth],
  )

  const investMonthly = useMemo(
    () =>
      buildYearInvestMonthlySeries(
        year, startedMonths, templateSnapshotsByMonth, investTemplates,
        getInvestMonthlyAmount, isInvestExcluded, extraRowsByMonth,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, startedMonths, templateSnapshotsByMonth, investTemplates, getInvestMonthlyAmount, isInvestExcluded, extraRowsByMonth, investTemplatesKey, investExclusions, investMonthlyAmounts],
  )
  const investCumulative = useMemo(() => cumulativeFromMonthly(investMonthly), [investMonthly])

  const fixedCategoryBreakdown = useMemo(
    () =>
      buildYearFixedExpenseCategoryBreakdown(
        year, startedMonths, templateSnapshotsByMonth, fixedTemplates,
        getFixedMonthlyAmount, isFixedExcluded, extraRowsByMonth,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, startedMonths, templateSnapshotsByMonth, fixedTemplates, getFixedMonthlyAmount, isFixedExcluded, extraRowsByMonth, fixedTemplatesKey, fixedExclusions, fixedMonthlyAmounts],
  )

  const fixedItems = useMemo(
    () =>
      buildYearFixedItemBreakdown(
        year, startedMonths, templateSnapshotsByMonth, fixedTemplates,
        getFixedMonthlyAmount, isFixedExcluded, extraRowsByMonth,
      ),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [year, startedMonths, templateSnapshotsByMonth, fixedTemplates, getFixedMonthlyAmount, isFixedExcluded, extraRowsByMonth, fixedTemplatesKey, fixedExclusions, fixedMonthlyAmounts],
  )

  const flow = useMemo(
    () =>
      Array.from({ length: 12 }, (_, m) => {
        const key = padYearMonth(year, m + 1)
        const started = startedMonths.includes(key)
        return buildMonthlyFlow({
          income: incomeMonthly[m],
          fixed: fixedItems.reduce((s, r) => s + r.monthly[m], 0),
          separate: monthlySeparateTotal(key, startedMonths, separateRowsByMonth),
          living: started ? (sharedLivingByMonth[key] ?? settings.sharedLivingCost ?? 0) : 0,
          invest: investMonthly[m],
        })
      }),
    [year, startedMonths, incomeMonthly, fixedItems, separateRowsByMonth, sharedLivingByMonth, settings.sharedLivingCost, investMonthly],
  )

  return { incomeMonthly, investMonthly, investCumulative, fixedCategoryBreakdown, fixedItems, flow }
}

export type DashboardYearData = ReturnType<typeof useDashboardYearData>

/** 선택한 달 기준 자산 수치 — 자산 탭과 같은 계산(assetCalc)을 쓴다 */
export function useDashboardAssetStats(period: DashboardPeriod) {
  const items = useAssetStore((s) => s.items)
  const entries = useAssetStore((s) => s.entries)
  const getEntry = useAssetStore((s) => s.getEntry)
  const getCostBasisEntry = useAssetStore((s) => s.getCostBasisEntry)
  const getCashEntry = useAssetStore((s) => s.getCashEntry)
  const cashEntries = useAssetStore((s) => s.cashEntries)
  const realizedEntries = useAssetStore((s) => s.realizedEntries)

  return useMemo(() => {
    const assetYM = period.ym
    const prev = addMonths(period.year, period.monthIdx, -1)
    const assetPrevYM = toYM(prev.year, prev.monthIdx)
    const amountOf = (item: AssetItem, key: string): number => {
      const { year: y, monthIdx: m } = parseYM(key)
      return getEffectiveEntry(item, y, m, getEntry)
    }
    const assetItems = items.filter((i) => ASSET_CATEGORIES.includes(i.category))
    const sum = (list: AssetItem[], key: string) => list.reduce((s, it) => s + amountOf(it, key), 0)

    const totalAsset = sum(assetItems, assetYM)
    const prevTotalAsset = sum(assetItems, assetPrevYM)
    const availableAsset = sum(assetItems.filter((i) => !i.locked), assetYM)
    const savingsAsset = sum(assetItems.filter((i) => i.category === '저축' || i.category === '투자'), assetYM)
    const categoryTotals = ASSET_CATEGORIES.map((cat) => ({ cat, total: sum(assetItems.filter((i) => i.category === cat), assetYM) }))

    const investItems = assetItems.filter((i) => i.category === '투자')
    const { year: curY, monthIdx: curM } = parseYM(assetYM)
    const investBalance = sum(investItems, assetYM)
    // 평가손익을 입력한 투자 항목이 하나라도 있어야 손익을 보여준다 (없으면 0원 대신 "입력 없음")
    const investPnlEntered = investItems.some((item) => getEffectivePnl(item, curY, curM, getCostBasisEntry) !== 0)
    const investPnl = investItems.reduce((s, item) => s + getEffectivePnl(item, curY, curM, getCostBasisEntry), 0)
    const investCash = investItems.reduce((s, item) => s + getEffectiveCash(item, curY, curM, getCashEntry), 0)
    const investRealized = investItems.reduce((s, item) => s + getCumulativeRealized(item.id, curY, curM, realizedEntries), 0)
    // 원금은 예수금을 뺀 보유 주식 기준 (예수금이 수익률을 희석하지 않게)
    const investBasis = investBalance - investCash - investPnl

    // 연초(1월) 총 자산 — 데이터가 없으면 그해 가장 이른 입력 월
    let baselineYM = toYM(period.year, 0)
    let baselineAsset = sum(assetItems, baselineYM)
    if (baselineAsset === 0) {
      for (let mi = 1; mi <= period.monthIdx; mi++) {
        const candidate = toYM(period.year, mi)
        const total = sum(assetItems, candidate)
        if (total > 0) {
          baselineYM = candidate
          baselineAsset = total
          break
        }
      }
    }
    const ytdDelta = totalAsset - baselineAsset
    const ytdPct = baselineAsset > 0 ? (ytdDelta / baselineAsset) * 100 : 0
    const baselineMonthIdx = parseYM(baselineYM).monthIdx

    return {
      totalAsset, prevTotalAsset, assetDelta: totalAsset - prevTotalAsset, availableAsset, savingsAsset,
      lockedAsset: totalAsset - availableAsset, categoryTotals,
      investPnl, investPnlEntered, investBalance, investBasis, investCash, investRealized,
      baselineAsset, baselineMonthIdx, ytdDelta, ytdPct,
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, entries, getEntry, getCostBasisEntry, cashEntries, realizedEntries, getCashEntry, period.ym, period.year, period.monthIdx])
}

/** 선택한 달 공동 생활비 사용액·목표 */
export function useDashboardSharedStats(ymKey: string) {
  const sharedEntries = useSharedExpenseStore((s) => s.entries)
  const override = usePlanExtraStore((s) => s.sharedLivingCostByMonth[ymKey])
  const target = useAppStore((s) => s.settings.sharedLivingCost ?? 0)
  return useMemo(() => {
    const used = sharedEntries.filter((e) => e.yearMonth === ymKey && !e.excluded).reduce((s, e) => s + e.amount, 0)
    return { used, target: override ?? target, hasEntries: sharedEntries.some((e) => e.yearMonth === ymKey && !e.excluded) }
  }, [sharedEntries, override, target, ymKey])
}
