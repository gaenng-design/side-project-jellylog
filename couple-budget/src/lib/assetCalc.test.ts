import { describe, it, expect } from 'vitest'
import type { AssetItem } from '@/types'
import {
  ym,
  addMonths,
  daysUntil,
  monthlyContribution,
  getEffectiveEntry,
  calcMaturity,
  getProjectedValue,
  getEffectivePnl,
  getSavingsCumulativeInterest,
  INTEREST_TAX_RATE,
  getAssetFocusMonth,
  getHouseholdFocusMonth,
  getCumulativeRealized,
  getYtdRealized,
  calcInvestMetrics,
} from './assetCalc'

const item = (patch: Partial<AssetItem>): AssetItem => ({
  id: 'a', name: 'x', category: '저축', order: 0, ...patch,
})
const store = (data: Record<string, number>) => (_id: string, key: string) => data[key] ?? 0

describe('기본 유틸', () => {
  it('ym / addMonths', () => {
    expect(ym(2026, 0)).toBe('2026-01')
    expect(addMonths(2026, 0, -1)).toEqual({ year: 2025, monthIdx: 11 })
    expect(addMonths(2026, 11, 1)).toEqual({ year: 2027, monthIdx: 0 })
  })
  it('daysUntil', () => {
    const today = new Date(2026, 8, 29)
    expect(daysUntil('2026-09-29', today)).toBe(0)
    expect(daysUntil('2026-10-01', today)).toBe(2)
    expect(daysUntil('2026-09-28', today)).toBe(-1)
  })
})

describe('monthlyContribution', () => {
  it('예금은 defaultAmount가 있어도 0', () => {
    expect(monthlyContribution(item({ savingsType: 'deposit', defaultAmount: 1_000_000 }), 2026, 5)).toBe(0)
  })
  it('만기 월까지만 납입, 이후 0', () => {
    const it1 = item({ savingsType: 'installment', defaultAmount: 100, maturityDate: '2026-06-15' })
    expect(monthlyContribution(it1, 2026, 5)).toBe(100)
    expect(monthlyContribution(it1, 2026, 6)).toBe(0)
  })
  it('해지 이후 0', () => {
    expect(monthlyContribution(item({ category: '투자', defaultAmount: 100, closedYM: '2026-03' }), 2026, 3)).toBe(0)
  })
})

describe('getEffectiveEntry', () => {
  it('저장값 우선, 없으면 직전 값 + 납입 누적', () => {
    const it1 = item({ category: '투자', defaultAmount: 10 })
    const get = store({ '2026-01': 100 })
    expect(getEffectiveEntry(it1, 2026, 0, get)).toBe(100)
    expect(getEffectiveEntry(it1, 2026, 3, get)).toBe(130)
  })
  it('예금은 원금이 defaultAmount에 들어있어도 부풀지 않음', () => {
    const it1 = item({ savingsType: 'deposit', defaultAmount: 1000 })
    expect(getEffectiveEntry(it1, 2026, 3, store({ '2026-01': 1000 }))).toBe(1000)
  })
  it('만기 이후에는 납입이 쌓이지 않음', () => {
    const it1 = item({ savingsType: 'installment', defaultAmount: 10, maturityDate: '2026-02-01', interestRate: 3 })
    expect(getEffectiveEntry(it1, 2026, 5, store({ '2026-01': 100 }))).toBe(110)
  })
})

