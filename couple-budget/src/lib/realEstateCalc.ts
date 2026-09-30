/**
 * 부동산 세금·대출 계산 (화면과 분리 — 테스트 대상)
 * 세율·공제는 단순화된 근사치이며 조정대상지역·거주요건·단기보유 중과 등은 반영하지 않는다.
 */
import type { RepayType } from '@/store/useRealEstatePlanStore'

export function calcAcquisitionTax(price: number, homeCount: number): number {
  if (homeCount >= 3) return price * 0.12
  if (homeCount === 2) return price * 0.08
  if (price <= 600_000_000) return price * 0.01
  if (price <= 900_000_000) {
    // 6억 초과 9억 이하: 세율 = (취득가액[억원] × 2/3 − 3)%  (6억 1% → 9억 3%로 직선 증가)
    const rate = (price / 100_000_000 * 2 / 3 - 3) / 100
    return price * Math.max(0.01, Math.min(0.03, rate))
  }
  return price * 0.03
}

export function calcAgentFee(price: number): number {
  if (price < 50_000_000)       return Math.min(price * 0.006, 250_000)
  if (price < 200_000_000)      return Math.min(price * 0.005, 800_000)
  if (price < 900_000_000)      return price * 0.004
  if (price < 1_200_000_000)    return price * 0.005
  if (price < 1_500_000_000)    return price * 0.006
  return price * 0.007
}

export interface LoanResult {
  firstMonthPayment: number
  lastMonthPayment: number
  totalPayment: number
  totalInterest: number
  monthlyInterestOnly: number
}

export function calcLoan(principal: number, annualRate: number, termYears: number, type: RepayType): LoanResult | null {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return null
  const r = annualRate / 100 / 12
  const n = termYears * 12

  if (type === 'bullet') {
    const monthlyInterest = principal * r
    return {
      firstMonthPayment: monthlyInterest,
      lastMonthPayment: principal + monthlyInterest,
      totalPayment: principal + monthlyInterest * n,
      totalInterest: monthlyInterest * n,
      monthlyInterestOnly: monthlyInterest,
    }
  }
  if (type === 'equal-installment') {
    const factor = Math.pow(1 + r, n)
    const pmt = principal * r * factor / (factor - 1)
    return { firstMonthPayment: pmt, lastMonthPayment: pmt, totalPayment: pmt * n, totalInterest: pmt * n - principal, monthlyInterestOnly: 0 }
  }
  const principalPerMonth = principal / n
  const firstInterest = principal * r
  const lastInterest  = principalPerMonth * r
  const totalInterest = (firstInterest + lastInterest) * n / 2
  return {
    firstMonthPayment: principalPerMonth + firstInterest,
    lastMonthPayment:  principalPerMonth + lastInterest,
    totalPayment: principal + totalInterest,
    totalInterest,
    monthlyInterestOnly: 0,
  }
}

export function calcPropertyTax(assessed: number) {
  const base = assessed * 0.6
  let tax = 0
  if (base <= 60_000_000)       tax = base * 0.001
  else if (base <= 150_000_000) tax = 60_000 + (base - 60_000_000) * 0.0015
  else if (base <= 300_000_000) tax = 195_000 + (base - 150_000_000) * 0.0025
  else                          tax = 570_000 + (base - 300_000_000) * 0.004
  const city = base * 0.0014
  const edu  = tax * 0.2
  return { tax, city, edu, total: tax + city + edu }
}

export function calcComprehensiveTax(assessed: number, homeCount: number) {
  const threshold = homeCount === 1 ? 1_200_000_000 : 600_000_000
  if (assessed <= threshold) return null
  const base = (assessed - threshold) * 0.6
  const brackets = homeCount === 1
    ? [[300e6,0.005],[600e6,0.007],[1200e6,0.010],[2500e6,0.013],[5000e6,0.015],[9400e6,0.020],[Infinity,0.027]]
    : [[300e6,0.006],[600e6,0.010],[1200e6,0.013],[2500e6,0.014],[5000e6,0.016],[9400e6,0.021],[Infinity,0.028]]
  let ctax = 0, prev = 0
  for (const [lim, rate] of brackets) {
    if (base <= prev) break
    ctax += (Math.min(base, lim) - prev) * rate
    prev = lim
    if (base <= lim) break
  }
  const rural = ctax * 0.2
  return { ctax, rural, total: ctax + rural }
}

// ── 양도소득세 계산 ───────────────────────────────────────────

export function calcCapitalGainsTax(
  salePrice: number, acquirePrice: number, acquireCost: number,
  holdYears: number, isOneHome: boolean,
) {
  const gain = salePrice - acquirePrice - acquireCost
  if (gain <= 0) return { gain, taxable: 0, deductionRate: 0, tax: 0, localTax: 0, exempt: false }
  if (isOneHome && holdYears >= 2 && salePrice <= 1_200_000_000)
    return { gain, taxable: 0, deductionRate: 0, tax: 0, localTax: 0, exempt: true }
  let taxable = gain
  if (isOneHome && salePrice > 1_200_000_000)
    taxable = gain * (salePrice - 1_200_000_000) / salePrice
  let deductionRate = 0
  if (holdYears >= 3)
    // 1세대1주택: 보유 연 4% + 거주 연 4%(거주=보유로 가정) 최대 80% / 그 외: 연 2% (3년 6% ~ 15년 30%)
    deductionRate = isOneHome ? Math.min(holdYears * 0.08, 0.8) : Math.min(holdYears * 0.02, 0.3)
  taxable = Math.max(0, taxable * (1 - deductionRate) - 2_500_000)
  const brackets = [[14e6,0.06],[50e6,0.15],[88e6,0.24],[150e6,0.35],[300e6,0.38],[500e6,0.40],[1000e6,0.42],[Infinity,0.45]]
  let tax = 0, prev = 0
  for (const [lim, rate] of brackets) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, lim) - prev) * rate
    prev = lim
    if (taxable <= lim) break
  }
  return { gain, taxable, deductionRate, tax, localTax: tax * 0.1, exempt: false }
}

