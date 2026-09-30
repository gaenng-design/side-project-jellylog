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

/**
 * 별도 지출 카드를 「개인이 지불」한 항목과 「공금(공동 통장)」 항목으로 나눈다.
 * - 개인 지불(isSeparate): 낸 사람별 합 → 유저별 "내야할 돈"에 그대로 포함, 나머지는 50:50 송금 정산
 * - 공금(!isSeparate): 합계의 절반씩 자동 부담
 * 두 묶음은 서로 겹치지 않는다. (공금 항목을 '낸 사람'으로도 세면 같은 금액이 이중으로 잡힌다.)
 */
export function splitSeparateExpenseCard(rows: (SeparateExpenseRowLike & { isExcluded?: boolean })[]) {
  const active = rows.filter((r) => !r.isExcluded && (r.amount ?? 0) > 0)
  let personalPaidA = 0
  let personalPaidB = 0
  let fundTotal = 0
  for (const r of active) {
    if (r.isSeparate) {
      if (payerForSeparateExpenseRow(r) === 'A') personalPaidA += r.amount
      else personalPaidB += r.amount
    } else {
      fundTotal += r.amount
    }
  }
  return { personalPaidA, personalPaidB, fundTotal, fundHalf: Math.round(fundTotal / 2) }
}
