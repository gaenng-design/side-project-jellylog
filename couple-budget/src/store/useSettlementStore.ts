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

/** 정산 결과 화면의 유저별 납부 확인 체크박스 상태 */
export interface PayChecks {
  deposit: boolean
  sharedLiving: boolean
  /** 별도 지출 카드 50:50 송금액 — 보내는 쪽만 표시 */
  transfer5090Send: boolean
  /** 별도지출 반반 정산 (공금 결제 항목 절반 부담) */
  sharedFundExpense: boolean
  /** 고정지출 별도 정산 항목별 체크 (index 기반) */
  separateItemChecks: Record<number, boolean>
  /** 투자/저축 트리: inv-0, sav-0 | cat-inv, cat-sav | combined */
  investChecks: Record<string, boolean>
}

export type UserPayChecks = { A: PayChecks; B: PayChecks }

const makeEmptyChecks = (): PayChecks => ({
  deposit: false,
  sharedLiving: false,
  transfer5090Send: false,
  sharedFundExpense: false,
  separateItemChecks: {},
  investChecks: {},
})

export const makeEmptyUserPayChecks = (): UserPayChecks => ({
  A: makeEmptyChecks(),
  B: makeEmptyChecks(),
})

/**
 * 셀렉터에서 fallback 으로 안전하게 쓰는 동결된 빈 상태.
 * 매 렌더마다 새 객체를 만들면 zustand 가 변경으로 판단해 무한 리렌더가 발생함.
 */
export const EMPTY_USER_PAY_CHECKS: UserPayChecks = Object.freeze({
  A: Object.freeze({
    deposit: false,
    sharedLiving: false,
    transfer5090Send: false,
    sharedFundExpense: false,
    separateItemChecks: Object.freeze({}) as Record<number, boolean>,
    investChecks: Object.freeze({}) as Record<string, boolean>,
  }) as PayChecks,
  B: Object.freeze({
    deposit: false,
    sharedLiving: false,
    transfer5090Send: false,
    sharedFundExpense: false,
    separateItemChecks: Object.freeze({}) as Record<number, boolean>,
    investChecks: Object.freeze({}) as Record<string, boolean>,
  }) as PayChecks,
}) as UserPayChecks

interface SettlementState {
  settlements: MonthlySettlement[]
  transfers: Record<string, boolean>
  /** 월별 정산 결과의 납부 확인 체크박스 상태 */
  payChecksByMonth: Record<string, UserPayChecks>
  /** 월별 정산 메모 (정산 시 작성, 선택) */
  memoByMonth: Record<string, string>
  isSettled: (yearMonth: string) => boolean
  getSettlement: (yearMonth: string) => MonthlySettlement | undefined
  settle: (data: MonthlySettlement) => void
  cancelSettlement: (yearMonth: string) => void
  clearTransfersForMonth: (yearMonth: string) => void
  toggleTransfer: (yearMonth: string, itemId: string) => void
  isTransferred: (yearMonth: string, itemId: string) => boolean
  getPayChecks: (yearMonth: string) => UserPayChecks
  setPayChecks: (yearMonth: string, updater: (prev: UserPayChecks) => UserPayChecks) => void
  clearPayChecksForMonth: (yearMonth: string) => void
  getMemo: (yearMonth: string) => string
  setMemo: (yearMonth: string, memo: string) => void
}

export const useSettlementStore = create<SettlementState>()(
  persist(
    (set, get) => ({
      settlements: [],
      transfers: {},
      payChecksByMonth: {},
      memoByMonth: {},

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
        set((state) => {
          const nextChecks = { ...state.payChecksByMonth }
          delete nextChecks[yearMonth]
          const nextMemos = { ...state.memoByMonth }
          delete nextMemos[yearMonth]
          return {
            settlements: state.settlements.filter((s) => s.yearMonth !== yearMonth),
            payChecksByMonth: nextChecks,
            memoByMonth: nextMemos,
          }
        }),

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

      getPayChecks: (yearMonth) =>
        get().payChecksByMonth[yearMonth] ?? EMPTY_USER_PAY_CHECKS,

      setPayChecks: (yearMonth, updater) =>
        set((state) => {
          const prev = state.payChecksByMonth[yearMonth] ?? makeEmptyUserPayChecks()
          const next = updater(prev)
          return {
            payChecksByMonth: { ...state.payChecksByMonth, [yearMonth]: next },
          }
        }),

      clearPayChecksForMonth: (yearMonth) =>
        set((state) => {
          if (!state.payChecksByMonth[yearMonth]) return state
          const next = { ...state.payChecksByMonth }
          delete next[yearMonth]
          return { payChecksByMonth: next }
        }),

      getMemo: (yearMonth) => get().memoByMonth[yearMonth] ?? '',

      setMemo: (yearMonth, memo) =>
        set((state) => {
          const trimmed = memo.trim()
          const next = { ...state.memoByMonth }
          if (trimmed) next[yearMonth] = trimmed
          else delete next[yearMonth]
          return { memoByMonth: next }
        }),
    }),
    {
      name: 'couple-budget:settlements',
      partialize: (s) => ({
        settlements: s.settlements,
        transfers: s.transfers,
        payChecksByMonth: s.payChecksByMonth,
        memoByMonth: s.memoByMonth,
      }),
    },
  ),
)
