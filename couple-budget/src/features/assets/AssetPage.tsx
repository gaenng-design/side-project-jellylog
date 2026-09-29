import { useState, useRef, useMemo } from 'react'
import { useAssetStore, ASSET_CATEGORIES } from '@/store/useAssetStore'
import { useAppStore } from '@/store/useAppStore'
import { CustomSelect } from '@/components/CustomSelect'
import { AmountInput } from '@/components/AmountInput'
import { InlineEdit } from '@/components/InlineEdit'
import { Modal } from '@/components/Modal'
import { JELLY, jellyCardStyle, jellyPrimaryButton, jellyInputSurface } from '@/styles/jellyGlass'
import { pageTitleH1Style, PRIMARY, PRIMARY_LIGHT, settingsTemplateDeleteButtonStyle, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE } from '@/styles/formControls'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import type { AssetItem } from '@/types'

const MONTHS = ['1월', '2월', '3월', '4월', '5월', '6월', '7월', '8월', '9월', '10월', '11월', '12월']
const fmt = (n: number) => (n === 0 ? '' : n.toLocaleString('ko-KR'))
/** 만원 단위 값을 억이 넘으면 "N억 N,NNN만" 형식으로 표기 */
const fmtMan = (manWon: number): string => {
  const abs = Math.abs(manWon)
  const sign = manWon < 0 ? '-' : ''
  if (abs >= 10000) {
    const eok = Math.floor(abs / 10000)
    const man = abs % 10000
    return sign + eok.toLocaleString('ko-KR') + '억' + (man > 0 ? ' ' + man.toLocaleString('ko-KR') + '만' : '')
  }
  return sign + abs.toLocaleString('ko-KR') + '만'
}
const fmtSum = (n: number) => n.toLocaleString('ko-KR') + '원'

