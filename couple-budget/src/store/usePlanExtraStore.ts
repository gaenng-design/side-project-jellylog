import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { Person } from '@/types'
import type { FixedTemplate, InvestTemplate } from '@/types'

interface FixedExtraRow {
  id: string
  person: Person
  category: string
  description: string
  amount: number
  /** 별도 지출 카드: ↗ 별도 정산 태그 (Supabase separate_items.is_separate 와 동기화) */
  isSeparate?: boolean
  separatePerson?: 'A' | 'B'
  payDay?: number
  /** 계좌번호 (선택). 별도 정산 시 송금 안내용 */
  accountNumber?: string
}

interface InvestExtraRow {
  id: string
  person: Person
  category: string
  description: string
  amount: number
  /** 계좌번호 (선택). 적금/투자 통장 안내용 */
  accountNumber?: string
}

/** 해당 월 기본 급여(유저1·2 템플릿)를 합계·정산에서 제외 */
type DefaultSalaryExcluded = Partial<Record<'A' | 'B', boolean>>

interface PlanExtraState {
  extraRowsByMonth: Record<string, { fixed: FixedExtraRow[]; invest: InvestExtraRow[] }>
  /** 월별 별도 지출(설정 템플릿 없음, 고정지출 카드와 동일 필드) */
  separateExpenseRowsByMonth: Record<string, FixedExtraRow[]>
  templateSnapshotsByMonth: Record<string, { fixed: FixedTemplate[]; invest: InvestTemplate[] }>
  defaultSalaryExcludedByMonth: Record<string, DefaultSalaryExcluded>
  /** 월별 공동 생활비 (미설정 시 settings.sharedLivingCost 사용) */
  sharedLivingCostByMonth: Record<string, number>
  setSharedLivingCostForMonth: (ym: string, amount: number) => void
  clearSharedLivingCostForMonth: (ym: string) => void
  setFixedForMonth: (ym: string, updater: (prev: FixedExtraRow[]) => FixedExtraRow[]) => void
  setInvestForMonth: (ym: string, updater: (prev: InvestExtraRow[]) => InvestExtraRow[]) => void
  setSeparateExpenseForMonth: (ym: string, updater: (prev: FixedExtraRow[]) => FixedExtraRow[]) => void
  setTemplateSnapshot: (ym: string, snapshot: { fixed: FixedTemplate[]; invest: InvestTemplate[] }) => void
  updateFixedTemplateInSnapshot: (ym: string, templateId: string, patch: Partial<FixedTemplate>) => void
  updateInvestTemplateInSnapshot: (ym: string, templateId: string, patch: Partial<InvestTemplate>) => void
  removeFixedTemplateFromSnapshot: (ym: string, templateId: string) => void
  removeInvestTemplateFromSnapshot: (ym: string, templateId: string) => void
  toggleDefaultSalaryExcluded: (ym: string, person: 'A' | 'B') => void
  clearMonth: (ym: string) => void
}

