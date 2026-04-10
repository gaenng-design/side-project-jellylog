export type Person = 'A' | 'B' | '공금'

export interface Income {
  id: string
  yearMonth: string
  person: Exclude<Person, '공금'>
  category: string
  description: string
  amount: number
}

export interface FixedExpense {
  id: string
  yearMonth: string
  person: Person
  category: string
  description: string
  amount: number
  isSeparate?: boolean
  separatePerson?: 'A' | 'B'
  payDay?: number
}

export interface Investment {
  id: string
  yearMonth: string
  person: Person
  category: string
  description: string
  amount: number
}

/** `separate_items` 테이블 (정규화 스키마 + is_separate 등) */
export interface SeparateItem {
  id: string
  yearMonth: string
  person: Person
  category: string
  description?: string
  amount: number
  isSeparate?: boolean
  separatePerson?: 'A' | 'B'
}

export interface FixedTemplate {
  id: string
  person: Person
  category: string
  description: string
  defaultAmount: number
  order?: number
  personOrder?: number
  payDay?: number
  defaultSeparate?: boolean
  defaultSeparatePerson?: 'A' | 'B'
}

export interface InvestTemplate {
  id: string
  person: Person
  category: string
  description: string
  defaultAmount: number
  order?: number
  personOrder?: number
  payDay?: number
  maturityDate?: string
}

/** 자산 항목 (저축, 투자, 부동산, 주식 등) */
export interface AssetItem {
  id: string
  name: string
  category: string  // '저축' | '투자' | '부동산' | '주식' | '기타'
  order: number
  /** 지출 계획 투자·저축에서 자동 추가된 항목인지 여부 */
  source?: 'invest' | 'manual'
}

/** 특정 월의 자산 항목에 적립된 금액 */
export interface AssetEntry {
  id: string
  itemId: string
  yearMonth: string
  amount: number
}