function ym(year: number, monthIdx: number) {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`
}

function AmountCell({
  value,
  onChange,
  disabled,
  projected,
}: {
  value: number
  onChange: (v: string) => void
  disabled?: boolean
  projected?: boolean  // 미래 예측값 (읽기전용, 다른 스타일)
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setRaw(value === 0 ? '' : String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    // 정확한 금액 계산: raw값이 공백이면 0, 아니면 파싱
    const cleanValue = raw.replace(/,/g, '')
    const parsed = cleanValue === '' ? '' : cleanValue
    console.log('[AmountCell] commit:', { raw, cleanValue, parsed, disabled })
    onChange(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        style={{
          width: '100%',
          height: 36,
          padding: '0 8px',
          border: `1.5px solid ${PRIMARY}`,
          borderRadius: 0,
          fontSize: 12,
          textAlign: 'right',
          outline: 'none',
          boxSizing: 'border-box',
          background: '#fff',
          fontFamily: 'inherit',
          color: JELLY.text,
        }}
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && !projected && startEdit()}
      style={{
        width: '100%',
        minHeight: 36,
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px',
        fontSize: 12,
        color: projected
          ? (value === 0 ? '#d1d5db' : '#9ca3af')  // 예측값: 회색
          : (value === 0 ? '#d1d5db' : JELLY.text),
        cursor: (disabled || projected) ? 'default' : 'pointer',
        userSelect: 'none',
        background: projected
          ? (value > 0 ? 'rgba(156, 163, 175, 0.06)' : 'transparent')  // 예측값: 연회색 배경
          : 'transparent',
        border: '1.5px solid transparent',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        fontStyle: projected ? 'italic' : 'normal',  // 예측값: 이탤릭
      }}
    >
      {value === 0 ? '—' : value.toLocaleString('ko-KR')}
    </div>
  )
}


/** 투자 평가 손익용: +/- 입력 지원, 색상 표시 */
function SignedAmountCell({
  value,
  onChange,
  disabled,
  projected,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  projected?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setRaw(value === 0 ? '' : String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    const cleaned = raw.replace(/,/g, '').trim()
    const parsed = cleaned === '' ? 0 : parseInt(cleaned, 10)
    onChange(isNaN(parsed) ? 0 : parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder="+/- 금액"
        style={{
          width: '100%',
          height: 36,
          padding: '0 8px',
          border: `1.5px solid ${PRIMARY}`,
          borderRadius: 0,
          fontSize: 12,
          textAlign: 'right',
          outline: 'none',
          boxSizing: 'border-box',
          background: '#fff',
          fontFamily: 'inherit',
          color: JELLY.text,
        }}
      />
    )
  }

  const isNeg = value < 0
  const isPos = value > 0
  return (
    <div
      onClick={() => !disabled && !projected && startEdit()}
      style={{
        width: '100%',
        minHeight: 36,
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px',
        fontSize: 12,
        color: isNeg ? '#dc2626' : isPos ? '#059669' : '#d1d5db',
        cursor: (disabled || projected) ? 'default' : 'pointer',
        userSelect: 'none',
        background: 'transparent',
        border: '1.5px solid transparent',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        fontWeight: (isNeg || isPos) ? 600 : 400,
      }}
    >
      {value === 0 ? '—' : (isPos ? '+' : '') + value.toLocaleString('ko-KR')}
    </div>
  )
}

/** 자산 테이블 — 여러 연·월을 하나의 표로 표시 */
function MonthsTable({
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
    borderRight: '1px solid #b3b8c1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 36,
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    background: '#f9fafb',
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
                <div style={{ display: 'flex', borderBottom: '1px solid #b3b8c1', background: '#f9fafb' }}>
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
                          borderRight: '1px solid #b3b8c1',
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
                            color: '#9ca3af',
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
                              <div style={{ display: 'flex', gap: 4, fontSize: 9, color: '#9ca3af', fontWeight: 400 }}>
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
                      background: '#f9fafb',
                      textAlign: 'center',
                      borderLeft: '2px solid #b3b8c1',
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
                <div style={{ display: 'flex', borderBottom: '2px solid #b3b8c1', background: '#fafbfc' }}>
                  <div style={{ ...monthHeaderStyle, background: '#fafbfc' }} />
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
                          color: '#9ca3af',
                          background: getItemColumnBg(item.person, 'header'),
                          textAlign: 'center',
                          borderRight: '1px solid #b3b8c1',
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
                            {item.defaultAmount ? (
                              <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500 }}>
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
                      background: '#fafbfc',
                      borderLeft: '2px solid #b3b8c1',
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
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
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
                        background: isCurrentYearGroup ? 'rgba(79, 140, 255, 0.14)' : '#f3f4f6',
                        cursor: 'pointer',
                        userSelect: 'none',
                        borderTop: groupIdx === 0 ? 'none' : '2px solid #b3b8c1',
                        borderBottom: isCollapsed
                          ? isLastGroup
                            ? 'none'
                            : '1px solid #d1d5db'
                          : '1px solid #b3b8c1',
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
                        <span style={{ fontSize: 11, color: isCurrentYearGroup ? PRIMARY : '#6b7280' }}>
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
                              color: '#fff',
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
                            borderBottom: isLastRow ? 'none' : '1px solid #d1d5db',
                            // 반투명 색 아래에 흰색 베이스를 깔아 다른 컬럼이 비치지 않도록 처리
                            background: isCurrent
                              ? 'linear-gradient(rgba(79, 140, 255, 0.06), rgba(79, 140, 255, 0.06)), #fff'
                              : isFuture
                                ? 'linear-gradient(rgba(243,244,246,0.5), rgba(243,244,246,0.5)), #fff'
                                : undefined,
                          }}
                        >
                          <div
                            style={{
                              ...monthHeaderStyle,
                              color: isCurrent ? PRIMARY : isFuture ? '#9ca3af' : undefined,
                              fontWeight: isCurrent ? 700 : 600,
                              background: isCurrent
                                ? 'linear-gradient(rgba(79, 140, 255, 0.10), rgba(79, 140, 255, 0.10)), #fff'
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
                            borderRight: '1px solid #d1d5db',
                            background: isCollapsed
                              ? '#fafbfc'
                              : getItemColumnBg(item.person, 'cell'),
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                          }}
                        >
                          {isCollapsed ? (
                            <span style={{ fontSize: 10, color: '#d1d5db' }}>…</span>
                          ) : item.category === '투자' ? (
                            <div style={{ width: '100%', display: 'flex', flexDirection: 'column' }}>
                              {/* 총 잔고 행 */}
                              <div style={{ borderBottom: '1px solid #e5e7eb', background: 'rgba(249,250,251,0.7)' }}>
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
                        color: total > 0 ? PRIMARY : '#d1d5db',
                        borderLeft: '2px solid #b3b8c1',
                        minHeight: 36,
                        // 반투명 배경의 sticky 셀에서 뒤쪽 컬럼이 비치지 않도록 항상 white를 베이스로 깔고 위에 색을 얹음
                        background: isCurrent
                          ? 'linear-gradient(rgba(79, 140, 255, 0.10), rgba(79, 140, 255, 0.10)), #fff'
                          : isFuture
                            ? 'linear-gradient(rgba(243,244,246,0.95), rgba(243,244,246,0.95)), #fff'
                            : '#ffffff',
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
                  borderTop: '1px solid #d1d5db',
                  background: '#fafbfc',
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
                        border: '1px solid #e5e7eb',
                        background: '#fff',
                        color: '#6b7280',
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


const ToggleSwitch = ({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
      gap: 8, userSelect: 'none',
    }}
  >
    <div style={{
      position: 'relative', width: 44, height: 24,
      borderRadius: 12,
      background: checked ? PRIMARY : '#d1d5db',
      transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        width: 20, height: 20,
        borderRadius: '50%',
        background: '#fff',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
    <span style={{ fontSize: 13, color: checked ? PRIMARY : '#9ca3af' }}>
      {checked ? '🔒 만기까지 묶인 자산' : '해제'}
    </span>
  </div>
)

function AddItemModal({ onAdd, personAName, personBName, initialCategory, onClose }: {
  onAdd: (params: {
    name: string; category: string; defaultAmount: number; person: 'A' | 'B' | undefined
    locked: boolean; initialAmount?: number
    savingsType?: 'installment' | 'deposit' | 'checking' | 'subscription'
    interestRate?: number; maturityDate?: string
  }) => void
  personAName: string
  personBName: string
  initialCategory: string
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [person, setPerson] = useState<'A' | 'B'>('A')
  const [initialAmount, setInitialAmount] = useState('')
  const [defaultAmount, setDefaultAmount] = useState('')
  const [locked, setLocked] = useState(false)
  const [savingsType, setSavingsType] = useState<'installment' | 'deposit' | 'checking' | 'subscription'>('installment')
  const [interestRate, setInterestRate] = useState('')
  const [maturityDate, setMaturityDate] = useState('')

  const isDeposit = category === '저축' && savingsType === 'deposit'
  const needsRateDate = category === '저축' && savingsType !== 'checking' && savingsType !== 'subscription'
  const savingsValid = category !== '저축' || savingsType === 'checking' || savingsType === 'subscription' || (!!interestRate && !!maturityDate)
  const canSubmit = name.trim() && savingsValid

  const handleAdd = () => {
    if (!canSubmit) return
    const defAmt = defaultAmount ? parseInt(defaultAmount.replace(/,/g, ''), 10) : 0
    const initAmt = initialAmount ? parseInt(initialAmount.replace(/,/g, ''), 10) : 0
    onAdd({
      name: name.trim(), category,
      defaultAmount: defAmt,
      person,
      locked,
      initialAmount: initAmt || undefined,
      savingsType: category === '저축' ? savingsType : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      maturityDate: (needsRateDate && maturityDate) ? maturityDate : undefined,
    })
    onClose()
  }

  const personOptions = [
    { value: 'A', label: personAName },
    { value: 'B', label: personBName },
  ]

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, height: 36, borderRadius: INPUT_BORDER_RADIUS,
    border: active ? `1.5px solid ${PRIMARY}` : '1px solid #e5e7eb',
    background: active ? `rgba(79,140,255,0.1)` : '#fff',
    fontSize: 12, fontWeight: active ? 600 : 400,
    color: active ? PRIMARY : '#6b7280',
    cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: '#fff', borderRadius: 16, padding: '24px 20px',
        width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: '#111827' }}>항목 추가</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#9ca3af', padding: '0 4px' }}>×</button>
        </div>

        {/* 카테고리 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>카테고리 <span style={{ color: '#ef4444' }}>*</span></div>
          <CustomSelect options={ASSET_CATEGORIES} value={category} onChange={setCategory} compact compactFill compactHeight={40} />
        </div>

        {/* 항목명 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>항목명 <span style={{ color: '#ef4444' }}>*</span></div>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="항목명" onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: INPUT_BORDER_RADIUS, fontSize: INPUT_FONT_SIZE, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', ...jellyInputSurface, color: '#232d3c' }}
          />
        </div>

        {/* 명의 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>명의 <span style={{ color: '#ef4444' }}>*</span></div>
          <CustomSelect
            options={personOptions.map(o => o.label)}
            value={personOptions.find(o => o.value === person)?.label ?? personAName}
            onChange={(label) => { const opt = personOptions.find(o => o.label === label); if (opt) setPerson(opt.value as 'A' | 'B') }}
            compact compactFill compactHeight={40}
          />
        </div>

        {/* 저축 종류 */}
        {category === '저축' && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>종류 <span style={{ color: '#ef4444' }}>*</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {(['installment', 'deposit', 'checking', 'subscription'] as const).map((type) => {
                const label = type === 'installment' ? '적금' : type === 'deposit' ? '예금' : type === 'subscription' ? '청약' : '입출금'
                return (
                  <button key={type} type="button" onClick={() => setSavingsType(type)} style={btnStyle(savingsType === type)}>{label}</button>
                )
              })}
            </div>
          </div>
        )}

        {/* 예금액 (예금 전용) */}
        {isDeposit && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>예금액 <span style={{ color: '#ef4444' }}>*</span></div>
            <AmountInput value={initialAmount} onChange={setInitialAmount} placeholder="예금 원금" height={40} />
          </div>
        )}

        {/* 초기 금액 (예금 외) */}
        {!isDeposit && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>초기 금액 (선택)</div>
            <AmountInput value={initialAmount} onChange={setInitialAmount} placeholder="이미 보유한 금액" height={40} />
          </div>
        )}

        {/* 정기 납입액 (부동산·예금 제외) */}
        {category !== '부동산' && !isDeposit && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>
              {category === '저축' ? '월 납입액' : '월 정기 입금액'} (선택)
            </div>
            <AmountInput value={defaultAmount} onChange={setDefaultAmount} placeholder="0" height={40} />
          </div>
        )}

        {/* 연이율 (저축, checking·subscription 제외) */}
        {needsRateDate && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>연이율 % <span style={{ color: '#ef4444' }}>*</span></div>
            <input
              type="number" min="0" max="100" step="0.1" value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)} placeholder="예: 3.5"
              style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: INPUT_BORDER_RADIUS, fontSize: INPUT_FONT_SIZE, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', ...jellyInputSurface, color: '#232d3c' }}
            />
          </div>
        )}

        {/* 만기일 (저축, checking·subscription 제외) */}
        {needsRateDate && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>만기일 <span style={{ color: '#ef4444' }}>*</span></div>
            <input
              type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: INPUT_BORDER_RADIUS, fontSize: INPUT_FONT_SIZE, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', ...jellyInputSurface, color: '#232d3c' }}
            />
          </div>
        )}

        {/* 묶인 돈 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>묶인 돈</div>
          <ToggleSwitch checked={locked} onChange={setLocked} />
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: 44, borderRadius: INPUT_BORDER_RADIUS, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, cursor: 'pointer', color: '#6b7280', fontFamily: 'inherit' }}>
            취소
          </button>
          <button
            type="button" onClick={handleAdd}
            style={{ ...jellyPrimaryButton, flex: 2, height: 44, fontSize: 14, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'default' }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}

export function AssetPage() {
  const narrow = useNarrowLayout()
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
  const editableBoundaryDate = canEditNextMonth
    ? new Date(today.getFullYear(), today.getMonth() + 1, 1)
    : today
  const editableBoundary = editableBoundaryDate.getFullYear() * 100 + editableBoundaryDate.getMonth()

  // 표시할 연도 목록: 현재달 기준 앞으로의 2년치 (올해 · 내년, 오래된 → 최신순)
  // 추가로 보고 싶은 미래 연도 수 (기본 2년치 + 사용자가 추가한 만큼)
  const [extraFutureYears, setExtraFutureYears] = useState(0)
  const years = useMemo(() => {
    const arr: number[] = []
    for (let i = 0; i <= 1 + extraFutureYears; i++) arr.push(currentYear + i)
    return arr
  }, [currentYear, extraFutureYears])

  /** 항목 접기 상태 (모든 연도 공통) */
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  const toggleCollapse = (itemId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  /** 월이 편집 가능한지 — 이번 달 + 다음 달까지 허용 */
  const isMonthEditable = (yr: number, monthIdx: number): boolean => {
    if (yr < currentYear) return true
    return yr * 100 + monthIdx <= editableBoundary
  }

  /**
   * 저장값이 없는 과거·현재 달에 대해 직전 저장 월 + defaultAmount 누적으로 추산.
   * 저장값이 있으면 그대로 반환.
   */
  const getEffectiveEntry = (item: AssetItem, yr: number, mi: number): number => {
    if (item.closedYM && ym(yr, mi) > item.closedYM) return 0
    const stored = getEntry(item.id, ym(yr, mi))
    if (stored !== 0) return stored
    for (let offset = 1; offset <= 24; offset++) {
      let pYr = yr
      let pMi = mi - offset
      while (pMi < 0) { pMi += 12; pYr-- }
      if (pYr < 2020) break
      const prevVal = getEntry(item.id, ym(pYr, pMi))
      if (prevVal > 0) {
        if (!item.defaultAmount || item.defaultAmount <= 0) return prevVal
        return prevVal + item.defaultAmount * offset
      }
    }
    return 0
  }

  /** 과거·현재·미래 월 모두의 표시값 계산 */
  const getProjectedValue = (yr: number, item: AssetItem, monthIdx: number): number => {
    // 편집 허용 범위(이번 달 + 다음 달)까지는 실제 입력값 (없으면 추산)
    if (yr * 100 + monthIdx <= editableBoundary) {
      return getEffectiveEntry(item, yr, monthIdx)
    }
    // 미래 달: 현재 달의 유효값을 베이스로 계산
    const base = getEffectiveEntry(item, currentYear, currentMonth)
    const gap = (yr - currentYear) * 12 + (monthIdx - currentMonth)
    const rate = (item.category === '저축' && item.interestRate) ? item.interestRate / 100 : 0
    const monthly = item.defaultAmount && item.defaultAmount > 0 ? item.defaultAmount : 0
    if (rate > 0 && item.category === '저축') {
      if (item.savingsType === 'deposit') {
        // 예금: 원금에 단리 이자 적용
        return Math.round(base * (1 + rate * gap / 12))
      } else if (item.savingsType === 'installment') {
        // 적금: 현재 잔액 이자 + 납입분 + 납입분 이자
        const interestOnBase = base * rate * gap / 12
        const futureDeposits = monthly * gap
        const interestOnFuture = monthly * (rate / 12) * (gap * (gap - 1) / 2)
        return Math.round(base + interestOnBase + futureDeposits + interestOnFuture)
      }
    }
    if (monthly > 0) return base + monthly * gap
    return base
  }

  /** 저축 항목의 누적 이자 (원금 대비 수익 계산용) */
  const getSavingsCumulativeInterest = (item: AssetItem, yr: number, mi: number): number => {
    if (item.category !== '저축' || !item.interestRate || item.savingsType === 'checking' || item.savingsType === 'subscription') return 0
    const rate = item.interestRate / 100
    // 가장 오래된 entry 찾기
    const itemEntries = entries.filter((e) => e.itemId === item.id)
    if (itemEntries.length === 0) return 0
    const earliest = itemEntries.reduce((min, e) => (e.yearMonth < min ? e.yearMonth : min), itemEntries[0].yearMonth)
    const [eYr, eMo] = earliest.split('-').map(Number)
    const startYr = eYr
    const startMi = eMo - 1
    const elapsed = (yr - startYr) * 12 + (mi - startMi)
    if (elapsed <= 0) return 0
    const principal = getEntry(item.id, ym(startYr, startMi))
    if (item.savingsType === 'deposit') {
      return principal * rate * elapsed / 12
    } else {
      // 적금: 매달 납입분 이자 누적 = monthly × rate/12 × Σ(elapsed, elapsed-1, ..., 1)
      const monthly = item.defaultAmount ?? 0
      return monthly * (rate / 12) * elapsed * (elapsed + 1) / 2
    }
  }

  const personAName = settings.personAName || '유저 1'
  const personBName = settings.personBName || '유저 2'
  const personAColor = settings.user1Color
  const personBColor = settings.user2Color

  const getPersonColor = (person?: 'A' | 'B') => {
    if (person === 'A') return personAColor
    if (person === 'B') return personBColor
    return '#9ca3af'
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
    if (!person) return intensity === 'header' ? '#f9fafb' : 'transparent'
    const color = person === 'A' ? personAColor : personBColor
    const pct = intensity === 'header' ? 18 : 7
    return `color-mix(in srgb, ${color} ${pct}%, white)`
  }

  const items = useAssetStore((s) => s.items)
  // entries를 subscribe해야 setEntry 후 컴포넌트가 re-render됨 (이전달 수정 시 화면 갱신용)
  const entries = useAssetStore((s) => s.entries)
  const addItem = useAssetStore((s) => s.addItem)
  const updateItem = useAssetStore((s) => s.updateItem)
  const removeItem = useAssetStore((s) => s.removeItem)
  const reorderItem = useAssetStore((s) => s.reorderItem)
  const setEntry = useAssetStore((s) => s.setEntry)
  const getEntry = useAssetStore((s) => s.getEntry)
  const getCostBasisEntry = useAssetStore((s) => s.getCostBasisEntry)
  const setCostBasisEntry = useAssetStore((s) => s.setCostBasisEntry)
  const costBasisEntries = useAssetStore((s) => s.costBasisEntries)
  // entries 사용 표시 (lint warning 방지) - subscribe 목적
  void entries
  void costBasisEntries

  // 카테고리 필터 탭
  const [categoryFilter, setCategoryFilter] = useState('전체')

  // 항목 수정 모달
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [editForm, setEditForm] = useState({ name: '', category: '저축', defaultAmount: '', person: '공유' as 'A' | 'B' | '공유', locked: false, interestRate: '', savingsType: 'installment' as 'installment' | 'deposit' | 'checking' | 'subscription', costBasis: '', returnRate: '', maturityDate: '', closedYM: '' })

  /** 명의 순(A → B → 공유) → 그 안에서 order 순으로 정렬 */
  const personRank = (p?: 'A' | 'B'): number => (p === 'A' ? 0 : p === 'B' ? 1 : 2)
  const sortedItems = [...items].sort((a, b) => {
    const ra = personRank(a.person)
    const rb = personRank(b.person)
    if (ra !== rb) return ra - rb
    return a.order - b.order
  })

  const filteredItems = categoryFilter === '전체'
    ? sortedItems
    : sortedItems.filter((item) => item.category === categoryFilter)

  /** 카테고리별 현재 월 합계 */
  const calcCategoryTotal = (cat: string) => {
    const its = sortedItems.filter((i) =>
      cat === '전체' ? ASSET_CATEGORIES.includes(i.category) : i.category === cat
    )
    return its.reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)
  }

  /** 특정 연도의 월별 합계 계산 (모든 항목 - 접힘 여부와 무관) */
  const calcMonthTotals = (yr: number) =>
    Array.from({ length: 12 }, (_, mi) =>
      sortedItems
        .filter((item) => ASSET_CATEGORIES.includes(item.category))
        .reduce((sum, item) => sum + getProjectedValue(yr, item, mi), 0)
    )

  // 현재 연도 월별 합계 (summary 카드용)
  const currentYearMonthTotals = calcMonthTotals(currentYear)

  // 테이블 너비
  const MONTH_COLUMN_WIDTH = 50
  const BASE_ITEM_COLUMN_WIDTH = 100 // 기본 항목 컬럼 너비
  const COLLAPSED_COLUMN_WIDTH = 40 // 접힌 항목 너비

  /** 항목별 동적 컬럼 너비 계산 (전체 연도의 최대 자릿수 기준) */
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
          const isFuture = yr === currentYear && mi > currentMonth
          const val = isFuture ? getProjectedValue(yr, item, mi) : getEntry(item.id, ym(yr, mi))
          if (val === 0) continue
          const len = val.toLocaleString('ko-KR').length
          if (len > maxStrLen) maxStrLen = len
        }
      }
      // 자릿수 기반(12px 폰트 가정) + padding 여유
      const calculated = maxStrLen * 4 + 12
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
    const calculated = maxStrLen * 4 + 20
    return Math.max(130, calculated)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sortedItems, entries, years, currentYear, currentMonth])

  const visibleColumnsWidth = sortedItems.reduce(
    (sum, item) => sum + (itemColWidths[item.id] ?? BASE_ITEM_COLUMN_WIDTH),
    0,
  )
  const tableMinWidth = MONTH_COLUMN_WIDTH + Math.max(visibleColumnsWidth, 200) + sumColWidth

  const headerCellStyle: React.CSSProperties = {
    padding: '0 6px',
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    background: '#f9fafb',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap',
    flexShrink: 0,
    flex: '0 0 auto',
  }

  const monthHeaderStyle: React.CSSProperties = {
    ...headerCellStyle,
    flex: `0 0 ${MONTH_COLUMN_WIDTH}px`,
    paddingLeft: 12,
    paddingRight: 6,
    borderRight: '1px solid #b3b8c1',
    display: 'flex',
    alignItems: 'center',
    minHeight: 36,
    textAlign: 'left' as const,
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 16 }}>자산</h1>

      {/* Current month summary: 총 합계 + 가용 금액 + 유저별 자산 */}
      {(() => {
        const currentYM = ym(currentYear, currentMonth)
        const monthTotal = currentYearMonthTotals[currentMonth]
        const sumByPerson = (p?: 'A' | 'B') =>
          sortedItems
            .filter((item) => ASSET_CATEGORIES.includes(item.category) && item.person === p)
            .reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)
        const availableTotal = sortedItems
          .filter((item) => ASSET_CATEGORIES.includes(item.category) && !item.locked)
          .reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)
        const personATotal = sumByPerson('A')
        const personBTotal = sumByPerson('B')
        const sharedTotal = sortedItems
          .filter((item) => ASSET_CATEGORIES.includes(item.category) && !item.person)
          .reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)

        // 전월 합계 (1월이면 전년 12월)
        const prevMonthTotal = currentMonth > 0
          ? currentYearMonthTotals[currentMonth - 1]
          : calcMonthTotals(currentYear - 1)[11]
        const monthDiff = monthTotal - prevMonthTotal
        const hasPrevData = prevMonthTotal > 0
        const prevLabel = currentMonth > 0
          ? `${MONTHS[currentMonth - 1]} 대비`
          : `${currentYear - 1}년 12월 대비`

        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {/* 상단: 총 합계 + 가용 금액 + 전월 대비 증감 */}
            <div
              style={{
                ...jellyCardStyle,
                padding: '16px 20px',
                display: 'flex',
                gap: 24,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                  {currentYear}년 {MONTHS[currentMonth]} · 총 합계
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: PRIMARY }}>{fmtSum(monthTotal)}</div>
              </div>
              <div style={{ flex: 1, minWidth: 160 }}>
                <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                  💰 가용 금액
                  <span style={{ color: '#9ca3af', marginLeft: 4 }}>(묶이지 않은 돈)</span>
                </div>
                <div style={{ fontSize: 26, fontWeight: 700, color: JELLY.text }}>{fmtSum(availableTotal)}</div>
              </div>
              {hasPrevData && (
                <div style={{ flex: 1, minWidth: 160 }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>
                    📈 이번 달 증감
                    <span style={{ color: '#9ca3af', marginLeft: 4 }}>({prevLabel})</span>
                  </div>
                  <div
                    style={{
                      fontSize: 26,
                      fontWeight: 700,
                      color: monthDiff >= 0 ? '#059669' : '#dc2626',
                    }}
                  >
                    {monthDiff >= 0 ? '+' : ''}{fmtSum(monthDiff)}
                  </div>
                </div>
              )}
            </div>

            {/* 하단: 유저별 소유 자산 */}
            <div
              style={{
                ...jellyCardStyle,
                padding: '14px 20px',
                display: 'flex',
                gap: 16,
                flexWrap: 'wrap',
                alignItems: 'flex-end',
              }}
            >
              <div
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: getItemColumnBg('A', 'header'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: personAColor,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {personAName}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: JELLY.text, whiteSpace: 'nowrap' }}>
                  {fmtSum(personATotal)}
                </div>
              </div>
              <div
                style={{
                  flex: 1,
                  minWidth: 140,
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: getItemColumnBg('B', 'header'),
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                  <span
                    style={{
                      display: 'inline-block',
                      width: 8,
                      height: 8,
                      borderRadius: '50%',
                      background: personBColor,
                      flexShrink: 0,
                    }}
                  />
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {personBName}
                  </span>
                </div>
                <div style={{ fontSize: 16, fontWeight: 700, color: JELLY.text, whiteSpace: 'nowrap' }}>
                  {fmtSum(personBTotal)}
                </div>
              </div>
              {sharedTotal > 0 && (
                <div
                  style={{
                    flex: 1,
                    minWidth: 140,
                    padding: '10px 14px',
                    borderRadius: 12,
                    background: '#f3f4f6',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: 8,
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 8,
                        height: 8,
                        borderRadius: '50%',
                        background: '#9ca3af',
                        flexShrink: 0,
                      }}
                    />
                    <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>공유</span>
                  </div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: JELLY.text, whiteSpace: 'nowrap' }}>
                    {fmtSum(sharedTotal)}
                  </div>
                </div>
              )}
            </div>
          </div>
        )
      })()}

      {/* 카테고리 필터 탭 */}
      {(() => {
        const extraCats = [...new Set(sortedItems.map((i) => i.category))]
          .filter((c) => !ASSET_CATEGORIES.includes(c))
        const cats = [
          '전체',
          ...ASSET_CATEGORIES.filter((c) => sortedItems.some((i) => i.category === c)),
          ...extraCats.filter((c) => sortedItems.some((i) => i.category === c)),
        ]
        return (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
            {cats.map((cat) => {
              const total = calcCategoryTotal(cat)
              const active = categoryFilter === cat
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setCategoryFilter(cat)}
                  style={{
                    padding: '6px 14px',
                    borderRadius: 20,
                    border: active ? `1.5px solid ${PRIMARY}` : '1.5px solid #e5e7eb',
                    background: active ? `rgba(79,140,255,0.1)` : '#fff',
                    fontSize: 12,
                    fontWeight: active ? 600 : 400,
                    color: active ? PRIMARY : '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  {cat}
                  {total > 0 && (
                    <span style={{ fontSize: 11, color: active ? PRIMARY : '#9ca3af' }}>
                      {fmtMan(Math.round(total / 10000))}
                    </span>
                  )}
                </button>
              )
            })}
            {categoryFilter !== '전체' && (
              <button
                type="button"
                onClick={() => setShowAddModal(true)}
                style={{
                  marginLeft: 'auto',
                  height: 32,
                  padding: '0 14px',
                  borderRadius: INPUT_BORDER_RADIUS,
                  border: `1.5px solid ${PRIMARY}`,
                  background: 'rgba(79,140,255,0.08)',
                  fontSize: 12,
                  fontWeight: 600,
                  color: PRIMARY,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  fontFamily: 'inherit',
                  flexShrink: 0,
                }}
              >
                + 항목 추가
              </button>
            )}
          </div>
        )
      })()}

      {/* 인사이트 카드 — 유저별 통합 카드 (저축: 만기수령액, 투자: ROI) */}
      {categoryFilter !== '전체' && (() => {
        const currentYM = ym(currentYear, currentMonth)
        const isInsightCategory = categoryFilter === '저축' || categoryFilter === '투자'
        if (!isInsightCategory) return null

        const insightItems = filteredItems.filter((item) => {
          if (item.category === '저축') {
            if (item.savingsType === 'subscription') return getEntry(item.id, currentYM) > 0
            return !!(item.maturityDate || item.interestRate)
          }
          if (item.category === '투자') return getEntry(item.id, currentYM) > 0
          return false
        })
        if (insightItems.length === 0) return null

        const personsOrder: Array<'A' | 'B' | undefined> = (['A', 'B', undefined] as const).filter(
          (p) => insightItems.some((i) => i.person === p)
        )

        return (
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
            {personsOrder.map((personKey) => {
              const groupItems = insightItems.filter((i) => i.person === personKey)
              if (groupItems.length === 0) return null
              const groupLabel = personKey === 'A' ? personAName : personKey === 'B' ? personBName : '공유'
              const groupColor = personKey ? getPersonColor(personKey) : '#9ca3af'

              if (categoryFilter === '저축') {
                const totalBalance = groupItems.reduce((s, item) => s + getEntry(item.id, currentYM), 0)
                let totalMaturityInterest = 0
                let totalMaturityAmount = 0
                groupItems.forEach((item) => {
                  const currentVal = getEntry(item.id, currentYM)
                  if (!item.maturityDate) return
                  const rate = item.interestRate ?? 0
                  const remainingMonths = Math.max(0, Math.round(
                    (new Date(item.maturityDate).getFullYear() - currentYear) * 12 +
                    (new Date(item.maturityDate).getMonth() - currentMonth)
                  ))
                  let matAmt = 0
                  if (rate > 0) {
                    const r = rate / 100
                    if (item.savingsType === 'deposit') {
                      matAmt = currentVal * (1 + r * remainingMonths / 12)
                    } else {
                      const monthlyDeposit = item.defaultAmount ?? 0
                      const principal = currentVal + monthlyDeposit * remainingMonths
                      const interestOnCurrent = currentVal * r * remainingMonths / 12
                      const interestOnFuture = monthlyDeposit * (r / 12) * (remainingMonths * (remainingMonths - 1) / 2)
                      matAmt = principal + interestOnCurrent + interestOnFuture
                    }
                  } else {
                    matAmt = currentVal + (item.defaultAmount ?? 0) * remainingMonths
                  }
                  const interest = matAmt - currentVal - (item.defaultAmount ?? 0) * remainingMonths
                  totalMaturityInterest += interest
                  totalMaturityAmount += matAmt
                })
                const withMaturity = groupItems
                  .filter((i) => i.maturityDate)
                  .sort((a, b) => new Date(a.maturityDate!).getTime() - new Date(b.maturityDate!).getTime())
                const nearestMaturity = withMaturity[0]?.maturityDate
                const nearestDday = nearestMaturity
                  ? Math.ceil((new Date(nearestMaturity).getTime() - new Date().getTime()) / 86400000)
                  : null
                return (
                  <div
                    key={String(personKey)}
                    style={{ ...jellyCardStyle, padding: '14px 16px', flex: '1 1 200px', minWidth: 180 }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: groupColor, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: groupColor }}>{groupLabel}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{groupItems.length}개 항목</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>현재 잔액</span>
                      <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{fmtMan(Math.round(totalBalance / 10000))}원</span>
                    </div>
                    {totalMaturityInterest > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                        <span style={{ fontSize: 11, color: '#6b7280' }}>만기 예상 이자</span>
                        <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>+{fmtMan(Math.round(totalMaturityInterest / 10000))}원</span>
                      </div>
                    )}
                    {totalMaturityAmount > 0 && (
                      <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f3f4f6', marginTop: 4 }}>
                        <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>만기 수령액</span>
                        <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY }}>{fmtMan(Math.round(totalMaturityAmount / 10000))}원</span>
                      </div>
                    )}
                    {nearestDday !== null && (
                      <div style={{ fontSize: 11, marginTop: 8, color: nearestDday <= 0 ? '#059669' : nearestDday <= 30 ? '#f59e0b' : '#9ca3af' }}>
                        {nearestDday <= 0 ? '✓ 최근 만기 도달' : `가장 빠른 만기 D-${nearestDday}`}
                        <span style={{ marginLeft: 4, color: '#9ca3af' }}>· {nearestMaturity}</span>
                      </div>
                    )}
                  </div>
                )
              } else {
                const totalPnl = groupItems.reduce((s, item) => s + getCostBasisEntry(item.id, currentYM), 0)
                const totalBalance = groupItems.reduce((s, item) => s + getEntry(item.id, currentYM), 0)
                const totalBasis = totalBalance - totalPnl
                const pnlPct = totalBasis !== 0 ? Math.round((totalPnl / totalBasis) * 1000) / 10 : 0
                const pnlColor = totalPnl === 0 ? '#6b7280' : totalPnl > 0 ? '#059669' : '#dc2626'
                return (
                  <div
                    key={String(personKey)}
                    style={{ ...jellyCardStyle, padding: '14px 16px', flex: '1 1 200px', minWidth: 180, border: totalPnl < 0 ? '1.5px solid #fca5a5' : undefined }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                      <span style={{ width: 8, height: 8, borderRadius: '50%', background: groupColor, display: 'inline-block', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, fontWeight: 700, color: groupColor }}>{groupLabel}</span>
                      <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{groupItems.length}개 항목</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>원금</span>
                      <span style={{ fontSize: 11, color: '#374151' }}>{fmtMan(Math.round(totalBasis / 10000))}원</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                      <span style={{ fontSize: 11, color: '#6b7280' }}>평가 손익</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: pnlColor }}>
                        {totalPnl === 0 ? '—' : `${totalPnl > 0 ? '+' : ''}${fmtMan(Math.round(totalPnl / 10000))}원`}
                        {pnlPct !== 0 && <span style={{ fontSize: 10, marginLeft: 4, color: pnlColor }}>({pnlPct > 0 ? '+' : ''}{pnlPct}%)</span>}
                      </span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
                      <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>총 잔고</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{fmtMan(Math.round(totalBalance / 10000))}원</span>
                    </div>
                  </div>
                )
              }
            })}
          </div>
        )
      })()}

      {/* 항목 접기 안내 */}
      {sortedItems.length > 0 && collapsedItems.size > 0 && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
          접힌 항목 {collapsedItems.size}개 · 총합은 변경되지 않습니다.
          <button
            type="button"
            onClick={() => setCollapsedItems(new Set())}
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              fontSize: 11,
              border: '1px solid #b3b8c1',
              background: '#fff',
              borderRadius: 6,
              cursor: 'pointer',
              color: PRIMARY,
            }}
          >
            모두 펼치기
          </button>
        </div>
      )}

      {/* 전체 탭: 카테고리별 자산 구성 + 이달 증감 분석 (PC: 좌우, 모바일: 세로) */}
      {categoryFilter === '전체' && (() => {
        // ── 카테고리별 바 그래프 데이터 ──
        const catTotals = ASSET_CATEGORIES.map((cat) => ({
          cat,
          total: sortedItems
            .filter((i) => i.category === cat)
            .reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0),
        })).filter((c) => c.total > 0)
        const grandTotal = catTotals.reduce((s, c) => s + c.total, 0)
        const CAT_COLORS: Record<string, string> = { 저축: '#3b82f6', 투자: '#8b5cf6', 부동산: '#f59e0b' }

        // ── 이달 증감 분석 데이터 ──
        const curTotal = currentYearMonthTotals[currentMonth]
        const prevYr = currentMonth > 0 ? currentYear : currentYear - 1
        const prevMi = currentMonth > 0 ? currentMonth - 1 : 11
        const prevTotal = currentMonth > 0
          ? currentYearMonthTotals[currentMonth - 1]
          : calcMonthTotals(currentYear - 1)[11]
        const actualDelta = curTotal - prevTotal
        const plannedDeposits = sortedItems
          .filter((item) => ASSET_CATEGORIES.includes(item.category))
          .reduce((s, item) => s + (item.defaultAmount ?? 0), 0)
        // 카테고리별 손익 계산
        const savingsItemsD = sortedItems.filter((i) => i.category === '저축')
        const investItemsD = sortedItems.filter((i) => i.category === '투자')
        const savingsCurD = savingsItemsD.reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0)
        const savingsPrevD = savingsItemsD.reduce((s, item) => s + getProjectedValue(prevYr, item, prevMi), 0)
        const savingsDepD = savingsItemsD.reduce((s, item) => s + (item.defaultAmount ?? 0), 0)
        const savingsInterestD = savingsCurD - savingsPrevD - savingsDepD
        const investCurD = investItemsD.reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0)
        const investPrevD = investItemsD.reduce((s, item) => s + getProjectedValue(prevYr, item, prevMi), 0)
        const investDepD = investItemsD.reduce((s, item) => s + (item.defaultAmount ?? 0), 0)
        const investPnlD = investCurD - investPrevD - investDepD
        const deltaColor = actualDelta === 0 ? '#6b7280' : actualDelta > 0 ? '#059669' : '#dc2626'
        const prevLabel = currentMonth > 0 ? `${MONTHS[currentMonth - 1]}` : `${currentYear - 1}년 12월`

        const showBarChart = catTotals.length > 0 && grandTotal > 0
        const showDelta = curTotal > 0

        if (!showBarChart && !showDelta) return null

        return (
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'stretch' }}>
            {/* 카테고리별 자산 구성 */}
            {showBarChart && (
              <div style={{ flex: '1 1 280px', ...jellyCardStyle, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 14 }}>카테고리별 자산 구성</div>
                <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
                  {catTotals.map(({ cat, total }, idx) => (
                    <div
                      key={cat}
                      title={`${cat}: ${fmtMan(Math.round(total / 10000))}원`}
                      style={{
                        flex: `0 0 ${(total / grandTotal) * 100}%`,
                        background: CAT_COLORS[cat] ?? '#9ca3af',
                        marginRight: idx < catTotals.length - 1 ? 2 : 0,
                        borderRadius: idx === 0 ? '6px 0 0 6px' : idx === catTotals.length - 1 ? '0 6px 6px 0' : 0,
                        minWidth: 4,
                      }}
                    />
                  ))}
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
                  {catTotals.map(({ cat, total }) => {
                    const pct = Math.round((total / grandTotal) * 1000) / 10
                    return (
                      <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: CAT_COLORS[cat] ?? '#9ca3af', flexShrink: 0 }} />
                        <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{cat}</span>
                        <span style={{ fontSize: 12, color: '#6b7280' }}>{fmtMan(Math.round(total / 10000))}원</span>
                        <span style={{ fontSize: 11, color: '#9ca3af' }}>({pct}%)</span>
                      </div>
                    )
                  })}
                </div>
              </div>
            )}
            {/* 이달 증감 분석 */}
            {showDelta && (
              <div style={{ flex: '1 1 280px', ...jellyCardStyle, padding: '14px 16px' }}>
                <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 12 }}>
                  이달 증감 분석
                  <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>({prevLabel} 대비)</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#3b82f6', flexShrink: 0 }} />
                    <span style={{ fontSize: 12, color: '#374151' }}>정기 납입</span>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>(적금·투자 등 자동)</span>
                  </div>
                  <span style={{ fontSize: 13, fontWeight: 600, color: plannedDeposits > 0 ? '#3b82f6' : '#9ca3af' }}>
                    {plannedDeposits === 0 ? '—' : `+${fmtMan(Math.round(plannedDeposits / 10000))}원`}
                  </span>
                </div>
                {savingsInterestD !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: savingsInterestD > 0 ? '#059669' : '#dc2626', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151' }}>저축 이자</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: savingsInterestD > 0 ? '#059669' : '#dc2626' }}>
                      {`${savingsInterestD > 0 ? '+' : ''}${fmtMan(Math.round(savingsInterestD / 10000))}원`}
                    </span>
                  </div>
                )}
                {investPnlD !== 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: investPnlD > 0 ? '#059669' : '#dc2626', flexShrink: 0 }} />
                      <span style={{ fontSize: 12, color: '#374151' }}>투자 손익</span>
                    </div>
                    <span style={{ fontSize: 13, fontWeight: 600, color: investPnlD > 0 ? '#059669' : '#dc2626' }}>
                      {`${investPnlD > 0 ? '+' : ''}${fmtMan(Math.round(investPnlD / 10000))}원`}
                    </span>
                  </div>
                )}
                <div style={{ height: 4 }} />
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
                  <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>= 실제 증감</span>
                  <span style={{ fontSize: 16, fontWeight: 700, color: deltaColor }}>
                    {actualDelta === 0 ? '—' : `${actualDelta > 0 ? '+' : ''}${fmtMan(Math.round(actualDelta / 10000))}원`}
                  </span>
                </div>
              </div>
            )}
          </div>
        )
      })()}

      {/* 전체 탭: 수익 현황 카드 */}
      {categoryFilter === '전체' && (() => {
        const currentYM = ym(currentYear, currentMonth)
        // 투자 항목 손익
        const investItems = sortedItems.filter((i) => i.category === '투자')
        // 저축 만기 예상 이자 합산 (만기일 + 이율 있는 항목만)
        const savingsWithMaturity = sortedItems.filter(
          (i) => i.category === '저축' && i.maturityDate && i.interestRate &&
                 i.savingsType !== 'checking' && i.savingsType !== 'subscription'
        )
        const totalMaturityInterest = savingsWithMaturity.reduce((sum, item) => {
          const curVal = getProjectedValue(currentYear, item, currentMonth)
          if (curVal === 0) return sum
          const rate = item.interestRate! / 100
          const remainingMonths = Math.max(0, Math.round(
            (new Date(item.maturityDate!).getFullYear() - currentYear) * 12 +
            (new Date(item.maturityDate!).getMonth() - currentMonth)
          ))
          const monthly = item.defaultAmount ?? 0
          let interest = 0
          if (item.savingsType === 'deposit') {
            interest = curVal * rate * remainingMonths / 12
          } else {
            // 적금: 현재 잔액 이자 + 납입분 이자 (단리)
            interest = curVal * rate * remainingMonths / 12 +
                       monthly * (rate / 12) * (remainingMonths * (remainingMonths - 1) / 2)
          }
          return sum + interest
        }, 0)
        if (investItems.length === 0 && savingsWithMaturity.length === 0) return null
        // 투자 전체 합산
        const totalInvestPnl = investItems.reduce((s, item) => s + getCostBasisEntry(item.id, currentYM), 0)
        const totalInvestBasis = investItems.reduce((s, item) => {
          const bal = getProjectedValue(currentYear, item, currentMonth)
          const pnl = getCostBasisEntry(item.id, currentYM)
          return s + (bal - pnl)
        }, 0)
        const totalInvestPnlPct = totalInvestBasis !== 0 ? Math.round((totalInvestPnl / totalInvestBasis) * 1000) / 10 : 0
        const investPnlColor = totalInvestPnl === 0 ? '#6b7280' : totalInvestPnl > 0 ? '#059669' : '#dc2626'
        const savingsMaturityColor = totalMaturityInterest > 0 ? '#059669' : '#6b7280'
        return (
          <div style={{ marginBottom: 16 }}>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>수익 현황</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
              {/* 총 투자 수익 카드 */}
              {investItems.length > 0 && (
                <div style={{
                  ...jellyCardStyle,
                  padding: '14px 16px',
                  flex: '1 1 180px',
                  minWidth: 160,
                  border: totalInvestPnl !== 0 ? `1.5px solid ${totalInvestPnl > 0 ? '#a7f3d0' : '#fca5a5'}` : undefined,
                }}>
                  <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>총 투자 수익</div>
                  <div style={{ fontSize: 22, fontWeight: 700, color: investPnlColor, marginBottom: 6 }}>
                    {totalInvestPnl === 0 ? '—' : `${totalInvestPnl > 0 ? '+' : ''}${fmtMan(Math.round(totalInvestPnl / 10000))}원`}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
                    <span style={{ fontSize: 11, color: '#9ca3af' }}>원금</span>
                    <span style={{ fontSize: 11, color: '#374151' }}>{fmtMan(Math.round(totalInvestBasis / 10000))}원</span>
                  </div>
                  {totalInvestPnlPct !== 0 && (
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                      <span style={{ fontSize: 11, color: '#9ca3af' }}>수익률</span>
                      <span style={{ fontSize: 11, fontWeight: 600, color: investPnlColor }}>{totalInvestPnlPct > 0 ? '+' : ''}{totalInvestPnlPct}%</span>
                    </div>
                  )}
                </div>
              )}
              {/* 저축 수익 (만기 예상 이자) 카드 */}
              {savingsWithMaturity.length > 0 && (() => {
                const savingsMaturityItems = savingsWithMaturity.map((item) => {
                  const curVal = getProjectedValue(currentYear, item, currentMonth)
                  const rate = item.interestRate! / 100
                  const remainingMonths = Math.max(0, Math.round(
                    (new Date(item.maturityDate!).getFullYear() - currentYear) * 12 +
                    (new Date(item.maturityDate!).getMonth() - currentMonth)
                  ))
                  const monthly = item.defaultAmount ?? 0
                  let interest = 0
                  if (item.savingsType === 'deposit') {
                    interest = curVal * rate * remainingMonths / 12
                  } else {
                    interest = curVal * rate * remainingMonths / 12 +
                               monthly * (rate / 12) * (remainingMonths * (remainingMonths - 1) / 2)
                  }
                  return { item, interest, maturityDate: item.maturityDate! }
                }).sort((a, b) => new Date(a.maturityDate).getTime() - new Date(b.maturityDate).getTime())
                return (
                  <div style={{
                    ...jellyCardStyle,
                    padding: '14px 16px',
                    flex: '1 1 200px',
                    minWidth: 200,
                    border: totalMaturityInterest > 0 ? '1.5px solid #a7f3d0' : undefined,
                  }}>
                    <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>저축 수익 (만기 예상 이자)</div>
                    <div style={{ fontSize: 22, fontWeight: 700, color: savingsMaturityColor, marginBottom: 10 }}>
                      {totalMaturityInterest === 0 ? '—' : `+${fmtMan(Math.round(totalMaturityInterest / 10000))}원`}
                    </div>
                    <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {savingsMaturityItems.map(({ item, interest, maturityDate }) => (
                        <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                          <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                            <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                            <span style={{ fontSize: 10, color: '#9ca3af' }}>{maturityDate}</span>
                          </div>
                          <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', flexShrink: 0 }}>+{fmtMan(Math.round(interest / 10000))}원</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })()}
            </div>
          </div>
        )
      })()}

      {/* 전체 탭: 월별 자산 누적 요약 */}
      {categoryFilter === '전체' && (() => {
        // 최근 12개월 (현재 포함)
        const summaryMonths: { yr: number; mi: number; label: string }[] = []
        for (let offset = 11; offset >= 0; offset--) {
          let yr = currentYear
          let mi = currentMonth - offset
          while (mi < 0) { mi += 12; yr-- }
          const label = `${yr}년 ${mi + 1}월`
          summaryMonths.push({ yr, mi, label })
        }
        const summaryTotals = summaryMonths.map(({ yr, mi }) =>
          sortedItems
            .filter((item) => ASSET_CATEGORIES.includes(item.category))
            .reduce((sum, item) => sum + getProjectedValue(yr, item, mi), 0)
        )
        // 원금 대비 수익: 투자 P&L + 저축 누적 이자
        const summaryGains = summaryMonths.map(({ yr, mi }) => {
          const investPnl = sortedItems
            .filter((item) => item.category === '투자')
            .reduce((sum, item) => sum + getCostBasisEntry(item.id, ym(yr, mi)), 0)
          const savingsInterest = sortedItems
            .filter((item) => item.category === '저축')
            .reduce((sum, item) => sum + getSavingsCumulativeInterest(item, yr, mi), 0)
          return investPnl + savingsInterest
        })
        return (
          <div style={{ marginBottom: 16, ...jellyCardStyle, padding: 0, overflow: 'hidden' }}>
            <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#111827', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
              월별 자산 현황
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ background: '#f3f4f6' }}>
                    <th style={{ padding: '6px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 500, minWidth: 80 }}>월</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 500, minWidth: 90 }}>총 자산</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 500, minWidth: 80 }}>전월 대비</th>
                    <th style={{ padding: '6px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 500, minWidth: 90 }}>원금 대비 수익</th>
                  </tr>
                </thead>
                <tbody>
                  {summaryMonths.map(({ label }, idx) => {
                    const total = summaryTotals[idx]
                    const prev = idx > 0 ? summaryTotals[idx - 1] : null
                    const delta = prev !== null ? total - prev : null
                    const gain = summaryGains[idx]
                    const gainColor = gain === 0 ? '#9ca3af' : gain > 0 ? '#059669' : '#dc2626'
                    const isCurrentMonth = idx === summaryMonths.length - 1
                    return (
                      <tr key={label} style={{ borderTop: '1px solid #e5e7eb', background: isCurrentMonth ? '#eff6ff' : undefined }}>
                        <td style={{ padding: '6px 12px', color: isCurrentMonth ? '#1d4ed8' : '#374151', fontWeight: isCurrentMonth ? 600 : 400 }}>
                          {label}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                          {fmtMan(Math.round(total / 10000))}원
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: delta === null ? '#9ca3af' : delta >= 0 ? '#059669' : '#dc2626', fontWeight: 500 }}>
                          {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${fmtMan(Math.round(Math.abs(delta / 10000)))}원`}
                        </td>
                        <td style={{ padding: '6px 12px', textAlign: 'right', color: gainColor, fontWeight: 600 }}>
                          {gain === 0 ? '—' : `${gain > 0 ? '+' : ''}${fmtMan(Math.round(gain / 10000))}원`}
                        </td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )
      })()}

      {/* 통합 자산 테이블 — 2년치 월별 데이터를 하나의 표로 (최신 월이 아래) */}
      {categoryFilter !== '전체' && (() => {
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
            onItemClick={(item) => {
              setEditingItem(item)
              setEditForm({
                name: item.name,
                category: item.category || '저축',
                defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '',
                person: item.person ?? '공유',
                locked: !!item.locked,
                interestRate: item.interestRate ? String(item.interestRate) : '',
                savingsType: item.savingsType ?? 'installment',
                maturityDate: item.maturityDate ?? '',
                closedYM: item.closedYM ?? '',
              })
            }}
            getPersonLabel={getPersonLabel}
            getItemColumnBg={getItemColumnBg}
            tableMinWidth={tableMinWidth}
            itemColWidths={itemColWidths}
            sumColWidth={sumColWidth}
            MONTH_COLUMN_WIDTH={MONTH_COLUMN_WIDTH}
            extraFutureYears={extraFutureYears}
            onAddYear={() => setExtraFutureYears((n) => n + 1)}
            onRemoveLastYear={() => setExtraFutureYears((n) => Math.max(0, n - 1))}
          />
        )
      })()}

      {/* Add item modal */}
      {showAddModal && (
        <AddItemModal
          personAName={personAName}
          personBName={personBName}
          initialCategory={categoryFilter !== '전체' ? categoryFilter : '저축'}
          onClose={() => setShowAddModal(false)}
          onAdd={({ name, category, defaultAmount, person, locked, initialAmount, savingsType, interestRate, maturityDate }) => {
            const newItemId = addItem({
              name,
              category,
              person,
              defaultAmount: defaultAmount > 0 ? defaultAmount : undefined,
              locked: locked || undefined,
              initialAmount: initialAmount && initialAmount > 0 ? initialAmount : undefined,
              savingsType: savingsType ?? undefined,
              interestRate: interestRate ?? undefined,
              maturityDate: maturityDate ?? undefined,
            })
            if (initialAmount && initialAmount > 0) {
              setEntry(newItemId, ym(currentYear, currentMonth), initialAmount)
            }
            if (defaultAmount > 0) {
              for (let mi = currentMonth + (initialAmount && initialAmount > 0 ? 1 : 0); mi < 12; mi++) {
                const base = initialAmount && initialAmount > 0 ? initialAmount : 0
                const offset = mi - currentMonth - (initialAmount && initialAmount > 0 ? 1 : 0) + 1
                setEntry(newItemId, ym(currentYear, mi), base + defaultAmount * offset)
              }
            }
          }}
        />
      )}

      {/* Edit item modal */}
      <Modal
        open={editingItem !== null}
        title="항목 수정"
        onClose={() => setEditingItem(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>항목명 <span style={{ color: '#ef4444' }}>*</span></div>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="항목명"
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: INPUT_BORDER_RADIUS,
                fontSize: INPUT_FONT_SIZE,
                fontFamily: 'inherit',
                outline: 'none',
                boxSizing: 'border-box',
                ...jellyInputSurface,
                color: '#232d3c',
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리 <span style={{ color: '#ef4444' }}>*</span></div>
              <CustomSelect
                options={ASSET_CATEGORIES}
                value={editForm.category}
                onChange={(v) => setEditForm({ ...editForm, category: v })}
                compact
                compactFill
                compactHeight={40}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>명의 <span style={{ color: '#ef4444' }}>*</span></div>
              <CustomSelect
                options={['공유', personAName, personBName]}
                value={editForm.person === 'A' ? personAName : editForm.person === 'B' ? personBName : '공유'}
                onChange={(label) => {
                  const p = label === personAName ? 'A' : label === personBName ? 'B' : '공유'
                  setEditForm({ ...editForm, person: p as 'A' | 'B' | '공유' })
                }}
                compact
                compactFill
                compactHeight={40}
              />
            </div>
          </div>

          {editForm.category !== '부동산' && !(editForm.category === '저축' && editForm.savingsType === 'deposit') && (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>정기입금액 (선택)</div>
              <AmountInput
                value={editForm.defaultAmount}
                onChange={(v) => setEditForm({ ...editForm, defaultAmount: v })}
                placeholder="매월 추가되는 금액"
                height={40}
              />
            </div>
          )}

          {/* 예금 전용: 예금액 표시/수정 */}
          {editForm.category === '저축' && editForm.savingsType === 'deposit' && editingItem && (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>예금액 <span style={{ color: '#ef4444' }}>*</span></div>
              <AmountInput
                value={editForm.defaultAmount}
                onChange={(v) => setEditForm({ ...editForm, defaultAmount: v })}
                placeholder="예금 원금"
                height={40}
              />
            </div>
          )}

          {/* 묶인 돈 토글 */}
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>묶인 돈</div>
            <ToggleSwitch checked={editForm.locked} onChange={(v) => setEditForm({ ...editForm, locked: v })} />
          </div>

          {/* 저축 전용 필드 */}
          {editForm.category === '저축' && (
            <>
              {/* 적금 / 예금 선택 */}
              <div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>종류 <span style={{ color: '#ef4444' }}>*</span></div>
                <div style={{ display: 'flex', gap: 8 }}>
                  {(['installment', 'deposit', 'checking', 'subscription'] as const).map((type) => {
                    const label = type === 'installment' ? '적금' : type === 'deposit' ? '예금' : type === 'subscription' ? '청약' : '입출금'
                    const active = editForm.savingsType === type
                    return (
                      <button
                        key={type}
                        type="button"
                        onClick={() => setEditForm({ ...editForm, savingsType: type })}
                        style={{
                          flex: 1,
                          height: 40,
                          borderRadius: INPUT_BORDER_RADIUS,
                          border: `1.5px solid ${active ? PRIMARY : '#e5e7eb'}`,
                          background: active ? 'rgba(79,140,255,0.1)' : '#fff',
                          fontSize: 13,
                          fontWeight: active ? 600 : 400,
                          color: active ? PRIMARY : '#6b7280',
                          cursor: 'pointer',
                          fontFamily: 'inherit',
                        }}
                      >
                        {label}
                      </button>
                    )
                  })}
                </div>
              </div>
              {/* 연이율 */}
              <div>
                <div style={{ fontSize: 12, marginBottom: 4 }}>연이율 % {editForm.savingsType !== 'checking' && editForm.savingsType !== 'subscription' && <span style={{ color: '#ef4444' }}>*</span>}</div>
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={editForm.interestRate}
                  onChange={(e) => setEditForm({ ...editForm, interestRate: e.target.value })}
                  placeholder="예: 3.5"
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: INPUT_BORDER_RADIUS,
                    fontSize: INPUT_FONT_SIZE,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    ...jellyInputSurface,
                    color: '#232d3c',
                  }}
                />
              </div>
              {/* 만기일: 청약은 불필요 */}
              {editForm.savingsType !== 'subscription' && (
                <div>
                  <div style={{ fontSize: 12, marginBottom: 4 }}>만기일 {editForm.savingsType !== 'checking' && <span style={{ color: '#ef4444' }}>*</span>}</div>
                  <input
                    type="date"
                    value={editForm.maturityDate}
                    onChange={(e) => setEditForm({ ...editForm, maturityDate: e.target.value })}
                    style={{
                      width: '100%',
                      height: 40,
                      padding: '0 12px',
                      borderRadius: INPUT_BORDER_RADIUS,
                      fontSize: INPUT_FONT_SIZE,
                      fontFamily: 'inherit',
                      outline: 'none',
                      boxSizing: 'border-box',
                      ...jellyInputSurface,
                      color: '#232d3c',
                    }}
                  />
                </div>
              )}
            </>
          )}


        {/* 해지/만기 처리 */}
        {editForm.category === '저축' && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: '#6b7280' }}>해지/만기 처리</div>
            <ToggleSwitch
              checked={!!editForm.closedYM}
              onChange={(v) => setEditForm({ ...editForm, closedYM: v ? ym(currentYear, currentMonth) : '' })}
            />
            {editForm.closedYM && (
              <div style={{ fontSize: 11, color: '#f59e0b', marginTop: 4 }}>
                {editForm.closedYM} 이후 자동 이월 중단
              </div>
            )}
          </div>
        )}

        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
          {/* 삭제 버튼 */}
          <button
            onClick={() => {
              if (editingItem && window.confirm(`'${editingItem.name}' 항목을 삭제할까요?\n모든 금액 데이터도 함께 삭제됩니다.`)) {
                removeItem(editingItem.id)
                setEditingItem(null)
              }
            }}
            style={{
              padding: '8px 14px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #fca5a5',
              background: '#fff',
              fontSize: 13,
              color: '#ef4444',
              cursor: 'pointer',
            }}
          >
            삭제
          </button>

          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={() => setEditingItem(null)}
              style={{
                padding: '8px 14px',
                borderRadius: JELLY.radiusControl,
                border: '1px solid #b3b8c1',
                background: '#fff',
                fontSize: 13,
                cursor: 'pointer',
              }}
            >
              취소
            </button>

            <button
              onClick={() => {
                const savingsValid = editForm.category !== '저축' || editForm.savingsType === 'checking' || editForm.savingsType === 'subscription' || (!!editForm.interestRate && !!editForm.maturityDate)
                if (editingItem && editForm.name.trim() && savingsValid) {
                  const newDefaultAmount = editForm.defaultAmount ? parseInt(editForm.defaultAmount.replace(/,/g, ''), 10) : undefined
                  const newPerson = editForm.person === '공유' ? undefined : editForm.person as 'A' | 'B'
                  updateItem(editingItem.id, {
                    name: editForm.name.trim(),
                    category: editForm.category || '저축',
                    person: newPerson,
                    defaultAmount: newDefaultAmount,
                    locked: editForm.locked || undefined,
                    interestRate: editForm.interestRate ? parseFloat(editForm.interestRate) : undefined,
                    savingsType: editForm.category === '저축' ? editForm.savingsType : undefined,
                    maturityDate: (editForm.savingsType !== 'subscription' && editForm.maturityDate) ? editForm.maturityDate : undefined,
                    closedYM: editForm.closedYM || undefined,
                  })

                  setEditingItem(null)
                }
              }}
              style={{
                padding: '8px 16px',
                borderRadius: JELLY.radiusControl,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: editForm.name.trim() && (editForm.category !== '저축' || editForm.savingsType === 'checking' || editForm.savingsType === 'subscription' || (!!editForm.interestRate && !!editForm.maturityDate)) ? 'pointer' : 'not-allowed',
                background: editForm.name.trim() && (editForm.category !== '저축' || editForm.savingsType === 'checking' || editForm.savingsType === 'subscription' || (!!editForm.interestRate && !!editForm.maturityDate)) ? PRIMARY : '#e5e7eb',
                color: editForm.name.trim() && (editForm.category !== '저축' || editForm.savingsType === 'checking' || editForm.savingsType === 'subscription' || (!!editForm.interestRate && !!editForm.maturityDate)) ? '#fff' : '#9ca3af',
              }}
            >
              저장
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
