import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Person } from '@/types'

export interface SettledItem {
  id: string
  person: Person
  category: string
  description: string
  amount: number
  isTemplate: boolean
  templateId?: string
  incomeDay?: number
  payDay?: number
  isSeparate?: boolean
}

export interface MonthlySettlement {
  yearMonth: string
  settledAt: string
  incomes: SettledItem[]
  fixedExpenses: SettledItem[]
  investments: SettledItem[]
  separateItems: SettledItem[]
}

interface SettlementState {
  settlements: MonthlySettlement[]
  transfers: Record<string, boolean>
  isSettled: (yearMonth: string) => boolean
  getSettlement: (yearMonth: string) => MonthlySettlement | undefined
  settle: (data: MonthlySettlement) => void
  cancelSettlement: (yearMonth: string) => void
  clearTransfersForMonth: (yearMonth: string) => void
  toggleTransfer: (yearMonth: string, itemId: string) => void
  isTransferred: (yearMonth: string, itemId: string) => boolean
}

export const useSettlementStore = create<SettlementState>()(
  persist(
    (set, get) => ({
      settlements: [],
      transfers: {},

      isSettled: (yearMonth) =>
        get().settlements.some((s) => s.yearMonth === yearMonth),

      getSettlement: (yearMonth) =>
        get().settlements.find((s) => s.yearMonth === yearMonth),

      settle: (data) =>
        set((state) => ({
          settlements: [
            ...state.settlements.filter((s) => s.yearMonth !== data.yearMonth),
            data,
          ],
        })),

      cancelSettlement: (yearMonth) =>
        set((state) => ({
          settlements: state.settlements.filter((s) => s.yearMonth !== yearMonth),
        })),

      clearTransfersForMonth: (yearMonth) =>
        set((state) => {
          const prefix = `${yearMonth}::`
          const next = { ...state.transfers }
          for (const key of Object.keys(next)) {
            if (key.startsWith(prefix)) delete next[key]
          }
          return { transfers: next }
        }),

      toggleTransfer: (yearMonth, itemId) =>
        set((state) => {
          const key = `${yearMonth}::${itemId}`
          return { transfers: { ...state.transfers, [key]: !state.transfers[key] } }
        }),

      isTransferred: (yearMonth, itemId) =>
        !!get().transfers[`${yearMonth}::${itemId}`],
    }),
    {
      name: 'couple-budget:settlements',
      partialize: (s) => ({
        settlements: s.settlements,
        transfers: s.transfers,
      }),
    },
  ),
)