describe('calcMaturity', () => {
  it('예금 단리', () => {
    const r = calcMaturity(item({ savingsType: 'deposit', interestRate: 12, maturityDate: '2027-01-10' }), 1_000_000, 2026, 0)!
    expect(r.remainingMonths).toBe(12)
    expect(r.interest).toBeCloseTo(120_000)
    expect(r.amount).toBeCloseTo(1_120_000)
  })
  it('적금: 잔액 이자 + 납입분 이자', () => {
    const r = calcMaturity(item({ savingsType: 'installment', interestRate: 12, defaultAmount: 100_000, maturityDate: '2026-04-01' }), 0, 2026, 0)!
    // n=3 → 100,000 × 1% × 3 = 3,000
    expect(r.futureDeposits).toBe(300_000)
    expect(r.interest).toBeCloseTo(3_000)
  })
  it('세후는 이자만 15.4% 차감', () => {
    const it1 = item({ savingsType: 'deposit', interestRate: 12, maturityDate: '2027-01-10' })
    const r = calcMaturity(it1, 1_000_000, 2026, 0, { taxRate: INTEREST_TAX_RATE })!
    expect(r.interest).toBeCloseTo(120_000 * 0.846)
    expect(r.principal).toBe(1_000_000)
  })
  it('가입 시점부터 전체 이자 — 만기 직전에도 이자가 0이 되지 않음', () => {
    const dep = item({ savingsType: 'deposit', interestRate: 12, maturityDate: '2027-01-10' })
    const r = calcMaturity(dep, 1_000_000, 2026, 11, { startYM: '2026-01' })!
    expect(r.remainingMonths).toBe(1)
    expect(r.interest).toBeCloseTo(120_000)
    // 적금: 시작 원금은 그 사이 납입액을 빼서 역산 → 처음부터 계산한 값과 동일
    const ins = item({ savingsType: 'installment', interestRate: 12, defaultAmount: 100_000, maturityDate: '2026-07-01' })
    const fromStart = calcMaturity(ins, 0, 2026, 0)!
    const midway = calcMaturity(ins, 300_000, 2026, 3, { startYM: '2026-01' })!
    expect(midway.interest).toBeCloseTo(fromStart.interest)
    expect(midway.amount).toBeCloseTo(fromStart.amount)
  })
  it('누적 이자는 만기 월에 calcMaturity 전체 이자와 같음', () => {
    const dep = item({ savingsType: 'deposit', interestRate: 6, maturityDate: '2026-12-01' })
    const get = store({ '2026-01': 2_000_000 })
    const total = calcMaturity(dep, 2_000_000, 2026, 11, { startYM: '2026-01' })!.interest
    expect(getSavingsCumulativeInterest(dep, 2026, 11, get, '2026-01')).toBeCloseTo(total)
  })
  it('입출금·이율 없음은 null', () => {
    expect(calcMaturity(item({ savingsType: 'checking' }), 1, 2026, 0)).toBeNull()
    expect(calcMaturity(item({ savingsType: 'deposit', maturityDate: '2027-01-01' }), 1, 2026, 0)).toBeNull()
  })
})

describe('getProjectedValue', () => {
  const ctx = (data: Record<string, number>) => ({
    getEntry: store(data), currentYear: 2026, currentMonth: 0, editableBoundary: 2026 * 100 + 0,
  })
  it('만기 이후에도 현재 정기 납입액을 계속 더함 (이자·만기 중단 없음)', () => {
    const it1 = item({ savingsType: 'installment', interestRate: 12, defaultAmount: 100_000, maturityDate: '2026-04-01' })
    const c = ctx({ '2026-01': 500_000 })
    expect(getProjectedValue(it1, 2026, 3, c)).toBe(800_000)
    expect(getProjectedValue(it1, 2026, 8, c)).toBe(1_300_000)
  })
  it('만기 전에는 원금만 증가', () => {
    const it1 = item({ savingsType: 'installment', interestRate: 12, defaultAmount: 100_000, maturityDate: '2026-04-01' })
    expect(getProjectedValue(it1, 2026, 2, ctx({ '2026-01': 500_000 }))).toBe(700_000)
  })
  it('이미 만기 지난 적금도 정기 납입액만큼 계속 늘어남', () => {
    const it1 = item({ savingsType: 'installment', interestRate: 3, defaultAmount: 100, maturityDate: '2025-06-01' })
    expect(getProjectedValue(it1, 2026, 6, ctx({ '2026-01': 1000 }))).toBe(1600)
  })
  it('예금(정기 납입 없음)은 그대로', () => {
    const it1 = item({ savingsType: 'deposit', interestRate: 3, defaultAmount: 100, maturityDate: '2026-04-01' })
    expect(getProjectedValue(it1, 2026, 8, ctx({ '2026-01': 1000 }))).toBe(1000)
  })
  it('해지된 항목은 미래에도 0', () => {
    const it1 = item({ category: '투자', defaultAmount: 100, closedYM: '2025-12' })
    expect(getProjectedValue(it1, 2026, 6, ctx({ '2025-12': 1000 }))).toBe(0)
  })
})

