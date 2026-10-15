/**
 * 결혼식 정산 계산 — 화면과 분리한 순수 함수.
 *
 * 용어
 * - A측 / B측: 유저1·유저2 (각자 가족 자금 포함)
 * - 부담 비율(shareA): 비용 항목을 A측이 몇 % 부담하는지 (나머지는 B측)
 * - 정산은 "결제 완료"된 항목만 대상으로 한다 (예정 항목은 예상 금액으로만 보여줌)
 */
export type Side = 'A' | 'B'
export type SplitMode = 'item' | 'equal' | 'recordOnly'
/** own: 각자 받은 축의금은 각자 가짐 / pooled: 축의금을 합쳐 비용에서 먼저 차감한 뒤 정산 */
export type GiftMode = 'own' | 'pooled'

export interface WeddingExpenseLike {
  amount: number
  paid: boolean
  payer: Side
  /** A측 부담 % (0~100). 'item' 방식에서만 사용 */
  shareA: number
}

export interface WeddingGiftLike {
  side: Side
  amount: number
}

export interface WeddingSettlement {
  /** 전체 비용 (예정 포함) */
  plannedTotal: number
  /** 결제 완료 비용 */
  paidTotal: number
  /** 아직 결제 전 비용 */
  unpaidTotal: number
  /** 측별 실제 결제액 (결제 완료 기준) */
  paidA: number
  paidB: number
  /** 측별 부담해야 할 금액 (결제 완료 기준) */
  owedA: number
  owedB: number
  giftA: number
  giftB: number
  giftTotal: number
  /** 축의금 반영 후 최종 부담 */
  netCostA: number
  netCostB: number
  /** 정산 송금: from 이 to 에게 amount 를 보낸다. 정산할 게 없으면 null */
  transfer: { from: Side; to: Side; amount: number } | null
}

const ratioA = (e: WeddingExpenseLike, mode: SplitMode) => (mode === 'equal' ? 0.5 : Math.min(100, Math.max(0, e.shareA)) / 100)

export function calcWeddingSettlement(input: {
  expenses: WeddingExpenseLike[]
  gifts: WeddingGiftLike[]
  splitMode: SplitMode
  giftMode: GiftMode
}): WeddingSettlement {
  const { expenses, gifts, splitMode, giftMode } = input
  const plannedTotal = expenses.reduce((s, e) => s + e.amount, 0)
  const settled = expenses.filter((e) => e.paid)
  const paidTotal = settled.reduce((s, e) => s + e.amount, 0)

  const paidA = settled.filter((e) => e.payer === 'A').reduce((s, e) => s + e.amount, 0)
  const paidB = paidTotal - paidA
  const owedA = Math.round(settled.reduce((s, e) => s + e.amount * ratioA(e, splitMode), 0))
  const owedB = paidTotal - owedA

  const giftA = gifts.filter((g) => g.side === 'A').reduce((s, g) => s + g.amount, 0)
  const giftB = gifts.filter((g) => g.side === 'B').reduce((s, g) => s + g.amount, 0)
  const giftTotal = giftA + giftB

  // 축의금 몫: own = 받은 사람 몫 그대로, pooled = 부담 비율대로 나눠 차감
  const shareOfOwed = paidTotal > 0 ? owedA / paidTotal : 0.5
  const giftShareA = giftMode === 'own' ? giftA : giftTotal * shareOfOwed
  const giftShareB = giftMode === 'own' ? giftB : giftTotal - giftShareA
  const netCostA = Math.round(owedA - giftShareA)
  const netCostB = Math.round(owedB - giftShareB)

  let transfer: WeddingSettlement['transfer'] = null
  if (splitMode !== 'recordOnly') {
    // 실제로 A가 쓴 돈(결제 − 받은 축의금) 과 A가 내야 할 돈(부담 − 축의금 몫)의 차이
    const actualA = paidA - giftA
    const diff = Math.round(netCostA - actualA)
    if (diff > 0) transfer = { from: 'A', to: 'B', amount: diff }
    else if (diff < 0) transfer = { from: 'B', to: 'A', amount: -diff }
  }

  return {
    plannedTotal, paidTotal, unpaidTotal: plannedTotal - paidTotal,
    paidA, paidB, owedA, owedB, giftA, giftB, giftTotal, netCostA, netCostB, transfer,
  }
}
