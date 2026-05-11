import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { SharedExpenseItem, SharedExpenseEntry } from '@/types'

let _id = Date.now()
const uid = () => `shared-expense-${_id++}`

/** 기본 카테고리 (사용자가 수정 가능) */
export const DEFAULT_SHARED_EXPENSE_CATEGORIES = [
  '식비',
  '공과금',
  '교통비',
  '통신비',
  '의료비',
  '교육비',
  '기타',
]

/** @deprecated DEFAULT_SHARED_EXPENSE_CATEGORIES 사용. 컴포넌트에서는 store의 categories를 사용 */
export const SHARED_EXPENSE_CATEGORIES = DEFAULT_SHARED_EXPENSE_CATEGORIES

interface SharedExpenseState {
  items: SharedExpenseItem[]
  entries: SharedExpenseEntry[]
  /** 사용자 정의 카테고리 목록 (순서대로 표시) */
  categories: string[]
  /** 카테고리별 색상 인덱스 (lib/categoryColors.ts의 CATEGORY_COLORS 참조) */
  categoryColors: Record<string, number>
  // ── 카테고리 관리 ─────────────────
  addCategory: (name: string) => boolean
  removeCategory: (name: string) => void
  renameCategory: (oldName: string, newName: string) => boolean
  reorderCategory: (fromIdx: number, toIdx: number) => void
  setCategoryColor: (name: string, colorIndex: number) => void
  // ── 항목 (마스터) ─────────────────
  addItem: (item: Omit<SharedExpenseItem, 'id' | 'order'>) => string
  updateItem: (id: string, patch: Partial<Omit<SharedExpenseItem, 'id'>>) => void
  removeItem: (id: string) => void
  reorderItem: (fromIdx: number, toIdx: number) => void
  /** 이름+카테고리로 기존 item 찾거나 새로 생성 */
  findOrCreateItem: (name: string, category: string) => string
  // ── 거래 (Entry) ──────────────────
  addEntry: (params: {
    itemId: string
    yearMonth: string
    day?: number
    amount: number
    memo?: string
  }) => string
  updateEntry: (id: string, patch: Partial<Omit<SharedExpenseEntry, 'id'>>) => void
  removeEntry: (id: string) => void
  /** [Deprecated] 한 항목당 한 entry (호환성용) */
  setEntry: (itemId: string, yearMonth: string, amount: number) => void
  /** 같은 (itemId, yearMonth)의 모든 entries 합계 */
  getEntry: (itemId: string, yearMonth: string) => number
  getYearData: (year: number) => Record<string, Record<string, number>>
  importData: (
    items: SharedExpenseItem[],
    entries: SharedExpenseEntry[],
    categories?: string[],
    categoryColors?: Record<string, number>,
  ) => void
}

export const useSharedExpenseStore = create<SharedExpenseState>()(
  persist(
    (set, get) => ({
      items: [],
      entries: [],
      categories: [...DEFAULT_SHARED_EXPENSE_CATEGORIES],
      categoryColors: {},

      // ── 카테고리 관리 ─────────────────
      addCategory: (name) => {
        const trimmed = name.trim()
        if (!trimmed) return false
        const cats = get().categories
        if (cats.includes(trimmed)) return false
        set({ categories: [...cats, trimmed] })
        return true
      },

      removeCategory: (name) => {
        // 카테고리 목록에서만 제거. 기존 items/entries는 그대로 유지
        // (이전 데이터에 해당 카테고리가 사용되고 있으면 데이터는 보존됨)
        set((s) => {
          const nextColors = { ...s.categoryColors }
          delete nextColors[name]
          return {
            categories: s.categories.filter((c) => c !== name),
            categoryColors: nextColors,
          }
        })
      },

      renameCategory: (oldName, newName) => {
        const trimmed = newName.trim()
        if (!trimmed || oldName === trimmed) return false
        const cats = get().categories
        if (cats.includes(trimmed)) return false
        set((s) => {
          // 색상 매핑도 새 이름으로 이전
          const nextColors = { ...s.categoryColors }
          if (oldName in nextColors) {
            nextColors[trimmed] = nextColors[oldName]
            delete nextColors[oldName]
          }
          return {
            categories: s.categories.map((c) => (c === oldName ? trimmed : c)),
            // 기존 items의 category도 함께 업데이트
            items: s.items.map((it) => (it.category === oldName ? { ...it, category: trimmed } : it)),
            categoryColors: nextColors,
          }
        })
        return true
      },

      reorderCategory: (fromIdx, toIdx) => {
        set((s) => {
          const next = [...s.categories]
          const [moved] = next.splice(fromIdx, 1)
          next.splice(toIdx, 0, moved)
          return { categories: next }
        })
      },

      setCategoryColor: (name, colorIndex) => {
        set((s) => ({
          categoryColors: { ...s.categoryColors, [name]: colorIndex },
        }))
      },

      // ── 항목 (마스터) ─────────────────
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

      findOrCreateItem: (name, category) => {
        const trimmedName = name.trim()
        const existing = get().items.find(
          (it) => it.name === trimmedName && it.category === category,
        )
        if (existing) return existing.id

        const id = uid()
        set((s) => ({
          items: [...s.items, { id, name: trimmedName, category, order: s.items.length }],
        }))
        return id
      },

      // ── 거래 (Entry) ──────────────────
      addEntry: ({ itemId, yearMonth, day, amount, memo }) => {
        const id = uid()
        set((s) => ({
          entries: [...s.entries, { id, itemId, yearMonth, day, amount, memo }],
        }))
        return id
      },

      updateEntry: (id, patch) => {
        set((s) => ({
          entries: s.entries.map((e) => (e.id === id ? { ...e, ...patch } : e)),
        }))
      },

      removeEntry: (id) => {
        set((s) => ({
          entries: s.entries.filter((e) => e.id !== id),
        }))
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
        return get()
          .entries.filter((e) => e.itemId === itemId && e.yearMonth === yearMonth)
          .reduce((sum, e) => sum + e.amount, 0)
      },

      getYearData: (year) => {
        const result: Record<string, Record<string, number>> = {}
        for (const e of get().entries) {
          if (!e.yearMonth.startsWith(String(year))) continue
          if (!result[e.itemId]) result[e.itemId] = {}
          result[e.itemId][e.yearMonth] = (result[e.itemId][e.yearMonth] ?? 0) + e.amount
        }
        return result
      },

      importData: (items, entries, categories, categoryColors) => {
        const next: Partial<SharedExpenseState> = { items, entries }
        if (categories && categories.length > 0) next.categories = categories
        if (categoryColors) next.categoryColors = categoryColors
        set(next as SharedExpenseState)
      },
    }),
    {
      name: 'couple-budget:shared-expense',
      // 마이그레이션: categories가 없는 기존 사용자에게 default 적용
      onRehydrateStorage: () => (state) => {
        if (state && (!state.categories || state.categories.length === 0)) {
          state.categories = [...DEFAULT_SHARED_EXPENSE_CATEGORIES]
        }
      },
    },
  ),
)
