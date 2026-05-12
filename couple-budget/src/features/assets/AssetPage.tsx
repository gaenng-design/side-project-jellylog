import { useState, useRef, useMemo } from 'react'
import { useAssetStore, ASSET_CATEGORIES } from '@/store/useAssetStore'
import { useAppStore, getYearPickerYearOptions } from '@/store/useAppStore'
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

/** 연도별 자산 테이블 */
function YearTable({
  year,
  currentYear,
  currentMonth,
  sortedItems,
  collapsedItems,
  toggleCollapse,
  isMonthEditable,
  getProjectedValue,
  getEntry,
  setEntry,
  monthTotals,
  onItemClick,
  getPersonColor,
  getPersonLabel,
  getItemColumnBg,
  tableMinWidth,
  itemColWidths,
  sumColWidth,
  MONTH_COLUMN_WIDTH,
}: {
  year: number
  currentYear: number
  currentMonth: number
  sortedItems: AssetItem[]
  collapsedItems: Set<string>
  toggleCollapse: (itemId: string) => void
  isMonthEditable: (yr: number, monthIdx: number) => boolean
  getProjectedValue: (yr: number, item: AssetItem, monthIdx: number) => number
  getEntry: (itemId: string, yearMonth: string) => number
  setEntry: (itemId: string, yearMonth: string, amount: number) => void
  monthTotals: number[]
  onItemClick: (item: AssetItem) => void
  getPersonColor: (person?: 'A' | 'B') => string
  getPersonLabel: (person?: 'A' | 'B') => string
  getItemColumnBg: (person?: 'A' | 'B', intensity?: 'header' | 'cell') => string
  tableMinWidth: number
  /** 각 항목별 동적 너비 (접힘 포함) */
  itemColWidths: Record<string, number>
  /** 합계 컬럼 동적 너비 */
  sumColWidth: number
  MONTH_COLUMN_WIDTH: number
}) {
  const [yearCollapsed, setYearCollapsed] = useState(year < currentYear)

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
      {/* 연도 헤더 (접기 토글) */}
      <div
        onClick={() => setYearCollapsed((v) => !v)}
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '12px 16px',
          background: year === currentYear ? 'rgba(79, 140, 255, 0.18)' : '#fafbfc',
          cursor: 'pointer',
          borderBottom: yearCollapsed ? 'none' : '1px solid #b3b8c1',
          userSelect: 'none',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ fontSize: 12, color: year === currentYear ? PRIMARY : '#6b7280' }}>
            {yearCollapsed ? '▶' : '▼'}
          </span>
          <span style={{ fontSize: 15, fontWeight: 700, color: year === currentYear ? PRIMARY : JELLY.text }}>
            {year}년
          </span>
          {year === currentYear && (
            <span
              style={{
                fontSize: 10,
                fontWeight: 600,
                color: '#fff',
                background: PRIMARY,
                padding: '2px 8px',
                borderRadius: 999,
              }}
            >
              현재
            </span>
          )}
        </div>
      </div>

      {!yearCollapsed && (
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
                              alignItems: 'center',
                              gap: 4,
                            }}
                          >
                            {item.locked && (
                              <span title="묶인 돈" style={{ fontSize: 11, flexShrink: 0 }}>
                                🔒
                              </span>
                            )}
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
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
                          justifyContent: 'flex-end',
                          gap: 2,
                          cursor: isCollapsed ? 'default' : 'pointer',
                          minHeight: 36,
                          overflow: 'hidden',
                        }}
                      >
                        {!isCollapsed && (
                          <>
                            <div>{item.category}</div>
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

            {/* 월별 행 */}
            {sortedItems.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                아래 '+ 추가' 버튼으로 자산 항목을 추가해주세요.
              </div>
            ) : (
              MONTHS.map((month, mi) => {
                const editable = isMonthEditable(year, mi)
                const isFuture = year === currentYear && mi > currentMonth
                const isLastRow = mi === 11
                return (
                  <div
                    key={month}
                    style={{
                      display: 'flex',
                      borderBottom: isLastRow ? 'none' : '1px solid #d1d5db',
                      background: isFuture ? 'rgba(243,244,246,0.5)' : undefined,
                    }}
                  >
                    <div style={{ ...monthHeaderStyle, color: isFuture ? '#9ca3af' : undefined }}>{month}</div>
                    {sortedItems.map((item) => {
                      const isCollapsed = collapsedItems.has(item.id)
                      const colWidth = itemColWidths[item.id] ?? 100
                      const displayValue = isFuture
                        ? getProjectedValue(year, item, mi)
                        : getEntry(item.id, ym(year, mi))
                      return (
                        <div
                          key={`${item.id}-${mi}`}
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
                          ) : (
                            <AmountCell
                              value={displayValue}
                              onChange={(v) => {
                                const amount = v ? parseInt(v.replace(/,/g, ''), 10) : 0
                                setEntry(item.id, ym(year, mi), amount)
                              }}
                              disabled={!editable}
                              projected={isFuture}
                            />
                          )}
                        </div>
                      )
                    })}
                    {/* 월 합계 (오른쪽 sticky) */}
                    <div
                      style={{
                        ...sumColStyleBase,
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontSize: 12,
                        fontWeight: 600,
                        color: monthTotals[mi] > 0 ? PRIMARY : '#d1d5db',
                        borderLeft: '2px solid #d1d5db',
                        minHeight: 36,
                        background: isFuture ? 'rgba(243,244,246,0.95)' : '#ffffff',
                      }}
                    >
                      {monthTotals[mi] > 0 ? monthTotals[mi].toLocaleString('ko-KR') : '—'}
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function AddItemRow({ onAdd, personAName, personBName }: {
  onAdd: (name: string, category: string, defaultAmount: number, person: 'A' | 'B' | undefined, locked: boolean) => void
  personAName: string
  personBName: string
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('저축')
  const [person, setPerson] = useState<'A' | 'B'>('A')
  const [hasDefault, setHasDefault] = useState(false)
  const [defaultAmount, setDefaultAmount] = useState('')
  const [locked, setLocked] = useState(false)

  const handleAdd = () => {
    const t = name.trim()
    if (!t) return
    const defAmt = hasDefault && defaultAmount ? parseInt(defaultAmount.replace(/,/g, ''), 10) : 0
    onAdd(t, category, defAmt, person, locked)
    setName('')
    setCategory('저축')
    setPerson('A')
    setHasDefault(false)
    setDefaultAmount('')
    setLocked(false)
  }

  const personOptions = [
    { value: 'A', label: personAName },
    { value: 'B', label: personBName },
  ]

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginTop: 8, flexWrap: 'wrap' }}>
      <div style={{ minWidth: 120, flexShrink: 0 }}>
        <CustomSelect
          options={ASSET_CATEGORIES}
          value={category}
          onChange={setCategory}
          compact
          compactFill
          compactHeight={40}
        />
      </div>

      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="항목명"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        style={{
          flex: 1,
          minWidth: 140,
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

      {/* 명의 선택 */}
      <div style={{ minWidth: 100, flexShrink: 0 }}>
        <CustomSelect
          options={personOptions.map(o => o.label)}
          value={personOptions.find(o => o.value === person)?.label ?? personAName}
          onChange={(label) => {
            const opt = personOptions.find(o => o.label === label)
            if (opt) setPerson(opt.value as 'A' | 'B')
          }}
          compact
          compactFill
          compactHeight={40}
        />
      </div>

      {/* 정기입금액 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 12 }}>
        <input
          type="checkbox"
          checked={hasDefault}
          onChange={(e) => {
            setHasDefault(e.target.checked)
            if (!e.target.checked) setDefaultAmount('')
          }}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: PRIMARY }}
        />
        <label style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
          정기입금액
        </label>
      </div>
      {hasDefault && (
        <div style={{ minWidth: 130, flexShrink: 0 }}>
          <AmountInput value={defaultAmount} onChange={setDefaultAmount} placeholder="0" height={40} />
        </div>
      )}

      {/* 묶인 돈 토글 */}
      <button
        type="button"
        onClick={() => setLocked((v) => !v)}
        title={locked ? '묶인 돈 (클릭하여 해제)' : '묶인 돈 표시'}
        style={{
          flexShrink: 0,
          height: 40,
          padding: '0 12px',
          borderRadius: INPUT_BORDER_RADIUS,
          border: `1px solid ${locked ? PRIMARY : '#e5e7eb'}`,
          background: locked ? 'rgba(79, 140, 255, 0.1)' : '#fff',
          fontSize: 14,
          cursor: 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          color: locked ? PRIMARY : '#9ca3af',
          fontWeight: 500,
        }}
      >
        <span style={{ fontSize: 16, filter: locked ? 'none' : 'grayscale(1) opacity(0.6)' }}>🔒</span>
        <span style={{ fontSize: 12 }}>{locked ? 'on' : 'off'}</span>
      </button>

      <button
        type="button"
        onClick={handleAdd}
        style={{
          ...jellyPrimaryButton,
          fontSize: 13,
          padding: '0 16px',
          height: 40,
          flexShrink: 0,
          opacity: name.trim() ? 1 : 0.45,
          cursor: name.trim() ? 'pointer' : 'default',
        }}
      >
        + 추가
      </button>
    </div>
  )
}

export function AssetPage() {
  const narrow = useNarrowLayout()
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const yearPickerMaxYear = useAppStore((s) => s.yearPickerMaxYear)
  const settings = useAppStore((s) => s.settings)
  const currentYear = parseInt(currentYearMonth.split('-')[0], 10)
  const currentMonth = parseInt(currentYearMonth.split('-')[1], 10) - 1 // 0-based

  // 표시할 연도 목록 (오래된 → 최신순)
  const years = useMemo(() => getYearPickerYearOptions(yearPickerMaxYear, currentYear), [yearPickerMaxYear, currentYear])

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

  /** 월이 편집 가능한지 (특정 연도/월 기준) */
  const isMonthEditable = (yr: number, monthIdx: number): boolean => {
    if (yr < currentYear) return true
    if (yr > currentYear) return false
    return monthIdx <= currentMonth
  }

  /** 미래 월의 예측값 계산 (특정 연도/월 기준) */
  const getProjectedValue = (yr: number, item: AssetItem, monthIdx: number): number => {
    if (yr !== currentYear) return getEntry(item.id, ym(yr, monthIdx))
    const baseYM = ym(currentYear, currentMonth)
    const base = getEntry(item.id, baseYM)
    const gap = monthIdx - currentMonth
    if (item.defaultAmount && item.defaultAmount > 0) {
      return base + item.defaultAmount * gap
    }
    return base
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
  // entries 사용 표시 (lint warning 방지) - subscribe 목적
  void entries

  // 항목 수정 모달
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null)
  const [editForm, setEditForm] = useState({ name: '', category: '저축', defaultAmount: '', person: '공유' as 'A' | 'B' | '공유', locked: false })

  /** 명의 순(A → B → 공유) → 그 안에서 order 순으로 정렬 */
  const personRank = (p?: 'A' | 'B'): number => (p === 'A' ? 0 : p === 'B' ? 1 : 2)
  const sortedItems = [...items].sort((a, b) => {
    const ra = personRank(a.person)
    const rb = personRank(b.person)
    if (ra !== rb) return ra - rb
    return a.order - b.order
  })

  /** 특정 연도의 월별 합계 계산 (모든 항목 - 접힘 여부와 무관) */
  const calcMonthTotals = (yr: number) =>
    Array.from({ length: 12 }, (_, mi) => {
      const isFuture = yr === currentYear && mi > currentMonth
      return sortedItems.reduce((sum, item) => {
        const val = isFuture ? getProjectedValue(yr, item, mi) : getEntry(item.id, ym(yr, mi))
        return sum + val
      }, 0)
    })

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
    const calculated = maxStrLen * 4 + 12
    return Math.max(BASE_ITEM_COLUMN_WIDTH, calculated)
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
            .filter((item) => item.person === p)
            .reduce((sum, item) => sum + getEntry(item.id, currentYM), 0)
        const availableTotal = sortedItems
          .filter((item) => !item.locked)
          .reduce((sum, item) => sum + getEntry(item.id, currentYM), 0)
        const personATotal = sumByPerson('A')
        const personBTotal = sumByPerson('B')
        const sharedTotal = sortedItems
          .filter((item) => !item.person)
          .reduce((sum, item) => sum + getEntry(item.id, currentYM), 0)
        return (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
            {/* 상단: 총 합계 + 가용 금액 */}
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

      {/* 연도별 테이블 (최신순으로 정렬) */}
      {[...years].reverse().map((yr) => {
        const monthTotals = calcMonthTotals(yr)
        return (
          <YearTable
            key={yr}
            year={yr}
            currentYear={currentYear}
            currentMonth={currentMonth}
            sortedItems={sortedItems}
            collapsedItems={collapsedItems}
            toggleCollapse={toggleCollapse}
            isMonthEditable={isMonthEditable}
            getProjectedValue={getProjectedValue}
            getEntry={getEntry}
            setEntry={setEntry}
            monthTotals={monthTotals}
            onItemClick={(item) => {
              setEditingItem(item)
              setEditForm({
                name: item.name,
                category: item.category || '저축',
                defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '',
                person: item.person ?? '공유',
                locked: !!item.locked,
              })
            }}
            getPersonColor={getPersonColor}
            getPersonLabel={getPersonLabel}
            getItemColumnBg={getItemColumnBg}
            tableMinWidth={tableMinWidth}
            itemColWidths={itemColWidths}
            sumColWidth={sumColWidth}
            MONTH_COLUMN_WIDTH={MONTH_COLUMN_WIDTH}
          />
        )
      })}

      {/* Add row (별도 카드) */}
      <div style={{ ...jellyCardStyle, padding: '12px 16px', marginTop: 16 }}>
        <AddItemRow
          personAName={personAName}
          personBName={personBName}
          onAdd={(name, category, defaultAmount, person, locked) => {
            const newItemId = addItem({
              name,
              category,
              person,
              defaultAmount: defaultAmount > 0 ? defaultAmount : undefined,
              locked: locked || undefined,
            })

            // 정기입금액이 설정되면 현재 월부터 자동 채우기 (누적)
            if (defaultAmount > 0) {
              for (let mi = currentMonth; mi < 12; mi++) {
                const cumulativeAmount = defaultAmount * (mi - currentMonth + 1)
                setEntry(newItemId, ym(currentYear, mi), cumulativeAmount)
              }
            }
          }}
        />
      </div>


      {/* Edit item modal */}
      <Modal
        open={editingItem !== null}
        title="항목 수정"
        onClose={() => setEditingItem(null)}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>항목명</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리</div>
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
              <div style={{ fontSize: 12, marginBottom: 4 }}>명의</div>
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

          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>정기입금액 (선택)</div>
            <AmountInput
              value={editForm.defaultAmount}
              onChange={(v) => setEditForm({ ...editForm, defaultAmount: v })}
              placeholder="매월 추가되는 금액"
              height={40}
            />
          </div>

          {/* 묶인 돈 토글 */}
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>묶인 돈</div>
            <button
              type="button"
              onClick={() => setEditForm({ ...editForm, locked: !editForm.locked })}
              style={{
                width: '100%',
                height: 40,
                padding: '0 12px',
                borderRadius: INPUT_BORDER_RADIUS,
                border: `1px solid ${editForm.locked ? PRIMARY : '#e5e7eb'}`,
                background: editForm.locked ? 'rgba(79, 140, 255, 0.1)' : '#fff',
                fontSize: 13,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                color: editForm.locked ? PRIMARY : '#9ca3af',
                fontFamily: 'inherit',
              }}
            >
              <span style={{ fontSize: 16, filter: editForm.locked ? 'none' : 'grayscale(1) opacity(0.6)' }}>🔒</span>
              <span>{editForm.locked ? 'on (만기까지 묶인 자산)' : 'off'}</span>
            </button>
          </div>
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
                if (editingItem && editForm.name.trim()) {
                  const newDefaultAmount = editForm.defaultAmount ? parseInt(editForm.defaultAmount.replace(/,/g, ''), 10) : undefined
                  const newPerson = editForm.person === '공유' ? undefined : editForm.person as 'A' | 'B'
                  const oldDefaultAmount = editingItem.defaultAmount

                  updateItem(editingItem.id, {
                    name: editForm.name.trim(),
                    category: editForm.category || '저축',
                    person: newPerson,
                    defaultAmount: newDefaultAmount,
                    locked: editForm.locked || undefined,
                  })

                  // 정기입금액 변경 시 현재 연도의 다음 달부터 누적 업데이트
                  if (newDefaultAmount && newDefaultAmount > 0 && newDefaultAmount !== oldDefaultAmount) {
                    for (let mi = currentMonth + 1; mi < 12; mi++) {
                      const prevMonthAmount = getEntry(editingItem.id, ym(currentYear, mi - 1))
                      setEntry(editingItem.id, ym(currentYear, mi), prevMonthAmount + newDefaultAmount)
                    }
                  }

                  setEditingItem(null)
                }
              }}
              style={{
                padding: '8px 16px',
                borderRadius: JELLY.radiusControl,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: editForm.name.trim() ? 'pointer' : 'not-allowed',
                background: editForm.name.trim() ? PRIMARY : '#e5e7eb',
                color: editForm.name.trim() ? '#fff' : '#9ca3af',
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
