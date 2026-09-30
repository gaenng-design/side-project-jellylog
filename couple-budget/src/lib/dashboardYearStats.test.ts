import { describe, it, expect } from 'vitest'
import type { FixedTemplate } from '@/types'
import { buildMonthlyFlow, buildYearFixedItemBreakdown, monthlySeparateTotal } from './dashboardYearStats'

const tpl = (id: string, category: string, description: string, defaultAmount: number): FixedTemplate => ({
  id, person: '공금', category, description, defaultAmount,
})

describe('buildMonthlyFlow', () => {
  it('남는 돈과 저축률', () => {
    const f = buildMonthlyFlow({ income: 5_000_000, fixed: 1_500_000, separate: 300_000, living: 1_000_000, invest: 1_000_000 })
    expect(f.spending).toBe(2_800_000)
    expect(f.leftover).toBe(1_200_000)
    expect(f.savingRate).toBe(20)
    expect(f.empty).toBe(false)
  })
  it('수입 0이면 저축률 null, 전부 0이면 empty', () => {
    expect(buildMonthlyFlow({ income: 0, fixed: 0, separate: 0, living: 0, invest: 0 })).toMatchObject({ savingRate: null, empty: true })
  })
})

describe('buildYearFixedItemBreakdown', () => {
  const templates = [tpl('a', '주거', '월세', 500_000), tpl('b', '통신', '휴대폰', 100_000)]
  const started = ['2026-01', '2026-02']
  it('항목별 연 합계·월별·비율, 제외·월별 금액·추가 행 반영', () => {
    const rows = buildYearFixedItemBreakdown(
      2026, started, {}, templates,
      (id, ym) => (id === 'a' && ym === '2026-02' ? 550_000 : undefined),
      (id, ym) => id === 'b' && ym === '2026-02',
      { '2026-02': { fixed: [{ category: '통신', description: '휴대폰', amount: 20_000 }] } },
    )
    expect(rows[0]).toMatchObject({ name: '월세', amount: 1_050_000 })
    expect(rows[0].monthly.slice(0, 3)).toEqual([500_000, 550_000, 0])
    const phone = rows.find((r) => r.name === '휴대폰')!
    expect(phone.amount).toBe(120_000) // 1월 100,000 + 2월 추가 행 20,000 (템플릿은 2월 제외)
    expect(rows.reduce((s, r) => s + r.pct, 0)).toBeCloseTo(100)
  })
  it('시작하지 않은 달은 집계하지 않음', () => {
    expect(buildYearFixedItemBreakdown(2026, [], {}, templates, () => undefined, () => false, {})).toEqual([])
  })
})

describe('monthlySeparateTotal', () => {
  it('시작한 달만 합산', () => {
    const rows = { '2026-03': [{ amount: 100 }, { amount: 50 }] }
    expect(monthlySeparateTotal('2026-03', ['2026-03'], rows)).toBe(150)
    expect(monthlySeparateTotal('2026-03', [], rows)).toBe(0)
  })
})
