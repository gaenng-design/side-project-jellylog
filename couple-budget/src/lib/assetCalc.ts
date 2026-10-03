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

/** 주기 시작일을 며칠 앞당겨 "이번 달"로 넘기는지 (시작일이 주말·공휴일일 수 있어서) */
export const CYCLE_EARLY_START_DAYS = 3

/**
 * 가계 주기 기준 "이번 달" — 주기는 startDay일 → 다음 달 (startDay-1)일이고, 이름은 끝나는 달이다.
 * 시작일이 주말·공휴일일 수 있어 CYCLE_EARLY_START_DAYS(3일) 앞당겨 다음 주기로 넘어간다 (25일 시작 → 22일부터).
 * startDay ≤ 1 이면 달력 월 그대로. 자산 탭·대시보드가 모두 이 함수 하나만 쓴다.
 * editableBoundary: 이 달까지는 입력값/추정값을 쓰고, 이후는 예상값 (yyyy*100 + monthIdx)
 */
export function getHouseholdFocusMonth(
  today: Date = new Date(),
  startDay: number = 25,
): { year: number; monthIdx: number; editableBoundary: number } {
  const effectiveStart = startDay <= 1 ? 32 : Math.max(2, startDay - CYCLE_EARLY_START_DAYS)
  const d = today.getDate() >= effectiveStart ? new Date(today.getFullYear(), today.getMonth() + 1, 1) : today
  const year = d.getFullYear()
  const monthIdx = d.getMonth()
  return { year, monthIdx, editableBoundary: year * 100 + monthIdx }
}

/** 자산 화면용 별칭 (기본 25일 주기 → 22일부터 다음 달) */
export const getAssetFocusMonth = getHouseholdFocusMonth

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

/** 과거·현재·미래 월의 표시값 (미래는 현재 정기 납입액을 매달 넣는 단순 예상) */
export function getProjectedValue(item: AssetItem, yr: number, mi: number, ctx: ProjectionContext): number {
  if (isClosedAt(item, yr, mi)) return 0
  if (yr * 100 + mi <= ctx.editableBoundary) {
    return getEffectiveEntry(item, yr, mi, ctx.getEntry)
  }
  const { currentYear, currentMonth } = ctx
  const base = getEffectiveEntry(item, currentYear, currentMonth, ctx.getEntry)
  const gap = monthDiff(currentYear, currentMonth, yr, mi)

  // 미래 = 현재 잔액 + 현재 정기 납입액 × 경과 개월. 만기 이자·만기 후 납입 중단은 반영하지 않는다
  // (만기가 지나도 같은 금액을 계속 넣는다고 본다 — 예상 자산 표·차트가 같은 기준을 쓰도록 한 곳에서만 계산)
  const monthly = item.category === '저축' && item.savingsType === 'deposit' ? 0 : (item.defaultAmount ?? 0)
  return base + monthly * gap
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

/** 예수금 — 저장값이 없으면 최근(최대 24개월 전) 저장된 값을 이어서 사용 (평가손익과 같은 규칙) */
export function getEffectiveCash(item: AssetItem, yr: number, mi: number, getCash: GetEntry): number {
  return getEffectivePnl(item, yr, mi, getCash)
}

/** 해당 월까지 누적 실현손익 (해지된 항목은 해지 월까지만 쌓이고 이후에도 값은 유지) */
export function getCumulativeRealized(itemId: string, yr: number, mi: number, realized: Record<string, number>): number {
  const upTo = ym(yr, mi)
  const prefix = `${itemId}::`
  let sum = 0
  for (const [key, v] of Object.entries(realized)) {
    if (key.startsWith(prefix) && key.slice(prefix.length) <= upTo) sum += v
  }
  return sum
}

/** 해당 연도 1월~해당 월 실현손익 (올해 실현손익) */
export function getYtdRealized(itemId: string, yr: number, mi: number, realized: Record<string, number>): number {
  const prefix = `${itemId}::`
  let sum = 0
  for (let m = 0; m <= mi; m++) sum += realized[`${prefix}${ym(yr, m)}`] ?? 0
  return sum
}

export interface InvestMetrics {
  /** 계좌 총 잔고 (주식 평가금 + 예수금) */
  balance: number
  /** 예수금 */
  cash: number
  /** 주식 평가금 = 총 잔고 − 예수금 */
  holdings: number
  /** 보유 주식 원금 = 평가금 − 평가손익 */
  basis: number
  /** 평가손익 (미실현) */
  unrealized: number
  /** 평가손익률 % (원금 대비, 원금 0이면 null) */
  unrealizedPct: number | null
  /** 누적 실현손익 */
  realized: number
  /** 총 수익 = 평가손익 + 누적 실현손익 */
  totalProfit: number
  /** 예수금 비중 % (잔고 0이면 null) */
  cashPct: number | null
}

/** 투자 지표 — 예수금은 수익률 계산에서 빼서 수익률이 희석되지 않게 한다 */
export function calcInvestMetrics(input: { balance: number; cash: number; unrealized: number; realized: number }): InvestMetrics {
  const { balance, cash, unrealized, realized } = input
  const holdings = balance - cash
  const basis = holdings - unrealized
  return {
    balance,
    cash,
    holdings,
    basis,
    unrealized,
    unrealizedPct: basis > 0 ? (unrealized / basis) * 100 : null,
    realized,
    totalProfit: unrealized + realized,
    cashPct: balance > 0 ? (cash / balance) * 100 : null,
  }
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