describe('getEffectivePnl', () => {
  it('최근 손익을 이어서 사용', () => {
    const it1 = item({ category: '투자' })
    expect(getEffectivePnl(it1, 2026, 3, store({ '2026-01': -50 }))).toBe(-50)
  })
})

describe('getSavingsCumulativeInterest', () => {
  it('만기 월에서 멈추고 calcMaturity와 같은 공식', () => {
    const it1 = item({ savingsType: 'deposit', interestRate: 12, maturityDate: '2026-07-01' })
    const get = store({ '2026-01': 1_000_000 })
    expect(getSavingsCumulativeInterest(it1, 2026, 3, get, '2026-01')).toBeCloseTo(30_000)
    expect(getSavingsCumulativeInterest(it1, 2027, 0, get, '2026-01')).toBeCloseTo(60_000)
  })
})

describe('getAssetFocusMonth', () => {
  it('21일까지는 이번 달, 22일부터는 다음 달', () => {
    expect(getAssetFocusMonth(new Date(2026, 8, 21))).toEqual({ year: 2026, monthIdx: 8, editableBoundary: 202608 })
    expect(getAssetFocusMonth(new Date(2026, 8, 22))).toEqual({ year: 2026, monthIdx: 9, editableBoundary: 202609 })
  })
  it('12월 22일 이후는 다음 해 1월', () => {
    expect(getAssetFocusMonth(new Date(2026, 11, 25))).toEqual({ year: 2027, monthIdx: 0, editableBoundary: 202700 })
  })
})

describe('getHouseholdFocusMonth', () => {
  it('25일 주기는 22일부터 다음 달', () => {
    expect(getHouseholdFocusMonth(new Date(2026, 8, 21), 25)).toMatchObject({ year: 2026, monthIdx: 8 })
    expect(getHouseholdFocusMonth(new Date(2026, 8, 22), 25)).toMatchObject({ year: 2026, monthIdx: 9 })
  })
  it('시작일 1(달력 월)은 말일까지 이번 달', () => {
    expect(getHouseholdFocusMonth(new Date(2026, 8, 30), 1)).toMatchObject({ year: 2026, monthIdx: 8 })
  })
  it('시작일이 다르면 그에 맞춰 3일 앞당김', () => {
    expect(getHouseholdFocusMonth(new Date(2026, 8, 7), 10)).toMatchObject({ monthIdx: 9 })
    expect(getHouseholdFocusMonth(new Date(2026, 8, 6), 10)).toMatchObject({ monthIdx: 8 })
  })
})

describe('투자 실현손익·예수금', () => {
  const realized = { 'a::2026-01': 100_000, 'a::2026-03': -30_000, 'a::2025-12': 50_000, 'b::2026-02': 999 }
  it('누적 실현손익은 해당 월까지, 항목별로 합산', () => {
    expect(getCumulativeRealized('a', 2026, 1, realized)).toBe(150_000)
    expect(getCumulativeRealized('a', 2026, 2, realized)).toBe(120_000)
  })
  it('올해 실현손익은 1월부터', () => {
    expect(getYtdRealized('a', 2026, 2, realized)).toBe(70_000)
  })
  it('예수금은 수익률 계산에서 제외', () => {
    const m = calcInvestMetrics({ balance: 12_000_000, cash: 2_000_000, unrealized: 500_000, realized: 300_000 })
    expect(m.holdings).toBe(10_000_000)
    expect(m.basis).toBe(9_500_000)
    expect(m.unrealizedPct).toBeCloseTo(5.263, 2)
    expect(m.totalProfit).toBe(800_000)
    expect(m.cashPct).toBeCloseTo(16.667, 2)
  })
  it('원금 0이면 수익률 null', () => {
    expect(calcInvestMetrics({ balance: 1000, cash: 1000, unrealized: 0, realized: 0 }).unrealizedPct).toBeNull()
  })
})
