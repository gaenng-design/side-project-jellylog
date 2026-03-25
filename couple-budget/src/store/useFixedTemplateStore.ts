import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { FixedTemplate } from '@/types'

let _id = Date.now()
const uid = () => `ft-${_id++}`

interface Exclusion {
  templateId: string
  yearMonth: string
}

interface FixedTemplateState {
  templates: FixedTemplate[]
  exclusions: Exclusion[]
  monthlyAmounts: Record<string, number>
  monthlySeparations: Record<string, boolean>
  addTemplate: (t: Omit<FixedTemplate, 'id' | 'order' | 'personOrder'>) => void
  updateTemplate: (id: string, p: Partial<FixedTemplate>) => void
  removeTemplate: (id: string) => void
  reorderTemplate: (id: string, direction: 'up' | 'down') => void
  moveTemplate: (activeId: string, overId: string) => void
  moveTemplateWithinPerson: (activeId: string, overId: string) => void
  toggleExclusion: (templateId: string, yearMonth: string) => void
  isExcluded: (templateId: string, yearMonth: string) => boolean
  getActiveTemplates: (yearMonth: string) => FixedTemplate[]
  getSortedTemplates: () => FixedTemplate[]
  setMonthlyAmount: (key: string, yearMonth: string, amount: number) => void
  getMonthlyAmount: (key: string, yearMonth: string) => number | undefined
  toggleSeparation: (templateId: string, yearMonth: string) => void
  isSeparated: (templateId: string, yearMonth: string) => boolean
  clearMonthForYearMonth: (ym: string) => void
}

const catOrder: Record<string, number> = {
  주거: 0,
  통신: 1,
  보험: 2,
  구독: 3,
  교통: 4,
  식비: 5,
  의료: 6,
  교육: 7,
  문화: 8,
  관리비: 9,
  기타: 10,
}

