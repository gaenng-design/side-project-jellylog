import type { FixedTemplate, Income, InvestTemplate } from '@/types'
import type { AppSettings } from '@/store/useAppStore'

export function padYearMonth(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

type SalaryExcluded = Partial<Record<'A' | 'B', boolean>>

/**
 * 지출 계획과 동일: `startedMonths`에 포함된 달만 합산.
 * 급여 2건은 저장소 또는 설정 기본값, `defaultSalaryExcludedByMonth` 반영.
 */
export function monthlyIncomeTotalForDashboard(
  ym: string,
  incomesInYear: Income[],
  startedMonths: string[],
  settings: AppSettings,
  defaultSalaryExcludedByMonth: Record<string, SalaryExcluded>,
): number {
  if (!startedMonths.includes(ym)) return 0

  const inYm = incomesInYear.filter((i) => i.yearMonth === ym)
  const defEx = defaultSalaryExcludedByMonth[ym] ?? {}
  const da = inYm.find((i) => i.person === 'A' && i.category === '급여')
  const db = inYm.find((i) => i.person === 'B' && i.category === '급여')
  const extras = inYm.filter(
    (i) => !(i.person === 'A' && i.category === '급여') && !(i.person === 'B' && i.category === '급여'),
  )

  let aAmt = da?.amount ?? settings.personAIncome ?? 0
  let bAmt = db?.amount ?? settings.personBIncome ?? 0
  if (defEx.A) aAmt = 0
  if (defEx.B) bAmt = 0

  const extraSum = extras.reduce((s, i) => s + i.amount, 0)
  return aAmt + bAmt + extraSum
}

interface InvestExtraRow {
  amount: number
}

function effectiveFixedTemplatesForMonth(
  ym: string,
  templateSnapshotsByMonth: Record<string, { fixed?: FixedTemplate[] } | undefined>,
  globalSorted: FixedTemplate[],
): FixedTemplate[] {
  const snap = templateSnapshotsByMonth[ym]
  if (snap?.fixed?.length) return snap.fixed
  return globalSorted
}

interface FixedExtraLike {
  category: string
  amount: number
}

/** 해당 월 고정지출을 카테고리별 금액으로 합산(작성 시작한 달만, 템플릿 제외·월별 금액·추가 행 반영) */
export function monthlyFixedCategoryTotalsForDashboard(
  ym: string,
  startedMonths: string[],
  templateSnapshotsByMonth: Record<string, { fixed?: FixedTemplate[] } | undefined>,
  globalSortedTemplates: FixedTemplate[],
  getFixedMonthlyAmount: (templateId: string, yearMonth: string) => number | undefined,
  isFixedExcluded: (templateId: string, yearMonth: string) => boolean,
  extraFixedRows: FixedExtraLike[],
): Record<string, number> {
  if (!startedMonths.includes(ym)) return {}
  const out: Record<string, number> = {}
  const templates = effectiveFixedTemplatesForMonth(ym, templateSnapshotsByMonth, globalSortedTemplates)
  for (const tpl of templates) {
    if (isFixedExcluded(tpl.id, ym)) continue
    const amt = getFixedMonthlyAmount(tpl.id, ym) ?? tpl.defaultAmount
    const cat = tpl.category?.trim() || '기타'
    out[cat] = (out[cat] ?? 0) + amt
  }
  for (const r of extraFixedRows) {
    const cat = r.category?.trim() || '기타'
    out[cat] = (out[cat] ?? 0) + r.amount
  }
  return out
}

export function buildYearFixedExpenseCategoryBreakdown(
  year: number,
  startedMonths: string[],
  templateSnapshotsByMonth: Record<string, { fixed?: FixedTemplate[] } | undefined>,
  globalSortedTemplates: FixedTemplate[],
  getFixedMonthlyAmount: (templateId: string, yearMonth: string) => number | undefined,
  isFixedExcluded: (templateId: string, yearMonth: string) => boolean,
  extraRowsByMonth: Record<string, { fixed?: FixedExtraLike[] } | undefined>,
): { category: string; amount: number; pct: number }[] {
  const merged: Record<string, number> = {}
  for (let m = 1; m <= 12; m++) {
    const ym = padYearMonth(year, m)
    const extras = extraRowsByMonth[ym]?.fixed ?? []
    const monthMap = monthlyFixedCategoryTotalsForDashboard(
      ym,
      startedMonths,
      templateSnapshotsByMonth,
      globalSortedTemplates,
      getFixedMonthlyAmount,
      isFixedExcluded,
      extras,
    )
    for (const [c, v] of Object.entries(monthMap)) {
      merged[c] = (merged[c] ?? 0) + v
    }
  }
  const total = Object.values(merged).reduce((a, b) => a + b, 0)
  if (total <= 0) return []
  return Object.entries(merged)
    .filter(([, a]) => a > 0)
    .sort((a, b) => b[1] - a[1])
    .map(([category, amount]) => ({
      category,
      amount,
      pct: (amount / total) * 100,
    }))
}

function effectiveInvestTemplates(
  ym: string,
  templateSnapshotsByMonth: Record<string, { invest?: InvestTemplate[] } | undefined>,
  globalSorted: InvestTemplate[],
): InvestTemplate[] {
  const snap = templateSnapshotsByMonth[ym]
  if (snap?.invest?.length) return snap.invest
  return globalSorted
}

/** 해당 월 저축·투자 납부 합계(작성 시작한 달만, 제외 항목 제외, 템플릿 월별 금액·추가 행 포함) */
export function monthlyInvestTotalForDashboard(
  ym: string,
  startedMonths: string[],
  templateSnapshotsByMonth: Record<string, { invest?: InvestTemplate[] } | undefined>,
  globalSortedTemplates: InvestTemplate[],
  getMonthlyAmount: (templateId: string, yearMonth: string) => number | undefined,
  isExcluded: (templateId: string, yearMonth: string) => boolean,
  extraInvestRows: InvestExtraRow[],
): number {
  if (!startedMonths.includes(ym)) return 0
  const templates = effectiveInvestTemplates(ym, templateSnapshotsByMonth, globalSortedTemplates)
  let total = 0
  for (const tpl of templates) {
    if (isExcluded(tpl.id, ym)) continue
    total += getMonthlyAmount(tpl.id, ym) ?? tpl.defaultAmount
  }
  for (const r of extraInvestRows) {
    total += r.amount
  }
  return total
}

export function buildYearIncomeSeries(
  year: number,
  incomesInYear: Income[],
  startedMonths: string[],
  settings: AppSettings,
  defaultSalaryExcludedByMonth: Record<string, SalaryExcluded>,
): number[] {
  return Array.from({ length: 12 }, (_, i) =>
    monthlyIncomeTotalForDashboard(
      padYearMonth(year, i + 1),
      incomesInYear,
      startedMonths,
      settings,
      defaultSalaryExcludedByMonth,
    ),
  )
}

export function buildYearInvestMonthlySeries(
  year: number,
  startedMonths: string[],
  templateSnapshotsByMonth: Record<string, { invest?: InvestTemplate[] } | undefined>,
  globalSortedTemplates: InvestTemplate[],
  getMonthlyAmount: (templateId: string, yearMonth: string) => number | undefined,
  isExcluded: (templateId: string, yearMonth: string) => boolean,
  extraRowsByMonth: Record<string, { invest?: InvestExtraRow[] } | undefined>,
): number[] {
  return Array.from({ length: 12 }, (_, i) => {
    const ym = padYearMonth(year, i + 1)
    const extras = extraRowsByMonth[ym]?.invest ?? []
    return monthlyInvestTotalForDashboard(
      ym,
      startedMonths,
      templateSnapshotsByMonth,
      globalSortedTemplates,
      getMonthlyAmount,
      isExcluded,
      extras,
    )
  })
}

export function cumulativeFromMonthly(monthly: number[]): number[] {
  const out: number[] = []
  let acc = 0
  for (const m of monthly) {
    acc += m
    out.push(acc)
  }
  return out
}
