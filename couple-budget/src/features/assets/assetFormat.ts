/** 자산 탭 공용 표기 규칙 */
export const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']

/** 만원 단위 값을 억이 넘으면 "N억 N,NNN만" 형식으로 표기 */
export const fmtMan = (manWon: number): string => {
  const abs = Math.abs(manWon)
  const sign = manWon < 0 ? '-' : ''
  if (abs >= 10000) {
    const eok = Math.floor(abs / 10000)
    const man = abs % 10000
    return sign + eok.toLocaleString('ko-KR') + '억' + (man > 0 ? ' ' + man.toLocaleString('ko-KR') + '만' : '')
  }
  return sign + abs.toLocaleString('ko-KR') + '만'
}
/** 원 단위 전체 표기 (예: 1,234,000원) */
export const fmtSum = (n: number) => n.toLocaleString('ko-KR') + '원'

/** 원 금액 → 만원 반올림 표기 (예: 12,345,678 → "1,235만원") */
export const fmtWonAsMan = (won: number): string => `${fmtMan(Math.round(won / 10000))}원`

/** 부호 포함 만원 표기 (0이면 '—') */
export const fmtSignedMan = (won: number): string =>
  won === 0 ? '—' : `${won > 0 ? '+' : ''}${fmtWonAsMan(won)}`

export type SavingsType = 'installment' | 'deposit' | 'checking' | 'subscription'
export const SAVINGS_TYPES: SavingsType[] = ['installment', 'deposit', 'checking', 'subscription']

/** 저축 종류 라벨 (값이 없으면 적금) */
export function savingsTypeLabel(type?: SavingsType): string {
  if (type === 'deposit') return '예금'
  if (type === 'checking') return '입출금'
  if (type === 'subscription') return '청약'
  return '적금'
}
