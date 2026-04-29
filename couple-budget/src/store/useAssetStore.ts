import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { AssetItem, AssetEntry } from '@/types'

let _id = Date.now()
const uid = () => `asset-${_id++}`

export const ASSET_CATEGORIES = ['저축', '투자', '부동산', '주식', '기타']

interface AssetState {
  items: AssetItem[]
  entries: AssetEntry[]
  addItem: (item: Omit<AssetItem, 'id' | 'order'>) => string
  updateItem: (id: string, patch: Partial<Omit<AssetItem, 'id'>>) => void
  removeItem: (id: string) => void
  reorderItem: (fromIdx: number, toIdx: number) => void
  /** yearMonth별 itemId의 금액 설정 (0이면 entry 제거) */
  setEntry: (itemId: string, yearMonth: string, amount: number) => void
  getEntry: (itemId: string, yearMonth: string) => number
  /** 특정 연도 전체 entries 반환: { itemId: { yearMonth: amount } } */
  getYearData: (year: number) => Record<string, Record<string, number>>
}

export const useAssetStore = create<AssetState>()(
  persist(
    (set, get) => ({
      items: [],
      entries: [],

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
          console.log('[useAssetStore.setEntry]:', { itemId, yearMonth, amount, existing: !!existing })
          if (amount === 0) {
            console.log('  → Deleting entry (amount is 0)')
            return { entries: s.entries.filter((e) => !(e.itemId === itemId && e.yearMonth === yearMonth)) }
          }
          if (existing) {
            console.log('  → Updating existing entry')
            return { entries: s.entries.map((e) => (e.itemId === itemId && e.yearMonth === yearMonth ? { ...e, amount } : e)) }
          }
          console.log('  → Creating new entry')
          return { entries: [...s.entries, { id: uid(), itemId, yearMonth, amount }] }
        })
      },

      getEntry: (itemId, yearMonth) => {
        return get().entries.find((e) => e.itemId === itemId && e.yearMonth === yearMonth)?.amount ?? 0
      },

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
    },
  ),
)
