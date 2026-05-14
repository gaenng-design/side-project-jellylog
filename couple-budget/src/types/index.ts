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
  /** 계좌번호 (선택). 별도 정산 시 송금받을 계좌 안내용 */
  accountNumber?: string
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
  /** 명의 (없으면 공유) */
  person?: 'A' | 'B'
  order: number
  /** 초기 잔액 (처음 등록 시 이미 보유한 금액) */
  initialAmount?: number
  /** 정기입금액(선택사항) */
  defaultAmount?: number
  /** 묶인 돈 표시 (예: 적금/예금처럼 만기까지 묶여 있는 자산) */
  locked?: boolean
}

/** 특정 월의 자산 항목에 적립된 금액 */
export interface AssetEntry {
  id: string
  itemId: string
  yearMonth: string
  amount: number
}

/** 공동 생활비 항목 (식비, 공과금, 교통비 등) */
export interface SharedExpenseItem {
  id: string
  name: string
  category: string  // '식비' | '공과금' | '교통비' | '통신비' | '의료비' | '교육비' | '기타'
  order: number
  /** 메모 (선택) */
  description?: string
}

/** 특정 월의 공동 생활비 사용 금액 (거래 단위) */
export interface SharedExpenseEntry {
  id: string
  itemId: string
  yearMonth: string
  /** 결제일 (1-31, 선택) */
  day?: number
  amount: number
  /** 결제 메모 (선택, 예: "주말 외식", "5월분 카드") */
  memo?: string
}
