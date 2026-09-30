/**
 * 자산 계산 공용 모듈 — 자산 탭·대시보드가 모두 이 함수들을 사용해 같은 숫자를 보여준다.
 *
 * 금액 규칙
 * - 저장된 월 값(entry)이 있으면 그대로 사용
 * - 없으면 직전 저장 월 값 + 월 납입액 × 경과 개월로 추정 (carry-forward)
 * - 해지 처리(closedYM) 이후는 0
 * - 적금·예금은 만기 이후 납입이 멈추고, 만기 월부터 이자가 더해진다 (단리)
 */
import type { AssetItem } from '@/types'

export type GetEntry = (itemId: string, yearMonth: string) => number

/** 이자소득세 (일반과세 15.4%) */
export const INTEREST_TAX_RATE = 0.154

/**
 * 자산 화면의 "이번 달" — 오늘 날짜 기준. 매달 22일부터는 다음 달을 기준으로 삼는다
 * (다음 달 잔액을 미리 입력하는 시기). 자산 탭과 대시보드가 같은 값을 쓰도록 이 함수 하나만 사용한다.
 * editableBoundary: 이 달까지는 입력값/추정값을 쓰고, 이후는 예상값 (yyyy*100 + monthIdx)
 */
export function getAssetFocusMonth(today: Date = new Date()): { year: number; monthIdx: number; editableBoundary: number } {
  const d = today.getDate() >= 22 ? new Date(today.getFullYear(), today.getMonth() + 1, 1) : today
  const year = d.getFullYear()
  const monthIdx = d.getMonth()
  return { year, monthIdx, editableBoundary: year * 100 + monthIdx }
}

