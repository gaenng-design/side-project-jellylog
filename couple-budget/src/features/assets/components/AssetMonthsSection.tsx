import { useState, useMemo } from 'react'
import type { AssetItem } from '@/types'
import type { AssetModel } from '../useAssetModel'
import { MonthsTable } from './MonthsTable'

/** 카테고리 탭의 월별 자산 표 — 표시 연도·컬럼 너비 계산 후 MonthsTable 렌더 */
export function AssetMonthsSection({
  model,
  filteredItems,
  collapsedItems,
  toggleCollapse,
  onItemClick,
}: {
  model: AssetModel
  filteredItems: AssetItem[]
  collapsedItems: Set<string>
  toggleCollapse: (itemId: string) => void
  onItemClick: (item: AssetItem) => void
}) {
  const {
    currentYear, currentMonth, editableBoundary, isMonthEditable, sortedItems, entries,
    getProjectedValue, calcMonthTotals, setEntry, getCostBasisEntry, setCostBasisEntry,
    getPersonLabel, getItemColumnBg,
  } = model

  // 표시할 연도 목록: 현재달 기준 앞으로의 2년치 (올해 · 내년, 오래된 → 최신순)
  // 추가로 보고 싶은 미래 연도 수 (기본 2년치 + 사용자가 추가한 만큼)
  const [extraFutureYears, setExtraFutureYears] = useState(0)
  const years = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i <= 1 + extraFutureYears; i++) arr.push(currentYear + i)
    return arr
  }, [currentYear, extraFutureYears])

  // 테이블 너비
  const MONTH_COLUMN_WIDTH = 50
  const BASE_ITEM_COLUMN_WIDTH = 100 // 기본 항목 컬럼 너비
  const COLLAPSED_COLUMN_WIDTH = 40 // 접힌 항목 너비

  /** 항목별 동적 컬럼 너비 계산 (전체 연도의 최대 자릿수 기준, 미래 예측값 포함) */
  const itemColWidths = useMemo(() => {
    const result: Record<string, number> = {}
    for (const item of sortedItems) {
      if (collapsedItems.has(item.id)) {
        result[item.id] = COLLAPSED_COLUMN_WIDTH
        continue
      }
      let maxStrLen = 0
      for (const yr of years) {
        for (let mi = 0; mi < 12; mi++) {
          // 미래 연도 포함 전체 월에 getProjectedValue 사용 (표시값과 동일)
          const val = getProjectedValue(yr, item, mi)
          if (val === 0) continue
          const len = val.toLocaleString('ko-KR').length
          if (len > maxStrLen) maxStrLen = len
        }
      }
      // 7px/자 (12px 폰트 tabular-nums 기준) + padding
      const calculated = maxStrLen * 7 + 16
      result[item.id] = Math.max(BASE_ITEM_COLUMN_WIDTH, calculated)
    }
    return result
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedItems, collapsedItems, entries, years, currentYear, currentMonth])

  /** 합계 컬럼 동적 너비 (전체 연도/월의 최대 합계 자릿수) */
  const sumColWidth = useMemo(() => {
    let maxStrLen = 0
    for (const yr of years) {
      const totals = calcMonthTotals(yr)
      for (const t of totals) {
        if (t === 0) continue
        const len = t.toLocaleString('ko-KR').length
        if (len > maxStrLen) maxStrLen = len
      }
    }
    const calculated = maxStrLen * 7 + 20
    return Math.max(130, calculated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedItems, entries, years, currentYear, currentMonth])

  // 모든 아이템 컬럼 너비를 최대값으로 통일 (접힌 항목 제외)
  const maxItemColWidth = Math.max(
    BASE_ITEM_COLUMN_WIDTH,
    ...sortedItems
      .filter((item) => !collapsedItems.has(item.id))
      .map((item) => itemColWidths[item.id] ?? BASE_ITEM_COLUMN_WIDTH)
  )
  const unifiedItemColWidths: Record<string, number> = Object.fromEntries(
    sortedItems.map((item) => [
      item.id,
      collapsedItems.has(item.id) ? COLLAPSED_COLUMN_WIDTH : maxItemColWidth,
    ])
  )

  const visibleColumnsWidth = sortedItems.reduce(
    (sum, item) => sum + (unifiedItemColWidths[item.id] ?? BASE_ITEM_COLUMN_WIDTH),
    0,
  )
  const tableMinWidth = MONTH_COLUMN_WIDTH + Math.max(visibleColumnsWidth, 200) + sumColWidth

  // 오래된 → 최신 순으로 월 리스트 구성 (최신 월이 표 하단)
  const monthList: { year: number; monthIdx: number }[] = []
  for (const yr of years) {
    for (let mi = 0; mi < 12; mi++) {
      monthList.push({ year: yr, monthIdx: mi })
    }
  }
  const flatMonthTotals = monthList.map(({ year: yr, monthIdx: mi }) =>
    filteredItems.reduce((sum, item) => sum + getProjectedValue(yr, item, mi), 0)
  )

  return (
    <MonthsTable
      months={monthList}
      currentYear={currentYear}
      currentMonth={currentMonth}
      sortedItems={filteredItems}
      collapsedItems={collapsedItems}
      toggleCollapse={toggleCollapse}
      isMonthEditable={isMonthEditable}
      editableBoundary={editableBoundary}
      getProjectedValue={getProjectedValue}
      setEntry={setEntry}
      getCostBasisEntry={getCostBasisEntry}
      setCostBasisEntry={setCostBasisEntry}
      monthTotals={flatMonthTotals}
      onItemClick={onItemClick}
      getPersonLabel={getPersonLabel}
      getItemColumnBg={getItemColumnBg}
      tableMinWidth={tableMinWidth}
      itemColWidths={unifiedItemColWidths}
      sumColWidth={sumColWidth}
      MONTH_COLUMN_WIDTH={MONTH_COLUMN_WIDTH}
      extraFutureYears={extraFutureYears}
      onAddYear={() => setExtraFutureYears((n) => n + 1)}
      onRemoveLastYear={() => setExtraFutureYears((n) => Math.max(0, n - 1))}
    />
  )
}
