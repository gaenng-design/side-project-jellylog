/**
 * 축의금 엑셀 가져오기 — 양식 파일의 표를 읽어 받는 쪽·관계·금액을 자동으로 정리한다.
 * 화면과 분리한 순수 함수 (SheetJS 가 만든 2차원 배열을 입력으로 받는다).
 */
import type { Side } from './weddingSettlement'

export const GIFT_RELATION_LIST = ['가족·친척', '친구', '직장', '지인', '기타'] as const

export interface ParsedGift {
  /** 엑셀 행 번호 (1부터, 머리글 포함) */
  row: number
  name: string
  /** 인식하지 못하면 null — 화면에서 기본값을 고르게 한다 */
  side: Side | null
  relation: string
  amount: number
  attended: boolean
  returned: boolean
  memo?: string
  warnings: string[]
}

const norm = (v: unknown) => String(v ?? '').replace(/\s+/g, '').toLowerCase()

/** 열 머리글 별칭 */
const HEADERS: Record<'side' | 'name' | 'relation' | 'amount' | 'attended' | 'returned' | 'memo', string[]> = {
  side: ['받은쪽', '받은사람', '구분', '측', '쪽', '신랑신부', '대상'],
  name: ['이름', '성함', '성명', '보낸분', '보낸사람'],
  relation: ['관계', '분류', '구분2'],
  amount: ['금액', '축의금', '축의금액', '액수', '부조금'],
  attended: ['참석', '참석여부', '식사'],
  returned: ['답례', '답례여부', '답례완료'],
  memo: ['메모', '비고', '기타'],
}

/** 받은 쪽 정규화 — 설정의 유저 이름(+측), A/B, 1/2, 신랑/신부 모두 허용 */
export function normalizeSide(raw: unknown, names: { A: string; B: string }): Side | null {
  const v = norm(raw).replace(/측$/, '')
  if (!v) return null
  const a = norm(names.A).replace(/측$/, '')
  const b = norm(names.B).replace(/측$/, '')
  if (v === a || ['a', '1', '유저1', '신랑', '남', '남자', '신랑측'].includes(v)) return 'A'
  if (v === b || ['b', '2', '유저2', '신부', '여', '여자', '신부측'].includes(v)) return 'B'
  return null
}

/** 관계 자동 분류 */
export function normalizeRelation(raw: unknown): string {
  const v = norm(raw)
  if (!v) return '기타'
  const exact = GIFT_RELATION_LIST.find((r) => norm(r) === v)
  if (exact) return exact
  if (/가족|친척|부모|아버지|어머니|형제|자매|누나|오빠|언니|동생|사촌|이모|고모|삼촌|외삼촌|조부|조모|할머니|할아버지/.test(v)) return '가족·친척'
  if (/친구|동창|동기|고등|대학|학교|절친|초등|중학/.test(v)) return '친구'
  if (/직장|회사|동료|상사|부장|팀장|대리|거래|사무실|선배|후배/.test(v)) return '직장'
  if (/지인|이웃|교회|성당|동호회|모임|아는/.test(v)) return '지인'
  return '기타'
}

/** 금액 파싱 — 100,000 / 100000원 / 10만 / 10만원 / 1.5만 */
export function parseAmountCell(v: unknown): number | null {
  if (typeof v === 'number') return Number.isFinite(v) ? Math.round(v) : null
  const s = String(v ?? '').replace(/[,\s원₩]/g, '')
  if (!s) return null
  const man = /^(\d+(?:\.\d+)?)만$/.exec(s)
  if (man) return Math.round(parseFloat(man[1]) * 10000)
  const manPlus = /^(\d+)만(\d+)$/.exec(s)
  if (manPlus) return parseInt(manPlus[1], 10) * 10000 + parseInt(manPlus[2], 10)
  if (/^\d+(\.\d+)?$/.test(s)) return Math.round(parseFloat(s))
  return null
}

export function parseBoolCell(v: unknown, fallback: boolean): boolean {
  const s = norm(v)
  if (!s) return fallback
  if (['o', 'ㅇ', 'y', 'yes', 'true', '1', '참석', '완료', '답례완료', '예', '✓', '✔'].includes(s)) return true
  if (['x', 'ㅌ', 'n', 'no', 'false', '0', '불참', '미완료', '안함', '아니오', '아니요', '미참석'].includes(s)) return false
  return fallback
}

/** 머리글 행을 찾아 열 위치를 매핑. 머리글이 없으면 양식 기본 순서를 가정 */
function mapColumns(rows: unknown[][]): { headerRow: number; col: Partial<Record<keyof typeof HEADERS, number>> } {
  for (let r = 0; r < Math.min(rows.length, 10); r++) {
    const cells = rows[r].map(norm)
    if (!cells.includes('이름') && !cells.some((c) => HEADERS.name.includes(c))) continue
    const col: Partial<Record<keyof typeof HEADERS, number>> = {}
    cells.forEach((c, i) => {
      for (const key of Object.keys(HEADERS) as (keyof typeof HEADERS)[]) {
        if (col[key] === undefined && HEADERS[key].includes(c)) col[key] = i
      }
    })
    return { headerRow: r, col }
  }
  return { headerRow: -1, col: { side: 0, name: 1, relation: 2, amount: 3, attended: 4, returned: 5, memo: 6 } }
}

export function parseGiftRows(rows: unknown[][], names: { A: string; B: string }): ParsedGift[] {
  const { headerRow, col } = mapColumns(rows)
  const out: ParsedGift[] = []
  for (let r = headerRow + 1; r < rows.length; r++) {
    const cells = rows[r] ?? []
    const get = (k: keyof typeof HEADERS) => (col[k] === undefined ? undefined : cells[col[k]!])
    const name = String(get('name') ?? '').trim()
    const rawAmount = get('amount')
    if (!name && (rawAmount === undefined || rawAmount === '')) continue // 빈 줄
    if (name.startsWith('(예시)')) continue // 양식의 예시 줄

    const warnings: string[] = []
    const amount = parseAmountCell(rawAmount)
    if (!name) warnings.push('이름이 없어요')
    if (amount === null) warnings.push('금액을 읽지 못했어요')
    else if (amount <= 0) warnings.push('금액이 0원이에요')
    const rawSide = get('side')
    const side = normalizeSide(rawSide, names)
    if (side === null) warnings.push(String(rawSide ?? '').trim() ? `받은 쪽을 알 수 없어요 (${String(rawSide).trim()})` : '받은 쪽이 비어 있어요')
    const rawRel = get('relation')
    const relation = normalizeRelation(rawRel)
    const memo = String(get('memo') ?? '').trim()

    out.push({
      row: r + 1,
      name,
      side,
      relation,
      amount: amount ?? 0,
      attended: parseBoolCell(get('attended'), true),
      returned: parseBoolCell(get('returned'), false),
      memo: memo || undefined,
      warnings,
    })
  }
  return out
}

/** 중복 판정 키 (받은 쪽·이름·금액) */
export const giftKey = (side: Side | null, name: string, amount: number) => `${side ?? '?'}|${name.replace(/\s+/g, '')}|${amount}`
