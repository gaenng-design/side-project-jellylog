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