export const usePlanExtraStore = create<PlanExtraState>()(
  persist(
    (set) => ({
      extraRowsByMonth: {},
      separateExpenseRowsByMonth: {},
      templateSnapshotsByMonth: {},
      defaultSalaryExcludedByMonth: {},
      sharedLivingCostByMonth: {},
      setSharedLivingCostForMonth: (ym, amount) =>
        set((s) => ({
          sharedLivingCostByMonth: { ...s.sharedLivingCostByMonth, [ym]: amount },
        })),
      clearSharedLivingCostForMonth: (ym) =>
        set((s) => {
          const next = { ...s.sharedLivingCostByMonth }
          delete next[ym]
          return { sharedLivingCostByMonth: next }
        }),
      setFixedForMonth: (ym, updater) =>
        set((s) => ({
          extraRowsByMonth: {
            ...s.extraRowsByMonth,
            [ym]: {
              ...s.extraRowsByMonth[ym],
              fixed: updater(s.extraRowsByMonth[ym]?.fixed ?? []),
              invest: s.extraRowsByMonth[ym]?.invest ?? [],
            },
          },
        })),
      setInvestForMonth: (ym, updater) =>
        set((s) => ({
          extraRowsByMonth: {
            ...s.extraRowsByMonth,
            [ym]: {
              ...s.extraRowsByMonth[ym],
              fixed: s.extraRowsByMonth[ym]?.fixed ?? [],
              invest: updater(s.extraRowsByMonth[ym]?.invest ?? []),
            },
          },
        })),
      setSeparateExpenseForMonth: (ym, updater) =>
        set((s) => ({
          separateExpenseRowsByMonth: {
            ...s.separateExpenseRowsByMonth,
            [ym]: updater(s.separateExpenseRowsByMonth[ym] ?? []),
          },
        })),
      setTemplateSnapshot: (ym, snapshot) =>
        set((s) => ({
          templateSnapshotsByMonth: { ...s.templateSnapshotsByMonth, [ym]: snapshot },
        })),
      updateFixedTemplateInSnapshot: (ym, templateId, patch) =>
        set((s) => {
          const snap = s.templateSnapshotsByMonth[ym]
          if (!snap) return s
          return {
            templateSnapshotsByMonth: {
              ...s.templateSnapshotsByMonth,
              [ym]: {
                ...snap,
                fixed: snap.fixed.map((t) => (t.id === templateId ? { ...t, ...patch } : t)),
              },
            },
          }
        }),
      updateInvestTemplateInSnapshot: (ym, templateId, patch) =>
        set((s) => {
          const snap = s.templateSnapshotsByMonth[ym]
          if (!snap) return s
          return {
            templateSnapshotsByMonth: {
              ...s.templateSnapshotsByMonth,
              [ym]: {
                ...snap,
                invest: snap.invest.map((t) => (t.id === templateId ? { ...t, ...patch } : t)),
              },
            },
          }
        }),
      removeFixedTemplateFromSnapshot: (ym, templateId) =>
        set((s) => {
          const snap = s.templateSnapshotsByMonth[ym]
          if (!snap) return s
          return {
            templateSnapshotsByMonth: {
              ...s.templateSnapshotsByMonth,
              [ym]: { ...snap, fixed: snap.fixed.filter((t) => t.id !== templateId) },
            },
          }
        }),
      removeInvestTemplateFromSnapshot: (ym, templateId) =>
        set((s) => {
          const snap = s.templateSnapshotsByMonth[ym]
          if (!snap) return s
          return {
            templateSnapshotsByMonth: {
              ...s.templateSnapshotsByMonth,
              [ym]: { ...snap, invest: snap.invest.filter((t) => t.id !== templateId) },
            },
          }
        }),
      toggleDefaultSalaryExcluded: (ym, person) =>
        set((s) => {
          const cur = s.defaultSalaryExcludedByMonth[ym] ?? {}
          const turningOff = !!cur[person]
          const nextForYm: DefaultSalaryExcluded = { ...cur }
          if (turningOff) delete nextForYm[person]
          else nextForYm[person] = true
          const rest = { ...s.defaultSalaryExcludedByMonth }
          if (!nextForYm.A && !nextForYm.B) {
            delete rest[ym]
            return { defaultSalaryExcludedByMonth: rest }
          }
          return { defaultSalaryExcludedByMonth: { ...rest, [ym]: nextForYm } }
        }),
      clearMonth: (ym) =>
        set((s) => {
          const next = { ...s.extraRowsByMonth }
          delete next[ym]
          const nextSep = { ...s.separateExpenseRowsByMonth }
          delete nextSep[ym]
          const nextSnapshots = { ...s.templateSnapshotsByMonth }
          delete nextSnapshots[ym]
          const nextEx = { ...s.defaultSalaryExcludedByMonth }
          delete nextEx[ym]
          const nextShared = { ...s.sharedLivingCostByMonth }
          delete nextShared[ym]
          return {
            extraRowsByMonth: next,
            separateExpenseRowsByMonth: nextSep,
            templateSnapshotsByMonth: nextSnapshots,
            defaultSalaryExcludedByMonth: nextEx,
            sharedLivingCostByMonth: nextShared,
          }
        }),
    }),
    {
      name: 'couple-budget:plan-extra',
      partialize: (s) => ({
        extraRowsByMonth: s.extraRowsByMonth,
        separateExpenseRowsByMonth: s.separateExpenseRowsByMonth,
        templateSnapshotsByMonth: s.templateSnapshotsByMonth,
        defaultSalaryExcludedByMonth: s.defaultSalaryExcludedByMonth,
        sharedLivingCostByMonth: s.sharedLivingCostByMonth,
      }),
    },
  ),
)
