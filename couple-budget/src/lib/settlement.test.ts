import { describe, it, expect } from 'vitest'
import { calcSettlementSummary, getSharedLivingByPerson } from './calcSettlementSummary'
import { computeSeparateExpenseCard5090, splitSeparateExpenseCard } from './separateExpenseSettlement'
import { getCycleRange, getCycleKeyForDate, getEntryDisplayDate } from './sharedExpenseCycle'

describe('별도 지출 카드 분리 (개인 지불 vs 공금)', () => {
  const may = [
    { person: '공금' as const, amount: 1982830, isSeparate: true, separatePerson: 'A' as const },
    { person: '공금' as const, amount: 414140, isSeparate: true, separatePerson: 'B' as const },
    { person: '공금' as const, amount: 658372, isSeparate: false },
  ]
  it('공금 항목은 낸 사람 합에 들어가지 않는다 (이중 계산 방지)', () => {
    const r = splitSeparateExpenseCard(may)
    expect(r.personalPaidA).toBe(1982830)
    expect(r.personalPaidB).toBe(414140)
    expect(r.fundTotal).toBe(658372)
    expect(r.fundHalf).toBe(329186)
  })
  it('두 사람의 부담 합이 카드 총액과 같다 (홀수 원 1원 오차 이내)', () => {
    const r = splitSeparateExpenseCard(may)
    const total = may.reduce((s, x) => s + x.amount, 0)
    expect(Math.abs(r.personalPaidA + r.personalPaidB + 2 * r.fundHalf - total)).toBeLessThanOrEqual(1)
  })
  it('제외된 항목은 무시', () => {
    const r = splitSeparateExpenseCard([...may, { person: '공금' as const, amount: 999999, isSeparate: false, isExcluded: true }])
    expect(r.fundTotal).toBe(658372)
  })
  it('50:50 송금: 적게 낸 쪽이 차액의 절반을 보낸다', () => {
    const r = computeSeparateExpenseCard5090(may.filter((x) => x.isSeparate))!
    expect(r.transferFrom).toBe('B')
    expect(r.transferTo).toBe('A')
    expect(r.transferAmount).toBe(Math.round((1982830 - 414140) / 2))
  })
})

describe('공동 생활비 분담', () => {
  it('50:50은 합이 항상 원금과 같다 (홀수)', () => {
    const r = getSharedLivingByPerson(100001, { sharedLivingCostRatioMode: '50:50' }, { A: 1, B: 1 })
    expect(r.A + r.B).toBe(100001)
  })
  it('소득 비례', () => {
    const r = getSharedLivingByPerson(1_000_000, { sharedLivingCostRatioMode: 'income' }, { A: 3_000_000, B: 1_000_000 })
    expect(r).toEqual({ A: 750000, B: 250000 })
  })
  it('소득이 0이면 50:50, 비용이 0이면 0', () => {
    expect(getSharedLivingByPerson(1000, { sharedLivingCostRatioMode: 'income' }, { A: 0, B: 0 })).toEqual({ A: 500, B: 500 })
    expect(getSharedLivingByPerson(0, {}, { A: 1, B: 1 })).toEqual({ A: 0, B: 0 })
  })
  it('직접 비율', () => {
    const r = getSharedLivingByPerson(1000, { sharedLivingCostRatioMode: 'custom', sharedLivingCostRatio: [70, 30] }, { A: 0, B: 0 })
    expect(r).toEqual({ A: 700, B: 300 })
  })
})

describe('정산 요약', () => {
  const base = {
    totalIncome: 8_000_000,
    incomeByPerson: { A: 5_000_000, B: 3_000_000 },
    totalFixed: 2_000_000,
    fixedRegularTotal: 2_000_000,
    fixedSeparateTotal: 0,
    fixedDepositByUser: { A: 1_000_000, B: 1_000_000 },
    totalInvest: 1_000_000,
    investByPerson: { A: 600_000, B: 400_000 },
    investByCategoryByPerson: { A: { 투자: 600000, 저축: 0 }, B: { 투자: 400000, 저축: 0 } },
    investLinesByCategoryByPerson: { A: { 투자: [], 저축: [] }, B: { 투자: [], 저축: [] } },
  }
  it('용돈 = 소득 − 고정지출 절반 − 공동생활비 몫 − 투자', () => {
    const r = calcSettlementSummary(base, { sharedLivingCost: 1_000_000, sharedLivingCostRatioMode: '50:50' })
    expect(r.allowanceByPerson.A).toBe(5_000_000 - 1_000_000 - 500_000 - 600_000)
    expect(r.allowanceByPerson.B).toBe(3_000_000 - 1_000_000 - 500_000 - 400_000)
  })
  it('공금 별도지출: 유저별 합계에 절반씩만 더해진다', () => {
    const split = splitSeparateExpenseCard([{ person: '공금', amount: 110591, isSeparate: false }])
    const r = calcSettlementSummary(
      { ...base, separateByUser: { A: split.personalPaidA, B: split.personalPaidB }, sharedFundExpenseTotal: split.fundTotal, sharedFundExpenseHalf: split.fundHalf },
      { sharedLivingCost: 0 },
    )
    const noFund = calcSettlementSummary(base, { sharedLivingCost: 0 })
    expect(r.userSummary.A.total - noFund.userSummary.A.total).toBe(55296)
    expect(r.userSummary.B.total - noFund.userSummary.B.total).toBe(55296)
  })
})

describe('공동 생활비 사이클', () => {
  it('25일 시작: 2026-07 사이클 = 6/25 ~ 7/24', () => {
    const c = getCycleRange('2026-07', 25)
    expect(c.startLabel).toBe('6/25')
    expect(c.endLabel).toBe('7/24')
  })
  it('1월 사이클은 전년 12월에서 시작', () => {
    const c = getCycleRange('2026-01', 25)
    expect(c.startDate.getFullYear()).toBe(2025)
    expect(c.startDate.getMonth()).toBe(11)
  })
  it('시작일 31일 + 2월은 말일로 클램프', () => {
    const c = getCycleRange('2026-03', 31)
    expect(c.startLabel).toBe('2/28')
  })
  it('모든 날짜는 자기 사이클 범위 안에 속한다', () => {
    for (const startDay of [1, 10, 25, 31]) {
      for (let d = new Date(2026, 0, 1); d.getFullYear() === 2026; d = new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)) {
        const key = getCycleKeyForDate(d.getFullYear(), d.getMonth(), d.getDate(), startDay)
        const range = getCycleRange(key, startDay)
        const t = new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime()
        expect(t >= range.startDate.getTime() && t <= range.endDate.getTime()).toBe(true)
      }
    }
  })
  it('표시 날짜 왕복', () => {
    const key = getCycleKeyForDate(2026, 5, 27, 25)
    expect(key).toBe('2026-07')
    expect(getEntryDisplayDate(key, 27, 25)).toEqual({ year: 2026, monthIdx: 5, day: 27 })
  })
})
