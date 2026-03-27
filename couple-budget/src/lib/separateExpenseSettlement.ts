import type { Person } from '@/types'

/** 별도 지출 카드 행(고정지출 카드와 동일 필드) */
export type SeparateExpenseRowLike = {
  person: Person
  amount: number
  isSeparate?: boolean
  separatePerson?: 'A' | 'B'
}

/**
 * 별도 지출 카드에서 「실제로 낸 사람」(50:50 정산·통장 입금 보정용)
 * - person이 A/B면 해당 인원 부담
 * - 공금 + 별도 정산이면 separatePerson
 * - 그 외 공금은 separatePerson 없을 때 A로 간주
 */
export function payerForSeparateExpenseRow(r: SeparateExpenseRowLike): 'A' | 'B' {
  if (r.person === 'A' || r.person === 'B') return r.person
  if (r.isSeparate && r.separatePerson) return r.separatePerson
  return r.separatePerson ?? 'A'
}

/**
 * 별도 지출 카드 합계를 50:50으로 맞출 때,
 * 적게 낸 쪽이 많이 낸 쪽에게 보내는 금액 = |paidA − paidB| / 2 (반올림)
 */
export function computeSeparateExpenseCard5090(rows: SeparateExpenseRowLike[]) {
  const active = rows.filter((r) => (r.amount ?? 0) > 0)
  const total = active.reduce((s, r) => s + r.amount, 0)
  if (total <= 0) return null

  let paidA = 0
  let paidB = 0
  for (const r of active) {
    const p = payerForSeparateExpenseRow(r)
    if (p === 'A') paidA += r.amount
    else paidB += r.amount
  }

  const fairShareEach = Math.round(total / 2)
  const transferAmount = Math.round(Math.abs(paidA - paidB) / 2)

  let transferFrom: 'A' | 'B' | null = null
  let transferTo: 'A' | 'B' | null = null
  if (transferAmount > 0) {
    if (paidA < paidB) {
      transferFrom = 'A'
      transferTo = 'B'
    } else {
      transferFrom = 'B'
      transferTo = 'A'
    }
  }

  return {
    total,
    paidA,
    paidB,
    fairShareEach,
    transferAmount,
    transferFrom,
    transferTo,
  }
}
