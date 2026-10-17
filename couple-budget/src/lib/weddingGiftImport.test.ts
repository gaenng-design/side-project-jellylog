import { describe, it, expect } from 'vitest'
import { parseGiftRows, parseAmountCell, normalizeRelation, normalizeSide, giftKey } from './weddingGiftImport'

const names = { A: '승윤', B: '경은' }

describe('parseAmountCell', () => {
  it('다양한 표기', () => {
    expect(parseAmountCell('100,000원')).toBe(100000)
    expect(parseAmountCell('10만')).toBe(100000)
    expect(parseAmountCell('10만원')).toBe(100000)
    expect(parseAmountCell('1.5만')).toBe(15000)
    expect(parseAmountCell(50000)).toBe(50000)
    expect(parseAmountCell('abc')).toBeNull()
    expect(parseAmountCell('')).toBeNull()
  })
})

describe('normalizeRelation / normalizeSide', () => {
  it('관계 자동 분류', () => {
    expect(normalizeRelation('고등학교 동창')).toBe('친구')
    expect(normalizeRelation('이모')).toBe('가족·친척')
    expect(normalizeRelation('회사 팀장님')).toBe('직장')
    expect(normalizeRelation('교회')).toBe('지인')
    expect(normalizeRelation('')).toBe('기타')
    expect(normalizeRelation('친구')).toBe('친구')
  })
  it('받은 쪽: 이름·측·A/B·신랑/신부', () => {
    expect(normalizeSide('승윤측', names)).toBe('A')
    expect(normalizeSide('경은', names)).toBe('B')
    expect(normalizeSide('신랑', names)).toBe('A')
    expect(normalizeSide('B', names)).toBe('B')
    expect(normalizeSide('몰라', names)).toBeNull()
  })
})

describe('parseGiftRows', () => {
  const rows = [
    ['받은 쪽', '이름', '관계', '금액', '참석', '답례', '메모'],
    ['(예시) 승윤', '(예시) 홍길동', '친구', 100000, 'O', 'X', ''],
    ['승윤측', '김철수', '대학 동기', '10만', 'O', '', '축하해'],
    ['경은', '이영희', '이모', 300000, 'X', 'O', ''],
    ['', '박민수', '회사', '5만원', '', '', ''],
    ['', '', '', '', '', '', ''],
    ['경은', '최금액없음', '친구', '', '', '', ''],
  ]
  const r = parseGiftRows(rows, names)
  it('예시·빈 줄은 건너뜀', () => {
    expect(r.map((x) => x.name)).toEqual(['김철수', '이영희', '박민수', '최금액없음'])
  })
  it('자동 분류와 금액', () => {
    expect(r[0]).toMatchObject({ side: 'A', relation: '친구', amount: 100000, attended: true, returned: false, memo: '축하해', row: 3 })
    expect(r[1]).toMatchObject({ side: 'B', relation: '가족·친척', attended: false, returned: true })
    expect(r[2]).toMatchObject({ side: null, relation: '직장', amount: 50000 })
  })
  it('경고', () => {
    expect(r[2].warnings.join()).toContain('받은 쪽')
    expect(r[3].warnings.join()).toContain('금액')
  })
  it('머리글이 없으면 양식 순서로 읽음', () => {
    const x = parseGiftRows([['승윤', '가나다', '친구', 70000]], names)
    expect(x[0]).toMatchObject({ side: 'A', name: '가나다', amount: 70000 })
  })
  it('열 순서가 달라도 머리글로 찾음', () => {
    const x = parseGiftRows([['이름', '금액', '받은쪽'], ['라마바', '20만원', '경은측']], names)
    expect(x[0]).toMatchObject({ side: 'B', name: '라마바', amount: 200000 })
  })
  it('중복 키', () => {
    expect(giftKey('A', '김 철수', 100000)).toBe(giftKey('A', '김철수', 100000))
  })
})
