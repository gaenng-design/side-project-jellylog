import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { InvestTemplate } from '@/types'

let _id = Date.now()
const uid = () => `inv-${_id++}`

interface Exclusion {
  templateId: string
  yearMonth: string
}

interface InvestTemplateState {
  templates: InvestTemplate[]
  exclusions: Exclusion[]
  monthlyAmounts: Record<string, number>
  addTemplate: (t: Omit<InvestTemplate, 'id' | 'order' | 'personOrder'>) => void
  updateTemplate: (id: string, p: Partial<InvestTemplate>) => void
  removeTemplate: (id: string) => void
  getSortedTemplates: () => InvestTemplate[]
  moveTemplate: (activeId: string, overId: string) => void
  moveTemplateWithinPerson: (activeId: string, overId: string) => void
  toggleExclusion: (templateId: string, yearMonth: string) => void
  isExcluded: (templateId: string, yearMonth: string) => boolean
  getActiveTemplates: (yearMonth: string) => InvestTemplate[]
  setMonthlyAmount: (key: string, yearMonth: string, amount: number) => void
  getMonthlyAmount: (key: string, yearMonth: string) => number | undefined
  clearMonthForYearMonth: (ym: string) => void
}

const catOrder: Record<string, number> = { 저축: 0, 투자: 1 }

export const useInvestTemplateStore = create<InvestTemplateState>()(
  persist(
    (set, get) => ({
      templates: [
        { id: uid(), person: 'A', category: '저축', description: '비상금 적금', defaultAmount: 0, personOrder: 0 },
        { id: uid(), person: 'B', category: '투자', description: 'ETF 적립식', defaultAmount: 0, personOrder: 0 },
      ],
      exclusions: [],
      monthlyAmounts: {},
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
          exclusions: s.exclusions.filter((e) => e.templateId !== id),
          monthlyAmounts: Object.fromEntries(
            Object.entries(s.monthlyAmounts).filter(([k]) => !k.startsWith(`${id}::`)),
          ),
        })),
      getSortedTemplates: () => {
        const t = get().templates
        return [...t].sort((a, b) => {
          const ca = catOrder[a.category] ?? 99
          const cb = catOrder[b.category] ?? 99
          if (ca !== cb) return ca - cb
          return (a.order ?? 999) - (b.order ?? 999)
        })
      },
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
          const byCat: Record<string, InvestTemplate[]> = {}
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
      setMonthlyAmount: (key, yearMonth, amount) =>
        set((s) => ({
          monthlyAmounts: { ...s.monthlyAmounts, [`${key}::${yearMonth}`]: amount },
        })),
      getMonthlyAmount: (key, yearMonth) => get().monthlyAmounts[`${key}::${yearMonth}`],
      clearMonthForYearMonth: (ym) =>
        set((s) => ({
          exclusions: s.exclusions.filter((e) => e.yearMonth !== ym),
          monthlyAmounts: Object.fromEntries(
            Object.entries(s.monthlyAmounts).filter(([k]) => !k.endsWith(`::${ym}`)),
          ),
        })),
    }),
    {
      name: 'couple-budget:invest-templates',
      partialize: (s) => ({
        templates: s.templates,
        exclusions: s.exclusions,
        monthlyAmounts: s.monthlyAmounts,
      }),
    },
  ),
)
