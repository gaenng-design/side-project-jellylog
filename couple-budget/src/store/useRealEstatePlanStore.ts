import { create } from 'zustand'
import { persist } from 'zustand/middleware'

export type RepayType = 'equal-installment' | 'equal-principal' | 'bullet'

export interface PlanLineItem {
  id: string
  name: string
  amountMan: string
}

export interface RealEstatePlan {
  id: string
  name: string
  createdAt: string
  updatedAt: string
  // 매매 조건
  priceMan: string
  depositPct: number
  purchaseLoanMan: string
  homeCount: number
  // 대출 계산기
  loanCalcMan: string
  loanRate: string
  loanTerm: string
  repayType: RepayType
  // 추가 비용 (편집 가능)
  planItems: PlanLineItem[]
  // 자본 조달 계획
  capitalItems: PlanLineItem[]
}

const PRESET_PLAN_ITEMS: Omit<PlanLineItem, 'id'>[] = [
  { name: '인테리어 공사', amountMan: '' },
  { name: '이사비', amountMan: '' },
  { name: '가전·가구', amountMan: '' },
  { name: '입주청소', amountMan: '' },
  { name: '법무사 (등기비용)', amountMan: '' },
]

const PRESET_CAPITAL_ITEMS: Omit<PlanLineItem, 'id'>[] = [
  { name: '현금·예금', amountMan: '' },
  { name: '부모님 지원', amountMan: '' },
  { name: '기존 전세 보증금 반환', amountMan: '' },
]

let _uid = Date.now()
const uid = () => `rep-${_uid++}`

function makePlan(name: string): RealEstatePlan {
  return {
    id: uid(),
    name,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    priceMan: '',
    depositPct: 10,
    purchaseLoanMan: '',
    homeCount: 1,
    loanCalcMan: '',
    loanRate: '',
    loanTerm: '',
    repayType: 'equal-installment',
    planItems: PRESET_PLAN_ITEMS.map((it) => ({ ...it, id: uid() })),
    capitalItems: PRESET_CAPITAL_ITEMS.map((it) => ({ ...it, id: uid() })),
  }
}

interface RealEstatePlanStore {
  plans: RealEstatePlan[]
  activePlanId: string | null

  createPlan: (name?: string) => string
  deletePlan: (id: string) => void
  renamePlan: (id: string, name: string) => void
  setActivePlan: (id: string) => void
  patchActivePlan: (patch: Partial<Omit<RealEstatePlan, 'id' | 'createdAt'>>) => void

  addPlanItem: (item: Omit<PlanLineItem, 'id'>) => void
  updatePlanItem: (itemId: string, patch: Partial<Omit<PlanLineItem, 'id'>>) => void
  removePlanItem: (itemId: string) => void

  addCapitalItem: (item: Omit<PlanLineItem, 'id'>) => void
  updateCapitalItem: (itemId: string, patch: Partial<Omit<PlanLineItem, 'id'>>) => void
  removeCapitalItem: (itemId: string) => void
}

export const useRealEstatePlanStore = create<RealEstatePlanStore>()(
  persist(
    (set, get) => ({
      plans: [],
      activePlanId: null,

      createPlan: (name) => {
        const label = name ?? `계획 ${get().plans.length + 1}`
        const plan = makePlan(label)
        set((s) => ({ plans: [...s.plans, plan], activePlanId: plan.id }))
        return plan.id
      },

      deletePlan: (id) => {
        set((s) => {
          const plans = s.plans.filter((p) => p.id !== id)
          const activePlanId =
            s.activePlanId === id ? (plans[plans.length - 1]?.id ?? null) : s.activePlanId
          return { plans, activePlanId }
        })
      },

      renamePlan: (id, name) => {
        set((s) => ({
          plans: s.plans.map((p) =>
            p.id === id ? { ...p, name, updatedAt: new Date().toISOString() } : p,
          ),
        }))
      },

      setActivePlan: (id) => set({ activePlanId: id }),

      patchActivePlan: (patch) => {
        set((s) => {
          const { activePlanId, plans } = s
          if (!activePlanId) return s
          return {
            plans: plans.map((p) =>
              p.id === activePlanId
                ? { ...p, ...patch, updatedAt: new Date().toISOString() }
                : p,
            ),
          }
        })
      },

      addPlanItem: (item) => {
        set((s) => {
          const { activePlanId, plans } = s
          if (!activePlanId) return s
          const newItem = { ...item, id: uid() }
          return {
            plans: plans.map((p) =>
              p.id === activePlanId
                ? { ...p, planItems: [...p.planItems, newItem], updatedAt: new Date().toISOString() }
                : p,
            ),
          }
        })
      },

      updatePlanItem: (itemId, patch) => {
        set((s) => {
          const { activePlanId, plans } = s
          if (!activePlanId) return s
          return {
            plans: plans.map((p) =>
              p.id === activePlanId
                ? {
                    ...p,
                    planItems: p.planItems.map((it) =>
                      it.id === itemId ? { ...it, ...patch } : it,
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          }
        })
      },

      removePlanItem: (itemId) => {
        set((s) => {
          const { activePlanId, plans } = s
          if (!activePlanId) return s
          return {
            plans: plans.map((p) =>
              p.id === activePlanId
                ? {
                    ...p,
                    planItems: p.planItems.filter((it) => it.id !== itemId),
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          }
        })
      },

      addCapitalItem: (item) => {
        set((s) => {
          const { activePlanId, plans } = s
          if (!activePlanId) return s
          const newItem = { ...item, id: uid() }
          return {
            plans: plans.map((p) =>
              p.id === activePlanId
                ? { ...p, capitalItems: [...p.capitalItems, newItem], updatedAt: new Date().toISOString() }
                : p,
            ),
          }
        })
      },

      updateCapitalItem: (itemId, patch) => {
        set((s) => {
          const { activePlanId, plans } = s
          if (!activePlanId) return s
          return {
            plans: plans.map((p) =>
              p.id === activePlanId
                ? {
                    ...p,
                    capitalItems: p.capitalItems.map((it) =>
                      it.id === itemId ? { ...it, ...patch } : it,
                    ),
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          }
        })
      },

      removeCapitalItem: (itemId) => {
        set((s) => {
          const { activePlanId, plans } = s
          if (!activePlanId) return s
          return {
            plans: plans.map((p) =>
              p.id === activePlanId
                ? {
                    ...p,
                    capitalItems: p.capitalItems.filter((it) => it.id !== itemId),
                    updatedAt: new Date().toISOString(),
                  }
                : p,
            ),
          }
        })
      },
    }),
    { name: 'real-estate-plans-v1' },
  ),
)
