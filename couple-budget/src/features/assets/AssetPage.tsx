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
          height: 32,
          padding: '0 6px',
          border: `1.5px solid ${PRIMARY}`,
          borderRadius: 6,
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
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 6px',
        borderRadius: 6,
        fontSize: 12,
        color: projected
          ? (value === 0 ? '#d1d5db' : '#9ca3af')  // 예측값: 회색
          : (value === 0 ? '#d1d5db' : JELLY.text),
        cursor: (disabled || projected) ? 'default' : 'pointer',
        userSelect: 'none',
        background: projected
          ? (value > 0 ? 'rgba(156, 163, 175, 0.06)' : 'transparent')  // 예측값: 연회색 배경
          : (value > 0 ? 'rgba(79, 140, 255, 0.04)' : 'transparent'),
        border: '1.5px solid transparent',
        boxSizing: 'border-box',
        minWidth: 60,
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
  tableMinWidth,
  ITEM_COLUMN_WIDTH,
  COLLAPSED_COLUMN_WIDTH,
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
  tableMinWidth: number
  ITEM_COLUMN_WIDTH: number
  COLLAPSED_COLUMN_WIDTH: number
  MONTH_COLUMN_WIDTH: number
}) {
  const [yearCollapsed, setYearCollapsed] = useState(year < currentYear)

  const monthHeaderStyle: React.CSSProperties = {
    flex: `0 0 ${MONTH_COLUMN_WIDTH}px`,
    paddingLeft: 12,
    paddingRight: 6,
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    minHeight: 36,
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    background: '#f9fafb',
  }

  const yearTotal = monthTotals.reduce((a, b) => a + b, 0)

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
          background: year === currentYear ? PRIMARY_LIGHT : '#fafbfc',
          cursor: 'pointer',
          borderBottom: yearCollapsed ? 'none' : '1px solid #e5e7eb',
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
        <div style={{ fontSize: 13, fontWeight: 600, color: yearTotal > 0 ? JELLY.text : '#9ca3af' }}>
          {yearTotal > 0 ? `합계 ${yearTotal.toLocaleString('ko-KR')}원` : '데이터 없음'}
        </div>
      </div>

      {!yearCollapsed && (
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: tableMinWidth }}>
            {sortedItems.length > 0 && (
              <>
                {/* 항목명 행 */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <div style={monthHeaderStyle}>월</div>
                  {sortedItems.map((item) => {
                    const isCollapsed = collapsedItems.has(item.id)
                    const colWidth = isCollapsed ? COLLAPSED_COLUMN_WIDTH : ITEM_COLUMN_WIDTH
                    return (
                      <div
                        key={`name-${item.id}`}
                        style={{
                          flex: `0 0 ${colWidth}px`,
                          padding: '6px 4px 0 4px',
                          fontSize: 12,
                          fontWeight: 600,
                          color: JELLY.text,
                          background: '#f9fafb',
                          textAlign: 'center',
                          borderRight: '1px solid #e5e7eb',
                          overflow: 'hidden',
                          whiteSpace: 'nowrap',
                          position: 'relative',
                          minHeight: 36,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: 2,
                        }}
                        title={isCollapsed ? `${item.name} (접힘) - 클릭하여 펼치기` : `${item.name} (${getPersonLabel(item.person)})`}
                      >
                        {/* 접기/펼치기 토글 */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            toggleCollapse(item.id)
                          }}
                          title={isCollapsed ? '펼치기' : '접기'}
                          style={{
                            width: 18,
                            height: 18,
                            border: 'none',
                            background: 'transparent',
                            cursor: 'pointer',
                            fontSize: 9,
                            color: '#6b7280',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                          }}
                        >
                          {isCollapsed ? '▶' : '◀'}
                        </button>
                        {!isCollapsed && (
                          <div
                            onClick={() => onItemClick(item)}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              gap: 4,
                              cursor: 'pointer',
                              minWidth: 0,
                              overflow: 'hidden',
                            }}
                          >
                            <span
                              style={{
                                display: 'inline-block',
                                width: 7,
                                height: 7,
                                borderRadius: '50%',
                                background: getPersonColor(item.person),
                                flexShrink: 0,
                              }}
                            />
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                          </div>
                        )}
                      </div>
                    )
                  })}
                  <div
                    style={{
                      flex: `0 0 ${ITEM_COLUMN_WIDTH}px`,
                      padding: '6px 12px 0 12px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: JELLY.text,
                      background: '#f9fafb',
                      textAlign: 'center',
                      borderLeft: '2px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      marginLeft: 'auto',
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
                <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#fafbfc' }}>
                  <div style={{ ...monthHeaderStyle, background: '#fafbfc' }} />
                  {sortedItems.map((item) => {
                    const isCollapsed = collapsedItems.has(item.id)
                    const colWidth = isCollapsed ? COLLAPSED_COLUMN_WIDTH : ITEM_COLUMN_WIDTH
                    return (
                      <div
                        key={`cat-${item.id}`}
                        onClick={() => !isCollapsed && onItemClick(item)}
                        style={{
                          flex: `0 0 ${colWidth}px`,
                          padding: '4px 4px 6px 4px',
                          fontSize: 10,
                          color: '#9ca3af',
                          background: '#fafbfc',
                          textAlign: 'center',
                          borderRight: '1px solid #e5e7eb',
                          borderTop: `3px solid ${getPersonColor(item.person)}`,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          gap: 2,
                          cursor: isCollapsed ? 'default' : 'pointer',
                          borderRadius: '0 0 6px 6px',
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
                      flex: `0 0 ${ITEM_COLUMN_WIDTH}px`,
                      padding: '0 12px',
                      background: '#fafbfc',
                      borderLeft: '2px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      marginLeft: 'auto',
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
                return (
                  <div
                    key={month}
                    style={{
                      display: 'flex',
                      borderBottom: '1px solid #f3f4f6',
                      background: isFuture ? 'rgba(243,244,246,0.5)' : undefined,
                    }}
                  >
                    <div style={{ ...monthHeaderStyle, color: isFuture ? '#9ca3af' : undefined }}>{month}</div>
                    {sortedItems.map((item) => {
                      const isCollapsed = collapsedItems.has(item.id)
                      const colWidth = isCollapsed ? COLLAPSED_COLUMN_WIDTH : ITEM_COLUMN_WIDTH
                      const displayValue = isFuture
                        ? getProjectedValue(year, item, mi)
                        : getEntry(item.id, ym(year, mi))
                      return (
                        <div
                          key={`${item.id}-${mi}`}
                          style={{
                            flex: `0 0 ${colWidth}px`,
                            padding: isCollapsed ? '0 4px' : '0 8px',
                            borderRight: '1px solid #f3f4f6',
                            background: isCollapsed ? '#fafbfc' : undefined,
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
                    {/* 월 합계 */}
                    <div
                      style={{
                        flex: `0 0 ${ITEM_COLUMN_WIDTH}px`,
                        padding: '0 12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontSize: 12,
                        fontWeight: 600,
                        color: monthTotals[mi] > 0 ? PRIMARY : '#d1d5db',
                        borderLeft: '2px solid #f3f4f6',
                        borderRight: '1px solid #f3f4f6',
                        marginLeft: 'auto',
                        minHeight: 36,
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
  onAdd: (name: string, category: string, defaultAmount: number, person: 'A' | 'B' | undefined, initialAmount: number) => void
  personAName: string
  personBName: string
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('저축')
  const [person, setPerson] = useState<'A' | 'B'>('A')
  const [hasInitial, setHasInitial] = useState(false)
  const [initialAmount, setInitialAmount] = useState('')
  const [hasDefault, setHasDefault] = useState(false)
  const [defaultAmount, setDefaultAmount] = useState('')

  const handleAdd = () => {
    const t = name.trim()
    if (!t) return
    const defAmt = hasDefault && defaultAmount ? parseInt(defaultAmount.replace(/,/g, ''), 10) : 0
    const initAmt = hasInitial && initialAmount ? parseInt(initialAmount.replace(/,/g, ''), 10) : 0
    onAdd(t, category, defAmt, person, initAmt)
    setName('')
    setCategory('저축')
    setPerson('A')
    setHasInitial(false)
    setInitialAmount('')
    setHasDefault(false)
    setDefaultAmount('')
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

      {/* 초기 잔액 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 12 }}>
        <input
          type="checkbox"
          checked={hasInitial}
          onChange={(e) => {
            setHasInitial(e.target.checked)
            if (!e.target.checked) setInitialAmount('')
          }}
          style={{ width: 16, height: 16, cursor: 'pointer', accentColor: PRIMARY }}
        />
        <label style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
          초기잔액
        </label>
      </div>
      {hasInitial && (
        <div style={{ minWidth: 130, flexShrink: 0 }}>
          <AmountInput value={initialAmount} onChange={setInitialAmount} placeholder="0" height={40} />
        </div>
      )}

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
    const base = getEntry(item.id, baseYM) || (item.initialAmount ?? 0)
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
  const [editForm, setEditForm] = useState({ name: '', defaultAmount: '', initialAmount: '', person: '공유' as 'A' | 'B' | '공유' })

  const sortedItems = [...items].sort((a, b) => a.order - b.order)

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
  const ITEM_COLUMN_WIDTH = 120
  const COLLAPSED_COLUMN_WIDTH = 40 // 접힌 항목 너비
  const visibleColumnsWidth = sortedItems.reduce(
    (sum, item) => sum + (collapsedItems.has(item.id) ? COLLAPSED_COLUMN_WIDTH : ITEM_COLUMN_WIDTH),
    0,
  )
  const tableMinWidth = MONTH_COLUMN_WIDTH + Math.max(visibleColumnsWidth, 200) + ITEM_COLUMN_WIDTH

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
    borderRight: '1px solid #e5e7eb',
    display: 'flex',
    alignItems: 'center',
    minHeight: 36,
    textAlign: 'left' as const,
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 16 }}>자산</h1>

      {/* Current month summary */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{currentYear}년 {MONTHS[currentMonth]}</div>
        <div style={{ fontSize: 28, fontWeight: 700, color: PRIMARY }}>{fmtSum(currentYearMonthTotals[currentMonth])}</div>
      </div>

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
              border: '1px solid #e5e7eb',
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
                defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '',
                initialAmount: item.initialAmount ? String(item.initialAmount) : '',
                person: item.person ?? '공유',
              })
            }}
            getPersonColor={getPersonColor}
            getPersonLabel={getPersonLabel}
            tableMinWidth={tableMinWidth}
            ITEM_COLUMN_WIDTH={ITEM_COLUMN_WIDTH}
            COLLAPSED_COLUMN_WIDTH={COLLAPSED_COLUMN_WIDTH}
            MONTH_COLUMN_WIDTH={MONTH_COLUMN_WIDTH}
          />
        )
      })}

      {/* Add row (별도 카드) */}
      <div style={{ ...jellyCardStyle, padding: '12px 16px', marginTop: 16 }}>
        <AddItemRow
          personAName={personAName}
          personBName={personBName}
          onAdd={(name, category, defaultAmount, person, initialAmount) => {
            const newItemId = addItem({
              name,
              category,
              person,
              initialAmount: initialAmount > 0 ? initialAmount : undefined,
              defaultAmount: defaultAmount > 0 ? defaultAmount : undefined,
            })

            // 정기입금액이나 초기잔액이 설정되면 현재 월부터 자동 채우기
            if (defaultAmount > 0 || initialAmount > 0) {
              for (let mi = currentMonth; mi < 12; mi++) {
                const base = initialAmount > 0 ? initialAmount : 0
                if (defaultAmount > 0) {
                  const cumulativeAmount = base + defaultAmount * (mi - currentMonth + 1)
                  setEntry(newItemId, ym(currentYear, mi), cumulativeAmount)
                } else if (mi === currentMonth && base > 0) {
                  setEntry(newItemId, ym(currentYear, mi), base)
                }
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

          <div>
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

          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>초기 잔액 (선택)</div>
            <AmountInput
              value={editForm.initialAmount}
              onChange={(v) => setEditForm({ ...editForm, initialAmount: v })}
              placeholder="현재 보유 금액"
              height={40}
            />
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
                border: '1px solid #e5e7eb',
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
                  const newInitialAmount = editForm.initialAmount ? parseInt(editForm.initialAmount.replace(/,/g, ''), 10) : undefined
                  const newPerson = editForm.person === '공유' ? undefined : editForm.person as 'A' | 'B'
                  const oldDefaultAmount = editingItem.defaultAmount

                  updateItem(editingItem.id, {
                    name: editForm.name.trim(),
                    person: newPerson,
                    initialAmount: newInitialAmount,
                    defaultAmount: newDefaultAmount,
                  })

                  // 정기입금액 변경 시 다음 달부터 누적 업데이트
                  if (newDefaultAmount && newDefaultAmount > 0 && newDefaultAmount !== oldDefaultAmount) {
                    if (year === currentYear) {
                      for (let mi = currentMonth + 1; mi < 12; mi++) {
                        const prevMonthAmount = getEntry(editingItem.id, ym(currentYear, mi - 1))
                        setEntry(editingItem.id, ym(currentYear, mi), prevMonthAmount + newDefaultAmount)
                      }
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