export function ym(year: number, monthIdx: number): string {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`
}

/** "YYYY-MM" 또는 "YYYY-MM-DD" → { year, monthIdx } (타임존 영향 없이 문자열로 파싱) */
export function parseYM(value: string): { year: number; monthIdx: number } {
  const [y, m] = value.split('-').map(Number)
  return { year: y, monthIdx: m - 1 }
}

/** 두 월 사이 개월 수 (to − from) */
export function monthDiff(fromYear: number, fromMonthIdx: number, toYear: number, toMonthIdx: number): number {
  return (toYear - fromYear) * 12 + (toMonthIdx - fromMonthIdx)
}

/** 월 이동 */
export function addMonths(year: number, monthIdx: number, delta: number): { year: number; monthIdx: number } {
  const total = year * 12 + monthIdx + delta
  return { year: Math.floor(total / 12), monthIdx: ((total % 12) + 12) % 12 }
}

/** 오늘 기준 만기일까지 남은 일수 (당일 = 0, 지남 = 음수) */
export function daysUntil(dateStr: string, today: Date = new Date()): number {
  const [y, m, d] = dateStr.split('-').map(Number)
  const target = new Date(y, m - 1, d)
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate())
  return Math.round((target.getTime() - base.getTime()) / 86400000)
}

/** 이자 계산 대상(적금·예금 + 이율 + 만기일)인지 */
export function hasMaturityInterest(item: AssetItem): boolean {
  return (
    item.category === '저축' &&
    (item.savingsType === 'installment' || item.savingsType === 'deposit' || item.savingsType === undefined) &&
    !!item.interestRate &&
    item.interestRate > 0 &&
    !!item.maturityDate
  )
}

/** 만기일이 있는 적금·예금인지 (이율 유무 무관) */
function hasMaturityDate(item: AssetItem): boolean {
  return (
    item.category === '저축' &&
    item.savingsType !== 'checking' &&
    item.savingsType !== 'subscription' &&
    !!item.maturityDate
  )
}

function isClosedAt(item: AssetItem, yr: number, mi: number): boolean {
  return !!item.closedYM && ym(yr, mi) > item.closedYM
}

/**
 * 해당 월에 들어가는 월 납입액.
 * - 예금은 납입 없음 (과거 데이터에 defaultAmount가 원금으로 저장된 경우도 무시)
 * - 만기 월 이후·해지 이후는 0
 */
export function monthlyContribution(item: AssetItem, yr: number, mi: number): number {
  if (item.category === '저축' && item.savingsType === 'deposit') return 0
  if (isClosedAt(item, yr, mi)) return 0
  if (hasMaturityDate(item)) {
    const mat = parseYM(item.maturityDate!)
    if (monthDiff(mat.year, mat.monthIdx, yr, mi) > 0) return 0
  }
  return item.defaultAmount && item.defaultAmount > 0 ? item.defaultAmount : 0
}

/**
 * 저장값이 없는 달은 직전 저장 월(최대 24개월 전)에서 월 납입액을 누적해 추정.
 * 저장값이 있으면 그대로 반환.
 */
export function getEffectiveEntry(item: AssetItem, yr: number, mi: number, getEntry: GetEntry): number {
  if (isClosedAt(item, yr, mi)) return 0
  const stored = getEntry(item.id, ym(yr, mi))
  if (stored !== 0) return stored
  let added = 0
  for (let offset = 1; offset <= 24; offset++) {
    const cur = addMonths(yr, mi, -offset + 1)
    added += monthlyContribution(item, cur.year, cur.monthIdx)
    const prev = addMonths(yr, mi, -offset)
    if (prev.year < 2020) break
    const prevVal = getEntry(item.id, ym(prev.year, prev.monthIdx))
    if (prevVal > 0) return prevVal + added
  }
  return 0
}

export interface MaturityResult {
  /** 기준 월부터 만기 월까지 남은 개월 (지났으면 0) */
  remainingMonths: number
  /** 만기까지 추가로 납입할 원금 */
  futureDeposits: number
  /** 만기 시점 원금 = 기준 잔액 + 추가 납입 */
  principal: number
  /** 가입(첫 입력 월)부터 만기까지 붙는 전체 이자 (taxRate 반영) */
  interest: number
  /** 만기 수령액 = principal + interest */
  amount: number
}

/**
 * 단리 이자 — 시작 원금 × 연이율 × n/12 + 월납입 × 월이율 × n(n−1)/2
 * calcMaturity·누적 이자 모두 이 공식을 사용한다.
 */
function simpleInterest(startPrincipal: number, monthly: number, annualRate: number, months: number): number {
  if (months <= 0) return 0
  return startPrincipal * annualRate * months / 12 + monthly * (annualRate / 12) * (months * (months - 1) / 2)
}

/**
 * 만기 예상 계산 (단리). 모든 카드·표가 이 함수 하나로 계산한다.
 * - startYM(첫 입력 월)이 있으면 그때부터 만기까지의 전체 이자를 계산
 *   (시작 원금 = 기준 잔액 − 그 사이 납입액으로 역산)
 * - 이율·만기일이 없으면 null
 */
export function calcMaturity(
  item: AssetItem,
  balance: number,
  baseYear: number,
  baseMonthIdx: number,
  options: { startYM?: string; taxRate?: number } = {},
): MaturityResult | null {
  if (!hasMaturityInterest(item)) return null
  const mat = parseYM(item.maturityDate!)
  const remainingMonths = Math.max(0, monthDiff(baseYear, baseMonthIdx, mat.year, mat.monthIdx))
  const rate = item.interestRate! / 100
  const monthly = item.savingsType === 'deposit' ? 0 : (item.defaultAmount ?? 0)
  const futureDeposits = monthly * remainingMonths

  let elapsed = 0
  if (options.startYM) {
    const start = parseYM(options.startYM)
    elapsed = Math.max(0, monthDiff(start.year, start.monthIdx, baseYear, baseMonthIdx))
    // 만기가 이미 지난 경우 만기 월까지만
    elapsed = Math.min(elapsed, Math.max(0, monthDiff(start.year, start.monthIdx, mat.year, mat.monthIdx)))
  }
  const totalMonths = elapsed + remainingMonths
  const startPrincipal = Math.max(0, balance - monthly * elapsed)
  const interest = simpleInterest(startPrincipal, monthly, rate, totalMonths) * (1 - (options.taxRate ?? 0))
  const principal = balance + futureDeposits
  return { remainingMonths, futureDeposits, principal, interest, amount: principal + interest }
}

export interface ProjectionContext {
  getEntry: GetEntry
  /** 기준(포커스) 연·월 */
  currentYear: number
  currentMonth: number
  /** 실제 입력 허용 상한 (yyyy*100 + monthIdx) — 이 달까지는 입력값/추정값 사용 */
  editableBoundary: number
  /** 이자소득세율 (0 = 세전) */
  taxRate?: number
  /** 항목별 첫 입력 월 — 만기 이자를 가입 시점부터 계산할 때 사용 */
  firstEntryYM?: Record<string, string>
}

/** 과거·현재·미래 월의 표시값 */
export function getProjectedValue(item: AssetItem, yr: number, mi: number, ctx: ProjectionContext): number {
  if (isClosedAt(item, yr, mi)) return 0
  if (yr * 100 + mi <= ctx.editableBoundary) {
    return getEffectiveEntry(item, yr, mi, ctx.getEntry)
  }
  const { currentYear, currentMonth } = ctx
  const base = getEffectiveEntry(item, currentYear, currentMonth, ctx.getEntry)
  const gap = monthDiff(currentYear, currentMonth, yr, mi)

  if (hasMaturityDate(item)) {
    const mat = parseYM(item.maturityDate!)
    const matGap = monthDiff(currentYear, currentMonth, mat.year, mat.monthIdx)
    // 이미 만기가 지난 상품: 추가 납입·이자 없이 현재 값 유지
    if (matGap <= 0) return base
    if (gap >= matGap) {
      const result = calcMaturity(item, base, currentYear, currentMonth, {
        startYM: ctx.firstEntryYM?.[item.id],
        taxRate: ctx.taxRate,
      })
      if (result) return Math.round(result.amount)
      const monthly = item.savingsType === 'deposit' ? 0 : (item.defaultAmount ?? 0)
      return base + monthly * matGap
    }
  }

  let added = 0
  for (let k = 1; k <= gap; k++) {
    const m = addMonths(currentYear, currentMonth, k)
    added += monthlyContribution(item, m.year, m.monthIdx)
  }
  return base + added
}

/**
 * 투자 평가손익 — 저장값이 없으면 최근(최대 24개월 전) 저장된 손익을 이어서 사용.
 */
export function getEffectivePnl(item: AssetItem, yr: number, mi: number, getPnl: GetEntry): number {
  if (isClosedAt(item, yr, mi)) return 0
  for (let offset = 0; offset <= 24; offset++) {
    const m = addMonths(yr, mi, -offset)
    const v = getPnl(item.id, ym(m.year, m.monthIdx))
    if (v !== 0) return v
  }
  return 0
}

/**
 * 저축 항목의 누적 이자 (첫 입력 월부터 해당 월까지, 만기 월에서 멈춤).
 * calcMaturity와 같은 단리 공식을 사용한다.
 */
export function getSavingsCumulativeInterest(
  item: AssetItem,
  yr: number,
  mi: number,
  getEntry: GetEntry,
  firstEntryYM: string | undefined,
  taxRate = 0,
): number {
  if (!hasMaturityInterest(item) || !firstEntryYM) return 0
  const start = parseYM(firstEntryYM)
  const mat = parseYM(item.maturityDate!)
  const elapsed = Math.min(
    monthDiff(start.year, start.monthIdx, yr, mi),
    monthDiff(start.year, start.monthIdx, mat.year, mat.monthIdx),
  )
  if (elapsed <= 0) return 0
  const rate = item.interestRate! / 100
  const monthly = item.savingsType === 'deposit' ? 0 : (item.defaultAmount ?? 0)
  return simpleInterest(getEntry(item.id, firstEntryYM), monthly, rate, elapsed) * (1 - taxRate)
}

/** 항목별 첫 입력 월 맵 */
export function buildFirstEntryMap(entries: { itemId: string; yearMonth: string }[]): Record<string, string> {
  const map: Record<string, string> = {}
  for (const e of entries) {
    if (!map[e.itemId] || e.yearMonth < map[e.itemId]) map[e.itemId] = e.yearMonth
  }
  return map
}
