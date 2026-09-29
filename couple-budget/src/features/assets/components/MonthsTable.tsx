import { useState, useMemo } from 'react'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { ym } from '@/lib/assetCalc'
import type { AssetItem } from '@/types'
import { MONTHS } from '../assetFormat'
import { AmountCell, SignedAmountCell } from './AmountCells'
import { DS } from '@/design-system/tokens'

/** 자산 테이블 — 여러 연·월을 하나의 표로 표시 */
export function MonthsTable({
  months,
  currentYear,
  currentMonth,
  sortedItems,
  collapsedItems,
  toggleCollapse,
  isMonthEditable,
  editableBoundary,
  getProjectedValue,
  setEntry,
  getCostBasisEntry,
  setCostBasisEntry,
  monthTotals,
  onItemClick,
  getPersonLabel,
  getItemColumnBg,
  tableMinWidth,
  itemColWidths,
  sumColWidth,
  MONTH_COLUMN_WIDTH,
  onAddYear,
  onRemoveLastYear,
  extraFutureYears = 0,
}: {
  months: { year: number; monthIdx: number }[]
  currentYear: number
  currentMonth: number
  sortedItems: AssetItem[]
  collapsedItems: Set<string>
  toggleCollapse: (itemId: string) => void
  isMonthEditable: (yr: number, monthIdx: number) => boolean
  /** 편집 허용 상한 (yyyy*100 + monthIdx) */
  editableBoundary: number
  getProjectedValue: (yr: number, item: AssetItem, monthIdx: number) => number
  setEntry: (itemId: string, yearMonth: string, amount: number) => void
  getCostBasisEntry: (itemId: string, yearMonth: string) => number
  setCostBasisEntry: (itemId: string, yearMonth: string, amount: number) => void
  /** months 와 동일 길이 · 동일 순서의 월 합계 배열 */
  monthTotals: number[]
  onItemClick: (item: AssetItem) => void
  getPersonLabel: (person?: 'A' | 'B') => string
  getItemColumnBg: (person?: 'A' | 'B', intensity?: 'header' | 'cell') => string
  tableMinWidth: number
  /** 각 항목별 동적 너비 (접힘 포함) */
  itemColWidths: Record<string, number>
  /** 합계 컬럼 동적 너비 */
  sumColWidth: number
  MONTH_COLUMN_WIDTH: number
  /** 다음 연도 추가 핸들러 (표 하단 버튼) */
  onAddYear?: () => void
  /** 추가된 마지막 연도(가장 미래)를 되돌리는 핸들러 — 0이면 미표시 */
  onRemoveLastYear?: () => void
  /** 사용자가 추가한 미래 연도 수 (제거 버튼 표시 조건) */
  extraFutureYears?: number
}) {
  // 연도별 접기 (기본: 펼침)
  const [collapsedYears, setCollapsedYears] = useState<Set<number>>(new Set())
  const toggleYear = (yr: number) =>
    setCollapsedYears((prev) => {
      const next = new Set(prev)
      if (next.has(yr)) next.delete(yr)
      else next.add(yr)
      return next
    })

  // 연도별로 월 인덱스를 그룹화 (months 배열 순서 유지)
  const yearGroups = useMemo(() => {
    const groups: { year: number; entries: { monthIdx: number; flatIdx: number }[] }[] = []
    months.forEach((m, flatIdx) => {
      const last = groups[groups.length - 1]
      if (last && last.year === m.year) last.entries.push({ monthIdx: m.monthIdx, flatIdx })
      else groups.push({ year: m.year, entries: [{ monthIdx: m.monthIdx, flatIdx }] })
    })
    return groups
  }, [months])

  const monthHeaderStyle: React.CSSProperties = {
    flex: `0 0 ${MONTH_COLUMN_WIDTH}px`,
    padding: '0 6px',
    borderRight: `1px solid ${DS.color.border.strong}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    fontSize: 11,
    fontWeight: 600,
    color: DS.color.text.secondary,
    background: DS.color.bg.subtle,
    position: 'sticky',
    left: 0,
    zIndex: 2,
    textAlign: 'center',
  }

  /** 합계 컬럼 sticky 기본 스타일 */
  const sumColStyleBase: React.CSSProperties = {
    flex: `0 0 ${sumColWidth}px`,
    marginLeft: 'auto',
    position: 'sticky',
    right: 0,
    zIndex: 2,
  }

  return (
    <div style={{ ...jellyCardStyle, overflow: 'hidden', marginBottom: 16 }}>
      <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: tableMinWidth }}>
            {sortedItems.length > 0 && (
              <>
                {/* 항목명 행 */}
                <div style={{ display: 'flex', borderBottom: `1px solid ${DS.color.border.strong}`, background: DS.color.bg.subtle }}>
                  <div style={monthHeaderStyle}>월</div>
                  {sortedItems.map((item) => {
                    const isCollapsed = collapsedItems.has(item.id)
                    const colWidth = itemColWidths[item.id] ?? 100
                    return (
                      <div
                        key={`name-${item.id}`}
                        style={{
                          flex: `0 0 ${colWidth}px`,
                          padding: '6px 4px 0 4px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: JELLY.text,
                          background: getItemColumnBg(item.person, 'header'),
                          textAlign: 'center',
                          borderRight: `1px solid ${DS.color.border.strong}`,
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          position: 'relative',
                          minHeight: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                        }}
                        title={isCollapsed ? `${item.name} (접힘) - 클릭하여 펼치기` : `${item.name} (${getPersonLabel(item.person)})`}
                      >
                        {/* 접기/펼치기 토글 (셀 좌측 끝 절대 위치) */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCollapse(item.id)
                          }}
                          title={isCollapsed ? '펼치기' : '접기'}
                          style={{
                            position: 'absolute',
                            left: 4,
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: 16,
                            height: 18,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 12,
                            lineHeight: 1,
                            color: DS.color.text.muted,
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontFamily: 'inherit',
                          }}
                        >
                          {isCollapsed ? '>' : '<'}
                        </button>
                        {!isCollapsed && (
                          <div
                            onClick={() => onItemClick(item)}
                            style={{
                              cursor: 'pointer',
                              minWidth: 0,
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              padding: '0 14px',
                              display: 'inline-flex',
                              flexDirection: 'column',
                              alignItems: 'center',
                              gap: 2,
                            }}
                          >
                            <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                              {item.locked && (
                                <span title="묶인 돈" style={{ fontSize: 11, flexShrink: 0 }}>🔒</span>
                              )}
                              <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                            </div>
                            {item.category === '투자' && (
                              <div style={{ display: 'flex', gap: 4, fontSize: 9, color: DS.color.text.muted, fontWeight: 400 }}>
                                <span>총 잔고</span><span>·</span><span>평가 손익</span>
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div
                    style={{
                      ...sumColStyleBase,
                      padding: '0 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: JELLY.text,
                      background: DS.color.bg.subtle,
                      textAlign: 'center',
                      borderLeft: `2px solid ${DS.color.border.strong}`,
                      minHeight: 36,
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                    }}
                  >
                    합계
                  </div>
                </div>

                {/* 카테고리 행 */}
                <div style={{ display: 'flex', borderBottom: `2px solid ${DS.color.border.strong}`, background: DS.color.bg.subtle }}>
                  <div style={{ ...monthHeaderStyle, background: DS.color.bg.subtle }} />
                  {sortedItems.map((item) => {
                    const isCollapsed = collapsedItems.has(item.id)
                    const colWidth = itemColWidths[item.id] ?? 100
                    return (
                      <div
                        key={`cat-${item.id}`}
                        onClick={() => !isCollapsed && onItemClick(item)}
                        style={{
                          flex: `0 0 ${colWidth}px`,
                          padding: '4px 4px 6px 4px',
                          fontSize: 10,
                          color: DS.color.text.muted,
                          background: getItemColumnBg(item.person, 'header'),
                          textAlign: 'center',
                          borderRight: `1px solid ${DS.color.border.strong}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-start',
                          gap: 2,
                          cursor: isCollapsed ? 'default' : 'pointer',
                          minHeight: 36,
                          overflow: 'hidden',
                        }}
                      >
                        {!isCollapsed && (
                          <>
                            <div>{
                              item.category === '저축'
                                ? (item.savingsType === 'deposit' ? '예금' : item.savingsType === 'checking' ? '입출금' : item.savingsType === 'subscription' ? '청약' : '적금')
                                : item.category
                            }</div>
                            {item.defaultAmount && item.savingsType !== 'deposit' ? (
                              <div style={{ fontSize: 9, color: DS.color.text.secondary, fontWeight: 500 }}>
                                +{item.defaultAmount.toLocaleString('ko-KR')}
                              </div>
                            ) : null}
                          </>
                        )}
                      </div>
                    )
                  })}
                  <div
                    style={{
                      ...sumColStyleBase,
                      padding: '0 12px',
                      background: DS.color.bg.subtle,
                      borderLeft: `2px solid ${DS.color.border.strong}`,
                      minHeight: 36,
                      display: 'flex',
                      alignItems: 'center',
                    }}
                  />
                </div>
              </>
            )}

            {/* 월별 행 (다년도 통합 · 연도별 접기) */}
            {sortedItems.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: DS.color.text.muted, fontSize: 14 }}>
                아래 '+ 추가' 버튼으로 자산 항목을 추가해주세요.
              </div>
            ) : (
              yearGroups.map((group, groupIdx) => {
                const isCollapsed = collapsedYears.has(group.year)
                const isLastGroup = groupIdx === yearGroups.length - 1
                const isCurrentYearGroup = group.year === currentYear
                return (
                  <div key={`yg-${group.year}`}>
                    {/* 연도 헤더 (접기 토글) — 행 자체는 표 전체 너비를 점유하되, 표시 영역은 sticky 로 좌측 고정 */}
                    <div
                      onClick={() => toggleYear(group.year)}
                      style={{
                        background: isCurrentYearGroup ? 'rgba(79, 140, 255, 0.14)' : DS.color.bg.muted,
                        cursor: 'pointer',
                        userSelect: 'none',
                        borderTop: groupIdx === 0 ? 'none' : `2px solid ${DS.color.border.strong}`,
                        borderBottom: isCollapsed
                          ? isLastGroup
                            ? 'none'
                            : `1px solid ${DS.color.border.default}`
                          : `1px solid ${DS.color.border.strong}`,
                      }}
                    >
                      <div
                        style={{
                          position: 'sticky',
                          left: 0,
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: 8,
                          padding: '8px 12px',
                          zIndex: 3,
                          // 외부 행이 이미 동일 배경을 가지므로 중복 적용하면 반투명 색이 겹쳐 짙어짐 → 투명 유지
                        }}
                      >
                        <span style={{ fontSize: 11, color: isCurrentYearGroup ? PRIMARY : DS.color.text.secondary }}>
                          {isCollapsed ? '▶' : '▼'}
                        </span>
                        <span style={{ fontSize: 13, fontWeight: 700, color: isCurrentYearGroup ? PRIMARY : JELLY.text }}>
                          {group.year}년
                        </span>
                        {isCurrentYearGroup && (
                          <span
                            style={{
                              fontSize: 9,
                              fontWeight: 600,
                              color: DS.color.text.inverse,
                              background: PRIMARY,
                              padding: '1px 6px',
                              borderRadius: 999,
                            }}
                          >
                            현재
                          </span>
                        )}
                      </div>
                    </div>

                    {/* 월 행 (접힌 경우 숨김) */}
                    {!isCollapsed && group.entries.map(({ monthIdx: mi, flatIdx: idx }, withinGroupIdx) => {
                      const yr = group.year
                      const editable = isMonthEditable(yr, mi)
                      const isFuture = !editable
                      const isCurrent = yr === currentYear && mi === currentMonth
                      const isLastRowInGroup = withinGroupIdx === group.entries.length - 1
                      const isLastRow = isLastGroup && isLastRowInGroup
                      const monthLabel = MONTHS[mi]
                      const total = monthTotals[idx] ?? 0
                      return (
                        <div
                          key={`${yr}-${mi}`}
                          style={{
                            display: 'flex',
                            borderBottom: isLastRow ? 'none' : `1px solid ${DS.color.border.default}`,
                            // 반투명 색 아래에 흰색 베이스를 깔아 다른 컬럼이 비치지 않도록 처리
                            background: isCurrent
                              ? `linear-gradient(rgba(79, 140, 255, 0.06), rgba(79, 140, 255, 0.06)), ${DS.color.bg.secondary}`
                              : isFuture
                                ? `linear-gradient(rgba(243,244,246,0.5), rgba(243,244,246,0.5)), ${DS.color.bg.secondary}`
                                : undefined,
                          }}
                        >
                          <div
                            style={{
                              ...monthHeaderStyle,
                              color: isCurrent ? PRIMARY : isFuture ? DS.color.text.muted : undefined,
                              fontWeight: isCurrent ? 700 : 600,
                              background: isCurrent
                                ? `linear-gradient(rgba(79, 140, 255, 0.10), rgba(79, 140, 255, 0.10)), ${DS.color.bg.secondary}`
                                : monthHeaderStyle.background,
                              padding: '4px 6px',
                              lineHeight: 1.1,
                            }}
                          >
                            <span>{monthLabel}</span>
                          </div>
                    {sortedItems.map((item) => {
                      const isCollapsed = collapsedItems.has(item.id)
                      const colWidth = itemColWidths[item.id] ?? 100
                      const displayValue = getProjectedValue(yr, item, mi)
                      return (
                        <div
                          key={`${item.id}-${yr}-${mi}`}
                          style={{
                            flex: `0 0 ${colWidth}px`,
                            padding: 0,
                            borderRight: `1px solid ${DS.color.border.default}`,
                            background: isCollapsed
                              ? DS.color.bg.subtle
                              : getItemColumnBg(item.person, 'cell'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isCollapsed ? (
                            <span style={{ fontSize: 10, color: DS.color.border.default }}>…</span>
                          ) : item.category === '투자' ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                              {/* 총 잔고 행 */}
                              <div style={{ borderBottom: `1px solid ${DS.color.border.subtle}`, background: 'rgba(249,250,251,0.7)' }}>
                                <AmountCell
                                  value={displayValue}
                                  onChange={(v) => {
                                    const amount = v ? parseInt(v.replace(/,/g, ''), 10) : 0
                                    setEntry(item.id, ym(yr, mi), amount)
                                  }}
                                  disabled={!editable}
                                  projected={isFuture}
                                />
                              </div>
                              {/* 평가 손익 행 (signed) */}
                              <SignedAmountCell
                                value={getCostBasisEntry(item.id, ym(yr, mi))}
                                onChange={(v) => setCostBasisEntry(item.id, ym(yr, mi), v)}
                                disabled={!editable}
                                projected={isFuture}
                              />
                            </div>
                          ) : (
                            <AmountCell
                              value={displayValue}
                              onChange={(v) => {
                                const amount = v ? parseInt(v.replace(/,/g, ''), 10) : 0
                                setEntry(item.id, ym(yr, mi), amount)
                              }}
                              disabled={!editable}
                              projected={isFuture}
                            />
                          )}
                        </div>
                      )
                    })}
                    {/* 월 합계 (오른쪽 sticky) — 좌측 구분선·너비를 헤더와 통일, 반투명 배경 아래에 white 깔기 */}
                    <div
                      style={{
                        ...sumColStyleBase,
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontSize: 12,
                        fontWeight: 600,
                        color: total > 0 ? PRIMARY : DS.color.border.default,
                        borderLeft: `2px solid ${DS.color.border.strong}`,
                        minHeight: 36,
                        // 반투명 배경의 sticky 셀에서 뒤쪽 컬럼이 비치지 않도록 항상 white를 베이스로 깔고 위에 색을 얹음
                        background: isCurrent
                          ? `linear-gradient(rgba(79, 140, 255, 0.10), rgba(79, 140, 255, 0.10)), ${DS.color.bg.secondary}`
                          : isFuture
                            ? `linear-gradient(rgba(243,244,246,0.95), rgba(243,244,246,0.95)), ${DS.color.bg.secondary}`
                            : DS.color.bg.secondary,
                      }}
                    >
                            {total > 0 ? total.toLocaleString('ko-KR') : '—'}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              })
            )}

            {/* 다음 연도 추가 / 마지막 추가 연도 제거 — 가로 스크롤과 무관하게 좌측 고정 */}
            {sortedItems.length > 0 && (onAddYear || (onRemoveLastYear && extraFutureYears > 0)) && (
              <div
                style={{
                  borderTop: `1px solid ${DS.color.border.default}`,
                  background: DS.color.bg.subtle,
                }}
              >
                <div
                  style={{
                    position: 'sticky',
                    left: 0,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 8,
                    padding: '10px 12px',
                    zIndex: 3,
                  }}
                >
                  {onAddYear && (
                    <button
                      type="button"
                      onClick={onAddYear}
                      style={{
                        fontSize: 12,
                        fontWeight: 600,
                        padding: '6px 14px',
                        borderRadius: 999,
                        border: `1px dashed ${PRIMARY}`,
                        background: 'rgba(79, 140, 255, 0.08)',
                        color: PRIMARY,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      + 다음 연도 추가
                    </button>
                  )}
                  {onRemoveLastYear && extraFutureYears > 0 && (
                    <button
                      type="button"
                      onClick={onRemoveLastYear}
                      title="마지막에 추가된 연도를 제거"
                      style={{
                        fontSize: 12,
                        fontWeight: 500,
                        padding: '6px 12px',
                        borderRadius: 999,
                        border: `1px solid ${DS.color.border.subtle}`,
                        background: DS.color.bg.secondary,
                        color: DS.color.text.secondary,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      − 연도 제거
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
    </div>
  )
}
