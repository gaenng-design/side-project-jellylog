import { useMemo } from 'react'
import { useAssetStore, ASSET_CATEGORIES } from '@/store/useAssetStore'
import { useAppStore } from '@/store/useAppStore'
import type { AssetItem } from '@/types'
import {
  calcMaturity,
  getProjectedValue as projectValue,
  getEffectivePnl,
  getSavingsCumulativeInterest as cumulativeInterest,
  buildFirstEntryMap,
  INTEREST_TAX_RATE,
} from '@/lib/assetCalc'
import { DS } from '@/design-system/tokens'

/**
 * 자산 탭 공용 데이터·계산 모음.
 * 화면 컴포넌트는 이 모델만 받아서 표시하고, 계산은 lib/assetCalc 에 위임한다.
 */
export function useAssetModel() {
  const settings = useAppStore((s) => s.settings)

  // 자산 탭의 "현재 달" 경계는 오늘 날짜 고정 — 다른 탭에서 선택한 월에 영향받지 않아야 함
  // 22일 기준: 22일 이전 → 이번 달 포커싱/편집, 22일 이후 → 다음 달도 편집 허용
  const today = new Date()
  const canEditNextMonth = today.getDate() >= 22
  const focusDate = canEditNextMonth
    ? new Date(today.getFullYear(), today.getMonth() + 1, 1)
    : today
  const currentYear = focusDate.getFullYear()
  const currentMonth = focusDate.getMonth() // 0-based
  // 편집 허용 상한: 22일 이전 → 이번 달까지, 22일 이후 → 다음 달까지
  const editableBoundary = currentYear * 100 + currentMonth

  /** 월이 편집 가능한지 — 이번 달 + 다음 달까지 허용 */
  const isMonthEditable = (yr: number, monthIdx: number): boolean => {
    if (yr < currentYear) return true
    return yr * 100 + monthIdx <= editableBoundary
  }

  // ── 명의 ──
  const personAName = settings.personAName || '유저 1'
  const personBName = settings.personBName || '유저 2'
  const personAColor = settings.user1Color
  const personBColor = settings.user2Color
  const getPersonColor = (person?: 'A' | 'B') => {
    if (person === 'A') return personAColor
    if (person === 'B') return personBColor
    return DS.color.text.muted
  }
  const getPersonLabel = (person?: 'A' | 'B') => {
    if (person === 'A') return personAName
    if (person === 'B') return personBName
    return '공유'
  }
  /**
   * 항목 컬럼 배경 (person 색의 연한 톤)
   * - header: 헤더 행용 (조금 더 진함)
   * - cell: 데이터 셀용 (아주 연함)
   */
  const getItemColumnBg = (person?: 'A' | 'B', intensity: 'header' | 'cell' = 'cell') => {
    if (!person) return intensity === 'header' ? DS.color.bg.subtle : 'transparent'
    const color = person === 'A' ? personAColor : personBColor
    const pct = intensity === 'header' ? 18 : 7
    return `color-mix(in srgb, ${color} ${pct}%, white)`
  }

  // ── store ──
  const items = useAssetStore((s) => s.items)
  // entries·costBasisEntries를 subscribe해야 값 변경 시 화면이 다시 그려짐
  const entries = useAssetStore((s) => s.entries)
  const costBasisEntries = useAssetStore((s) => s.costBasisEntries)
  const addItem = useAssetStore((s) => s.addItem)
  const updateItem = useAssetStore((s) => s.updateItem)
  const removeItem = useAssetStore((s) => s.removeItem)
  const setEntry = useAssetStore((s) => s.setEntry)
  const getEntry = useAssetStore((s) => s.getEntry)
  const getCostBasisEntry = useAssetStore((s) => s.getCostBasisEntry)
  const setCostBasisEntry = useAssetStore((s) => s.setCostBasisEntry)
  void costBasisEntries
  const interestAfterTax = useAssetStore((s) => s.interestAfterTax)
  const setInterestAfterTax = useAssetStore((s) => s.setInterestAfterTax)
  /** 이자에 적용할 세율 — 세후 표시가 켜져 있으면 15.4% */
  const taxRate = interestAfterTax ? INTEREST_TAX_RATE : 0

  // ── 계산 (lib/assetCalc 공용 함수) ──
  /** 항목별 첫 입력 월 (만기 이자·누적 이자 계산 기준) */
  const firstEntryYM = useMemo(() => buildFirstEntryMap(entries), [entries])

  /** 과거·현재·미래 월 모두의 표시값 */
  const projectionCtx = { getEntry, currentYear, currentMonth, editableBoundary, firstEntryYM, taxRate }
  const getProjectedValue = (yr: number, item: AssetItem, monthIdx: number): number =>
    projectValue(item, yr, monthIdx, projectionCtx)

  /** 현재 잔액 기준 만기 예상 (가입 시점부터 전체 이자) */
  const getMaturity = (item: AssetItem) =>
    calcMaturity(item, getProjectedValue(currentYear, item, currentMonth), currentYear, currentMonth, {
      startYM: firstEntryYM[item.id],
      taxRate,
    })

  /** 투자 평가손익 (입력 없는 달은 최근 입력값 사용) */
  const getPnl = (item: AssetItem, yr: number, mi: number): number =>
    getEffectivePnl(item, yr, mi, getCostBasisEntry)

  const getSavingsCumulativeInterest = (item: AssetItem, yr: number, mi: number): number =>
    cumulativeInterest(item, yr, mi, getEntry, firstEntryYM[item.id], taxRate)

  /** 명의 순(A → B → 공유) → 그 안에서 이름 가나다 순으로 정렬 */
  const personRank = (p?: 'A' | 'B'): number => (p === 'A' ? 0 : p === 'B' ? 1 : 2)
  const sortedItems = [...items].sort((a, b) => {
    const ra = personRank(a.person)
    const rb = personRank(b.person)
    if (ra !== rb) return ra - rb
    return a.name.localeCompare(b.name, 'ko')
  })

  /** 카테고리별 현재 월 합계 */
  const calcCategoryTotal = (cat: string) => {
    const its = sortedItems.filter((i) =>
      cat === '전체' ? ASSET_CATEGORIES.includes(i.category) : i.category === cat
    )
    return its.reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)
  }

  /** 특정 월의 전체 자산 합계 (자산 카테고리만) */
  const calcMonthTotal = (yr: number, mi: number) =>
    sortedItems
      .filter((item) => ASSET_CATEGORIES.includes(item.category))
      .reduce((sum, item) => sum + getProjectedValue(yr, item, mi), 0)

  /** 특정 연도의 월별 합계 계산 (모든 항목 - 접힘 여부와 무관) */
  const calcMonthTotals = (yr: number) =>
    Array.from({ length: 12 }, (_, mi) => calcMonthTotal(yr, mi))

  // 현재 연도 월별 합계 (summary 카드용)
  const currentYearMonthTotals = calcMonthTotals(currentYear)

  return {
    today,
    canEditNextMonth,
    currentYear,
    currentMonth,
    editableBoundary,
    isMonthEditable,
    personAName,
    personBName,
    getPersonColor,
    getPersonLabel,
    getItemColumnBg,
    items,
    entries,
    sortedItems,
    addItem,
    updateItem,
    removeItem,
    setEntry,
    getEntry,
    getCostBasisEntry,
    setCostBasisEntry,
    firstEntryYM,
    interestAfterTax,
    setInterestAfterTax,
    getProjectedValue,
    getMaturity,
    getPnl,
    getSavingsCumulativeInterest,
    calcCategoryTotal,
    calcMonthTotal,
    calcMonthTotals,
    currentYearMonthTotals,
  }
}

export type AssetModel = ReturnType<typeof useAssetModel>
