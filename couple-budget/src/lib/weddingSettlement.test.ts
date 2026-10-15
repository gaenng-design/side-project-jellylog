import { describe, it, expect } from 'vitest'
import { calcWeddingSettlement, type WeddingExpenseLike } from './weddingSettlement'

const ex = (amount: number, payer: 'A' | 'B', shareA = 50, paid = true): WeddingExpenseLike => ({ amount, payer, shareA, paid })

describe('calcWeddingSettlement', () => {
  it('균등 분담: A가 100 전액 결제하면 B가 50 송금', () => {
    const r = calcWeddingSettlement({ expenses: [ex(100, 'A')], gifts: [], splitMode: 'equal', giftMode: 'own' })
    expect(r.transfer).toEqual({ from: 'B', to: 'A', amount: 50 })
    expect(r.owedA).toBe(50)
  })
  it('항목별 비율: A 70% 부담, B가 결제 → A가 B에게 70', () => {
    const r = calcWeddingSettlement({ expenses: [ex(100, 'B', 70)], gifts: [], splitMode: 'item', giftMode: 'own' })
    expect(r.transfer).toEqual({ from: 'A', to: 'B', amount: 70 })
  })
  it('서로 상쇄: 각자 결제한 만큼 부담이면 정산 없음', () => {
    const r = calcWeddingSettlement({ expenses: [ex(100, 'A', 100), ex(100, 'B', 0)], gifts: [], splitMode: 'item', giftMode: 'own' })
    expect(r.transfer).toBeNull()
  })
  it('결제 전 항목은 정산에서 제외되고 예정 금액으로만 집계', () => {
    const r = calcWeddingSettlement({ expenses: [ex(100, 'A'), ex(200, 'B', 50, false)], gifts: [], splitMode: 'equal', giftMode: 'own' })
    expect(r.paidTotal).toBe(100)
    expect(r.unpaidTotal).toBe(200)
    expect(r.plannedTotal).toBe(300)
  })
  it('축의금 각자 보유(own): 송금액은 축의금과 무관, 최종 부담만 줄어듦', () => {
    const r = calcWeddingSettlement({ expenses: [ex(1000, 'A')], gifts: [{ side: 'A', amount: 300 }, { side: 'B', amount: 100 }], splitMode: 'equal', giftMode: 'own' })
    expect(r.transfer).toEqual({ from: 'B', to: 'A', amount: 500 })
    expect(r.netCostA).toBe(200)
    expect(r.netCostB).toBe(400)
  })
  it('축의금 합산(pooled): 합친 축의금으로 비용을 먼저 갚은 뒤 정산', () => {
    // 비용 1000(A 결제, 50:50), 축의금 A 300 / B 100 → 총 부담 600, 각 300
    // A는 1000 쓰고 300 받아 실제 700 → 300만 부담해야 하므로 B가 A에게 ... B는 100 받고 0 결제 → 실제 -100, 부담 300 → B가 400 송금
    const r = calcWeddingSettlement({ expenses: [ex(1000, 'A')], gifts: [{ side: 'A', amount: 300 }, { side: 'B', amount: 100 }], splitMode: 'equal', giftMode: 'pooled' })
    expect(r.netCostA).toBe(300)
    expect(r.netCostB).toBe(300)
    expect(r.transfer).toEqual({ from: 'B', to: 'A', amount: 400 })
  })
  it('기록만: 송금 없음', () => {
    const r = calcWeddingSettlement({ expenses: [ex(100, 'A')], gifts: [], splitMode: 'recordOnly', giftMode: 'own' })
    expect(r.transfer).toBeNull()
  })
})
