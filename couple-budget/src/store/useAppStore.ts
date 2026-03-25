import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { syncIncomeRepoSalaryDescriptions } from '@/data/syncIncomeRepoSalaryDescriptions'

const now = new Date()
const defaultYM = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

/** 월/연도 선택 드롭다운 최소 연도 */
export const YEAR_PICKER_MIN = 2026

function defaultYearPickerMaxYear() {
  return Math.max(YEAR_PICKER_MIN, new Date().getFullYear())
}

/** 드롭다운에 표시할 연도 목록 (2026 ~ end, 현재 선택·올해·저장된 최대값 반영) */
export function getYearPickerYearOptions(
  yearPickerMaxYear: number | undefined,
  selectedYear: number,
): number[] {
  const calendarY = new Date().getFullYear()
  const stored = yearPickerMaxYear ?? defaultYearPickerMaxYear()
  const endYear = Math.max(YEAR_PICKER_MIN, stored, calendarY, selectedYear)
  return Array.from({ length: endYear - YEAR_PICKER_MIN + 1 }, (_, i) => YEAR_PICKER_MIN + i)
}

export interface AppSettings {
  personAName: string
  personBName: string
  personAIncome: number
  personBIncome: number
  personAIncomeDay: number
  personBIncomeDay: number
  currency: string
  sharedLivingCost: number
  sharedLivingCostRatioMode: '50:50' | 'custom' | 'income'
  sharedLivingCostRatio: [number, number]
  user1Color: string
  user2Color: string
  sharedColor: string
}

interface AppState {
  currentYearMonth: string
  /** 연도 드롭다운 상한(포함). 신년 추가하기로 1씩 늘림 */
  yearPickerMaxYear: number
  settings: AppSettings
  startedMonths: string[]
  settledMonths: string[]
  lastSavedByMonth: Record<string, string>
  setYearMonth: (ym: string) => void
  extendYearPickerMax: () => void
  /** 신년으로 늘린 맨 끝 연도를 드롭다운에서 제거할 때 yearPickerMaxYear 축소 (UI에서 데이터 없음 확인 후 호출) */
  removeExtendedYearFromPicker: (year: number) => void
  setLastSaved: (ym: string, iso: string) => void
  updateSettings: (s: Partial<AppSettings>) => void
  startMonth: (ym: string) => void
  removeStartedMonth: (ym: string) => void
  settleMonth: (ym: string) => void
  unsetSettleMonth: (ym: string) => void
  isMonthStarted: (ym: string) => boolean
  isMonthSettled: (ym: string) => boolean
}

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      currentYearMonth: defaultYM,
      settings: {
        personAName: '유저 1',
        personBName: '유저 2',
        personAIncome: 0,
        personBIncome: 0,
        personAIncomeDay: 25,
        personBIncomeDay: 25,
        currency: 'KRW',
        sharedLivingCost: 0,
        sharedLivingCostRatioMode: '50:50',
        sharedLivingCostRatio: [50, 50],
        user1Color: '#FFADAD',
        user2Color: '#9BF6FF',
        sharedColor: '#065f46',
      },
      startedMonths: [defaultYM],
      settledMonths: [],
      lastSavedByMonth: {},
      yearPickerMaxYear: defaultYearPickerMaxYear(),
      setYearMonth: (ym) => set({ currentYearMonth: ym }),
      extendYearPickerMax: () =>
        set((s) => {
          const calendarY = new Date().getFullYear()
          const pickerY = Number(String(s.currentYearMonth).split('-')[0]) || YEAR_PICKER_MIN
          const curMax = s.yearPickerMaxYear ?? defaultYearPickerMaxYear()
          const base = Math.max(YEAR_PICKER_MIN, curMax, calendarY, pickerY)
          return { yearPickerMaxYear: base + 1 }
        }),
      removeExtendedYearFromPicker: (year) =>
        set((s) => {
          const calendarY = new Date().getFullYear()
          const floor = Math.max(YEAR_PICKER_MIN, calendarY)
          const nextMax = Math.max(floor, year - 1)
          let currentYearMonth = s.currentYearMonth
          const parts = currentYearMonth.split('-')
          const cy = Number(parts[0])
          const cm = Number(parts[1])
          if (Number.isFinite(cy) && Number.isFinite(cm) && cy > nextMax) {
            currentYearMonth = `${nextMax}-${String(cm).padStart(2, '0')}`
          }
          return { yearPickerMaxYear: nextMax, currentYearMonth }
        }),
      setLastSaved: (ym, iso) => set((s) => ({ lastSavedByMonth: { ...s.lastSavedByMonth, [ym]: iso } })),
      updateSettings: (s) =>
        set((state) => {
          const settings = { ...state.settings, ...s }
          if (s.personAName !== undefined || s.personBName !== undefined) {
            syncIncomeRepoSalaryDescriptions(settings.personAName, settings.personBName)
          }
          return { settings }
        }),
      startMonth: (ym) =>
        set((state) => ({
          startedMonths: state.startedMonths.includes(ym) ? state.startedMonths : [...state.startedMonths, ym],
        })),
      removeStartedMonth: (ym) =>
        set((state) => ({
          startedMonths: state.startedMonths.filter((m) => m !== ym),
        })),
      settleMonth: (ym) =>
        set((state) => ({
          settledMonths: state.settledMonths.includes(ym) ? state.settledMonths : [...state.settledMonths, ym],
        })),
      unsetSettleMonth: (ym) =>
        set((state) => ({
          settledMonths: state.settledMonths.filter((m) => m !== ym),
        })),
      isMonthStarted: (ym) => get().startedMonths.includes(ym),
      isMonthSettled: (ym) => get().settledMonths.includes(ym),
    }),
    {
      name: 'couple-budget:app',
      partialize: (s) => ({
        currentYearMonth: s.currentYearMonth,
        yearPickerMaxYear: s.yearPickerMaxYear,
        settings: s.settings,
        startedMonths: s.startedMonths,
        settledMonths: s.settledMonths,
        lastSavedByMonth: s.lastSavedByMonth,
      }),
    },
  ),
)