export const useFixedTemplateStore = create<FixedTemplateState>()(
  persist(
    (set, get) => ({
      templates: [
        { id: uid(), person: '공금', category: '주거', description: '월세', defaultAmount: 0 },
        { id: uid(), person: '공금', category: '관리비', description: '관리비', defaultAmount: 0 },
        { id: uid(), person: 'A', category: '통신', description: '휴대폰 요금', defaultAmount: 0 },
        { id: uid(), person: 'B', category: '통신', description: '휴대폰 요금', defaultAmount: 0 },
      ],
      exclusions: [],
      monthlyAmounts: {},
      monthlySeparations: {},
      addTemplate: (t) =>
        set((s) => {
          const maxOrder = Math.max(0, ...s.templates.map((x) => x.order ?? 0))
          const samePerson = s.templates.filter((x) => x.person === t.person)
          const maxPersonOrder = Math.max(-1, ...samePerson.map((x) => x.personOrder ?? -1))
          return {
            templates: [...s.templates, { ...t, id: uid(), order: maxOrder + 1, personOrder: maxPersonOrder + 1 }],
          }
        }),
      updateTemplate: (id, p) =>
        set((s) => ({
          templates: s.templates.map((t) => (t.id === id ? { ...t, ...p } : t)),
        })),
      removeTemplate: (id) =>
        set((s) => ({
          templates: s.templates.filter((t) => t.id !== id),
        })),
      reorderTemplate: (id, direction) =>
        set((s) => {
          const idx = s.templates.findIndex((t) => t.id === id)
          if (idx < 0) return s
          const tpl = s.templates[idx]
          const sameCategory = s.templates.filter((t) => t.category === tpl.category)
          const groupIdx = sameCategory.findIndex((t) => t.id === id)
          if (direction === 'up' && groupIdx <= 0) return s
          if (direction === 'down' && groupIdx >= sameCategory.length - 1) return s
          const swapIdx = direction === 'up' ? sameCategory[groupIdx - 1] : sameCategory[groupIdx + 1]
          const swapGlobalIdx = s.templates.findIndex((t) => t.id === swapIdx.id)
          const next = [...s.templates]
          ;[next[idx], next[swapGlobalIdx]] = [next[swapGlobalIdx], next[idx]]
          return { templates: next }
        }),
      moveTemplate: (activeId, overId) =>
        set((s) => {
          const sorted = get().getSortedTemplates()
          const oldIdx = sorted.findIndex((t) => t.id === activeId)
          const newIdx = sorted.findIndex((t) => t.id === overId)
          if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return s
          const next = [...sorted]
          const [removed] = next.splice(oldIdx, 1)
          const targetCategory = sorted[newIdx].category
          const toInsert = { ...removed, category: targetCategory }
          next.splice(newIdx, 0, toInsert)
          const byCat: Record<string, FixedTemplate[]> = {}
          for (const t of next) {
            if (!byCat[t.category]) byCat[t.category] = []
            byCat[t.category].push(t)
          }
          const withOrder = next.map((t) => {
            const inCat = byCat[t.category]
            const idx = inCat.findIndex((x) => x.id === t.id)
            return { ...t, order: idx }
          })
          return { templates: withOrder }
        }),
      moveTemplateWithinPerson: (activeId, overId) =>
        set((s) => {
          const active = s.templates.find((t) => t.id === activeId)
          const over = s.templates.find((t) => t.id === overId)
          if (!active || !over || active.person !== over.person) return s
          const samePerson = s.templates
            .filter((t) => t.person === active.person)
            .sort((a, b) => (a.personOrder ?? a.order ?? 999) - (b.personOrder ?? b.order ?? 999))
          const oldIdx = samePerson.findIndex((t) => t.id === activeId)
          const newIdx = samePerson.findIndex((t) => t.id === overId)
          if (oldIdx < 0 || newIdx < 0 || oldIdx === newIdx) return s
          const reordered = [...samePerson]
          const [removed] = reordered.splice(oldIdx, 1)
          reordered.splice(newIdx, 0, removed)
          const withPersonOrder = reordered.map((t, i) => ({ ...t, personOrder: i }))
          const otherTemplates = s.templates.filter((t) => t.person !== active.person)
          return { templates: [...otherTemplates, ...withPersonOrder] }
        }),
      toggleExclusion: (templateId, yearMonth) =>
        set((s) => {
          const exists = s.exclusions.some((e) => e.templateId === templateId && e.yearMonth === yearMonth)
          return {
            exclusions: exists
              ? s.exclusions.filter((e) => !(e.templateId === templateId && e.yearMonth === yearMonth))
              : [...s.exclusions, { templateId, yearMonth }],
          }
        }),
      isExcluded: (templateId, yearMonth) =>
        get().exclusions.some((e) => e.templateId === templateId && e.yearMonth === yearMonth),
      getActiveTemplates: (yearMonth) =>
        get().templates.filter((t) => !get().isExcluded(t.id, yearMonth)),
      getSortedTemplates: () => {
        const t = get().templates
        return [...t].sort((a, b) => {
          const ca = catOrder[a.category] ?? 99
          const cb = catOrder[b.category] ?? 99
          if (ca !== cb) return ca - cb
          return (a.order ?? 999) - (b.order ?? 999)
        })
      },
      setMonthlyAmount: (key, yearMonth, amount) =>
        set((s) => ({
          monthlyAmounts: { ...s.monthlyAmounts, [`${key}::${yearMonth}`]: amount },
        })),
      getMonthlyAmount: (key, yearMonth) => get().monthlyAmounts[`${key}::${yearMonth}`],
      toggleSeparation: (templateId, yearMonth) =>
        set((s) => {
          const key = `${templateId}::${yearMonth}`
          return { monthlySeparations: { ...s.monthlySeparations, [key]: !s.monthlySeparations[key] } }
        }),
      isSeparated: (templateId, yearMonth) => {
        const key = `${templateId}::${yearMonth}`
        if (get().monthlySeparations[key] !== undefined) return !!get().monthlySeparations[key]
        const t = get().templates.find((x) => x.id === templateId)
        return !!t?.defaultSeparate
      },
      clearMonthForYearMonth: (ym) =>
        set((s) => ({
          exclusions: s.exclusions.filter((e) => e.yearMonth !== ym),
          monthlyAmounts: Object.fromEntries(
            Object.entries(s.monthlyAmounts).filter(([k]) => !k.endsWith(`::${ym}`)),
          ),
          monthlySeparations: Object.fromEntries(
            Object.entries(s.monthlySeparations).filter(([k]) => !k.endsWith(`::${ym}`)),
          ),
        })),
    }),
    {
      name: 'couple-budget:fixed-templates',
      partialize: (s) => ({
        templates: s.templates,
        exclusions: s.exclusions,
        monthlyAmounts: s.monthlyAmounts,
        monthlySeparations: s.monthlySeparations,
      }),
    },
  ),
)
