import { describe, it, expect } from 'vitest'
import { calcAcquisitionTax, calcAgentFee, calcLoan, calcPropertyTax, calcComprehensiveTax, calcCapitalGainsTax } from './realEstateCalc'

describe('취득세', () => {
  it('6억 이하 1주택 1%', () => expect(calcAcquisitionTax(500_000_000, 1)).toBe(5_000_000))
  it('6억 경계 = 1%, 9억 경계 = 3% (연속)', () => {
    expect(calcAcquisitionTax(600_000_000, 1)).toBeCloseTo(6_000_000, 0)
    expect(calcAcquisitionTax(900_000_000, 1)).toBeCloseTo(27_000_000, 0)
  })
  it('6억 초과 9억 이하는 (가액[억]×2/3−3)% — 7.5억이면 2%', () => {
    expect(calcAcquisitionTax(750_000_000, 1)).toBeCloseTo(15_000_000, 0)
  })
  it('세율은 가액이 오를수록 줄지 않는다', () => {
    let prev = 0
    for (let p = 500_000_000; p <= 1_000_000_000; p += 10_000_000) {
      const rate = calcAcquisitionTax(p, 1) / p
      expect(rate).toBeGreaterThanOrEqual(prev - 1e-12)
      prev = rate
    }
  })
  it('다주택 중과', () => {
    expect(calcAcquisitionTax(500_000_000, 2)).toBe(40_000_000)
    expect(calcAcquisitionTax(500_000_000, 3)).toBe(60_000_000)
  })
})

describe('중개보수', () => {
  it('구간별 요율과 한도', () => {
    expect(calcAgentFee(40_000_000)).toBe(240_000)
    expect(calcAgentFee(100_000_000)).toBe(500_000)
    expect(calcAgentFee(190_000_000)).toBe(800_000)
    expect(calcAgentFee(500_000_000)).toBe(2_000_000)
    expect(calcAgentFee(1_000_000_000)).toBe(5_000_000)
    expect(calcAgentFee(2_000_000_000)).toBe(14_000_000)
  })
})

describe('대출', () => {
  it('원리금균등: 3억·연 4%·30년 월 상환액 ≈ 1,432,246원', () => {
    const r = calcLoan(300_000_000, 4, 30, 'equal-installment')!
    expect(Math.round(r.firstMonthPayment)).toBe(1_432_246)
    expect(r.totalPayment).toBeCloseTo(r.firstMonthPayment * 360, 0)
    expect(r.totalInterest).toBeCloseTo(r.totalPayment - 300_000_000, 0)
  })
  it('원금균등: 첫 달 > 마지막 달, 총이자 = 원금×월이율×(n+1)/2', () => {
    const r = calcLoan(120_000_000, 6, 10, 'equal-principal')!
    expect(r.firstMonthPayment).toBeGreaterThan(r.lastMonthPayment)
    expect(r.totalInterest).toBeCloseTo(120_000_000 * 0.005 * (120 + 1) / 2, 0)
  })
  it('만기일시: 매월 이자만, 마지막 달 원금 포함', () => {
    const r = calcLoan(100_000_000, 3, 5, 'bullet')!
    expect(r.firstMonthPayment).toBeCloseTo(250_000, 0)
    expect(r.lastMonthPayment).toBeCloseTo(100_250_000, 0)
  })
  it('값이 0이면 null', () => expect(calcLoan(0, 4, 30, 'equal-installment')).toBeNull())
})

describe('보유세', () => {
  it('재산세: 공시가 3억 = 과표 1.8억', () => {
    const r = calcPropertyTax(300_000_000)
    expect(r.tax).toBeCloseTo(195_000 + (180_000_000 - 150_000_000) * 0.0025, 0)
    expect(r.edu).toBeCloseTo(r.tax * 0.2, 0)
  })
  it('종부세: 1주택 12억 이하 비과세', () => expect(calcComprehensiveTax(1_200_000_000, 1)).toBeNull())
})

describe('양도소득세', () => {
  it('1세대1주택 2년 보유·12억 이하 비과세', () => {
    expect(calcCapitalGainsTax(1_000_000_000, 600_000_000, 10_000_000, 3, true).exempt).toBe(true)
  })
  it('손해면 세금 0', () => expect(calcCapitalGainsTax(500_000_000, 600_000_000, 0, 5, false).tax).toBe(0))
  it('일반 보유기간 공제: 3년 6%, 15년 이상 30%', () => {
    expect(calcCapitalGainsTax(800_000_000, 500_000_000, 0, 3, false).deductionRate).toBeCloseTo(0.06, 6)
    expect(calcCapitalGainsTax(800_000_000, 500_000_000, 0, 20, false).deductionRate).toBeCloseTo(0.3, 6)
  })
  it('세율표 계산: 과세표준 1억 = 1,400만×6% + 3,600만×15% + 3,800만×24% + 1,200만×35%', () => {
    // gain = 1억 + 250만 (기본공제) 이 되도록, 공제 없는 2년 보유 다주택
    const r = calcCapitalGainsTax(700_000_000, 600_000_000 - 2_500_000, 0, 2, false)
    expect(r.taxable).toBeCloseTo(100_000_000, 0)
    expect(r.tax).toBeCloseTo(14e6 * 0.06 + 36e6 * 0.15 + 38e6 * 0.24 + 12e6 * 0.35, 0)
    expect(r.localTax).toBeCloseTo(r.tax * 0.1, 0)
  })
})
