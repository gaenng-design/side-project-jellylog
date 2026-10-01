import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AssetItem, AssetEntry } from '@/types'

let _id = Date.now()
const uid = () => `asset-${_id++}`

export const ASSET_CATEGORIES = ['저축', '투자', '부동산']

interface AssetState {
  items: AssetItem[]
  entries: AssetEntry[]
  /** 투자 항목 납입원금 월별 기록 (key: itemId::yearMonth) */
  costBasisEntries: Record<string, number>
  /** 투자 항목 예수금(계좌 안 현금) 월별 기록 (key: itemId::yearMonth). 총 잔고 = 주식 평가금 + 예수금 */
  cashEntries: Record<string, number>
  /** 투자 항목 월별 실현손익(매도로 확정된 손익, 음수 가능) (key: itemId::yearMonth). 누적해서 쓴다 */
  realizedEntries: Record<string, number>
  setCashEntry: (itemId: string, yearMonth: string, amount: number) => void
  getCashEntry: (itemId: string, yearMonth: string) => number
  setRealizedEntry: (itemId: string, yearMonth: string, amount: number) => void
  getRealizedEntry: (itemId: string, yearMonth: string) => number
  /** 이자를 세후(이자소득세 15.4% 차감)로 표시할지 — 이 기기 표시 설정 */
  interestAfterTax: boolean
  setInterestAfterTax: (v: boolean) => void
  addItem: (item: Omit<AssetItem, 'id' | 'order'>) => string
  updateItem: (id: string, patch: Partial<Omit<AssetItem, 'id'>>) => void
  removeItem: (id: string) => void
  reorderItem: (fromIdx: number, toIdx: number) => void
  /** yearMonth별 itemId의 금액 설정 (0이면 entry 제거) */
  setEntry: (itemId: string, yearMonth: string, amount: number) => void
  getEntry: (itemId: string, yearMonth: string) => number
  setCostBasisEntry: (itemId: string, yearMonth: string, amount: number) => void
  getCostBasisEntry: (itemId: string, yearMonth: string) => number
  /** 특정 연도 전체 entries 반환: { itemId: { yearMonth: amount } } */
  getYearData: (year: number) => Record<string, Record<string, number>>
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      items: [],
      entries: [],
      costBasisEntries: {},
      cashEntries: {},
      realizedEntries: {},
      interestAfterTax: false,

      setInterestAfterTax: (v) => set({ interestAfterTax: v }),

      addItem: (item) => {
        const id = uid()
        set((s) => ({
          items: [...s.items, { ...item, id, order: s.items.length }],
        }))
        return id
      },

      updateItem: (id, patch) => {
        set((s) => ({
          items: s.items.map((it) => (it.id === id ? { ...it, ...patch } : it)),
        }))
      },

      removeItem: (id) => {
        set((s) => ({
          items: s.items.filter((it) => it.id !== id),
          entries: s.entries.filter((e) => e.itemId !== id),
          costBasisEntries: Object.fromEntries(
            Object.entries(s.costBasisEntries).filter(([k]) => !k.startsWith(id + '::'))
          ),
          cashEntries: Object.fromEntries(Object.entries(s.cashEntries).filter(([k]) => !k.startsWith(id + '::'))),
          realizedEntries: Object.fromEntries(Object.entries(s.realizedEntries).filter(([k]) => !k.startsWith(id + '::'))),
        }))
      },

      reorderItem: (fromIdx, toIdx) => {
        set((s) => {
          const next = [...s.items]
          const [moved] = next.splice(fromIdx, 1)
          next.splice(toIdx, 0, moved)
          return { items: next.map((it, i) => ({ ...it, order: i })) }
        })
      },

      setEntry: (itemId, yearMonth, amount) => {
        set((s) => {
          const existing = s.entries.find((e) => e.itemId === itemId && e.yearMonth === yearMonth)
          if (amount === 0) {
            return { entries: s.entries.filter((e) => !(e.itemId === itemId && e.yearMonth === yearMonth)) }
          }
          if (existing) {
            return { entries: s.entries.map((e) => (e.itemId === itemId && e.yearMonth === yearMonth ? { ...e, amount } : e)) }
          }
          return { entries: [...s.entries, { id: uid(), itemId, yearMonth, amount }] }
        })
      },

      getEntry: (itemId, yearMonth) => {
        return get().entries.find((e) => e.itemId === itemId && e.yearMonth === yearMonth)?.amount ?? 0
      },

      setCostBasisEntry: (itemId, yearMonth, amount) => {
        const key = `${itemId}::${yearMonth}`
        set((s) => ({
          costBasisEntries: amount === 0
            ? Object.fromEntries(Object.entries(s.costBasisEntries).filter(([k]) => k !== key))
            : { ...s.costBasisEntries, [key]: amount },
        }))
      },

      getCostBasisEntry: (itemId, yearMonth) => {
        return get().costBasisEntries[`${itemId}::${yearMonth}`] ?? 0
      },

      setCashEntry: (itemId, yearMonth, amount) => {
        const key = `${itemId}::${yearMonth}`
        set((s) => ({
          cashEntries: amount === 0
            ? Object.fromEntries(Object.entries(s.cashEntries).filter(([k]) => k !== key))
            : { ...s.cashEntries, [key]: amount },
        }))
      },
      getCashEntry: (itemId, yearMonth) => get().cashEntries[`${itemId}::${yearMonth}`] ?? 0,

      setRealizedEntry: (itemId, yearMonth, amount) => {
        const key = `${itemId}::${yearMonth}`
        set((s) => ({
          realizedEntries: amount === 0
            ? Object.fromEntries(Object.entries(s.realizedEntries).filter(([k]) => k !== key))
            : { ...s.realizedEntries, [key]: amount },
        }))
      },
      getRealizedEntry: (itemId, yearMonth) => get().realizedEntries[`${itemId}::${yearMonth}`] ?? 0,

      getYearData: (year) => {
        const result: Record<string, Record<string, number>> = {}
        for (const e of get().entries) {
          if (!e.yearMonth.startsWith(String(year))) continue
          if (!result[e.itemId]) result[e.itemId] = {}
          result[e.itemId][e.yearMonth] = e.amount
        }
        return result
      },
    }),
    {
      name: 'couple-budget:assets',
      partialize: (s) => ({ items: s.items, entries: s.entries, costBasisEntries: s.costBasisEntries, cashEntries: s.cashEntries, realizedEntries: s.realizedEntries, interestAfterTax: s.interestAfterTax }),
    },
  ),
)
