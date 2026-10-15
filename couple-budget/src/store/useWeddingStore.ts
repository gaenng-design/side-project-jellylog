import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { GiftMode, Side, SplitMode } from '@/lib/weddingSettlement'

export const WEDDING_CATEGORIES = ['예식장', '스드메', '예물·예단', '혼수·가전', '신혼여행', '청첩장·답례품', '한복·예복', '기타'] as const
export const GIFT_RELATIONS = ['가족·친척', '친구', '직장', '지인', '기타'] as const

export interface WeddingExpense {
  id: string
  category: string
  name: string
  /** 금액 (예정 금액 또는 결제한 금액) */
  amount: number
  /** 이 항목의 예산 (선택) */
  budget?: number
  /** 결제 완료 여부 — 정산은 결제 완료 항목만 대상 */
  paid: boolean
  /** 결제한 쪽 */
  payer: Side
  /** A측 부담 % (항목별 분담 방식에서 사용, 기본 50) */
  shareA: number
  /** 결제(예정)일 YYYY-MM-DD */
  date?: string
  memo?: string
}

export interface WeddingGift {
  id: string
  /** 받은 쪽 (A측 / B측 지인) */
  side: Side
  name: string
  relation: string
  amount: number
  attended?: boolean
  memo?: string
  /** 답례(식사·답례품 등) 완료 */
  returned?: boolean
}

export interface WeddingSettings {
  weddingDate?: string
  totalBudget: number
  splitMode: SplitMode
  giftMode: GiftMode
}

interface WeddingState {
  settings: WeddingSettings
  expenses: WeddingExpense[]
  gifts: WeddingGift[]
  updateSettings: (patch: Partial<WeddingSettings>) => void
  addExpense: (e: Omit<WeddingExpense, 'id'>) => void
  updateExpense: (id: string, patch: Partial<Omit<WeddingExpense, 'id'>>) => void
  removeExpense: (id: string) => void
  addGift: (g: Omit<WeddingGift, 'id'>) => void
  updateGift: (id: string, patch: Partial<Omit<WeddingGift, 'id'>>) => void
  removeGift: (id: string) => void
}

let _id = Date.now()
const uid = (p: string) => `${p}-${_id++}`

export const useWeddingStore = create<WeddingState>()(
  persist(
    (set) => ({
      settings: { totalBudget: 0, splitMode: 'item', giftMode: 'own' },
      expenses: [],
      gifts: [],
      updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),
      addExpense: (e) => set((s) => ({ expenses: [...s.expenses, { ...e, id: uid('wx') }] })),
      updateExpense: (id, patch) => set((s) => ({ expenses: s.expenses.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeExpense: (id) => set((s) => ({ expenses: s.expenses.filter((x) => x.id !== id) })),
      addGift: (g) => set((s) => ({ gifts: [...s.gifts, { ...g, id: uid('wg') }] })),
      updateGift: (id, patch) => set((s) => ({ gifts: s.gifts.map((x) => (x.id === id ? { ...x, ...patch } : x)) })),
      removeGift: (id) => set((s) => ({ gifts: s.gifts.filter((x) => x.id !== id) })),
    }),
    {
      name: 'couple-budget:wedding',
      partialize: (s) => ({ settings: s.settings, expenses: s.expenses, gifts: s.gifts }),
    },
  ),
)
