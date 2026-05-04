import { useState, useRef } from 'react'
import { useAssetStore, ASSET_CATEGORIES } from '@/store/useAssetStore'
import { useAppStore } from '@/store/useAppStore'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
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

function AddItemRow({ onAdd, personAName, personBName }: {
  onAdd: (name: string, category: string, defaultAmount: number, person: 'A' | 'B' | undefined, initialAmount: number) => void
  personAName: string
  personBName: string
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('저축')
  const [person, setPerson] = useState<'A' | 'B' | '공유'>('공유')
  const [hasInitial, setHasInitial] = useState(false)
  const [initialAmount, setInitialAmount] = useState('')
  const [hasDefault, setHasDefault] = useState(false)
  const [defaultAmount, setDefaultAmount] = useState('')

  const handleAdd = () => {
    const t = name.trim()
    if (!t) return
    const defAmt = hasDefault && defaultAmount ? parseInt(defaultAmount.replace(/,/g, ''), 10) : 0
    const initAmt = hasInitial && initialAmount ? parseInt(initialAmount.replace(/,/g, ''), 10) : 0
    onAdd(t, category, defAmt, person === '공유' ? undefined : person, initAmt)
    setName('')
    setCategory('저축')
    setPerson('공유')
    setHasInitial(false)
    setInitialAmount('')
    setHasDefault(false)
    setDefaultAmount('')
  }

  const personOptions = [
    { value: '공유', label: '공유' },
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
          value={personOptions.find(o => o.value === person)?.label ?? '공유'}
          onChange={(label) => {
            const opt = personOptions.find(o => o.label === label)
            if (opt) setPerson(opt.value as 'A' | 'B' | '공유')
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
  const [year, setYear] = useState(currentYear)

  /** 월이 편집 가능한지 (현재 연도에서 현재 월 이하만 수정 가능) */
  const isMonthEditable = (monthIdx: number): boolean => {
    if (year < currentYear) return true   // 이전 연도 전부 수정 가능
    if (year > currentYear) return false  // 미래 연도 전부 읽기 전용
    return monthIdx <= currentMonth       // 현재 연도: 현재 달 이하만 수정 가능
  }

  /** 미래 월의 예측값 계산 */
  const getProjectedValue = (item: AssetItem, monthIdx: number): number => {
    if (year !== currentYear) return getEntry(item.id, ym(year, monthIdx))
    // 기준: 현재 월 실제 입력값 (없으면 초기잔액)
    const baseYM = ym(currentYear, currentMonth)
    const base = getEntry(item.id, baseYM) || (item.initialAmount ?? 0)
    const gap = monthIdx - currentMonth // 1 이상
    if (item.defaultAmount && item.defaultAmount > 0) {
      return base + item.defaultAmount * gap
    }
    return base // 정기입금액 없으면 현재 월 금액 유지
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
  const addItem = useAssetStore((s) => s.addItem)
  const updateItem = useAssetStore((s) => s.updateItem)
  const removeItem = useAssetStore((s) => s.removeItem)
  const reorderItem = useAssetStore((s) => s.reorderItem)
  const setEntry = useAssetStore((s) => s.setEntry)
  const getEntry = useAssetStore((s) => s.getEntry)

  // 항목 수정 모달
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null)
  const [editForm, setEditForm] = useState({ name: '', defaultAmount: '', initialAmount: '', person: '공유' as 'A' | 'B' | '공유' })

  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  // Monthly totals (월별 입금액 합계, 미래 월은 예측값 사용)
  const monthTotals = Array.from({ length: 12 }, (_, mi) => {
    const isFuture = year === currentYear && mi > currentMonth
    return sortedItems.reduce((sum, item) => {
      const val = isFuture ? getProjectedValue(item, mi) : getEntry(item.id, ym(year, mi))
      return sum + val
    }, 0)
  })

  // Cumulative totals (초기잔액 포함)
  const totalInitialAmount = sortedItems.reduce((sum, item) => sum + (item.initialAmount ?? 0), 0)
  const cumulativeTotals = monthTotals.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? totalInitialAmount) + v)
    return acc
  }, [])

  const totalSum = totalInitialAmount + monthTotals.reduce((a, b) => a + b, 0)

  const CELL_W = narrow ? 80 : 100
  const MONTH_COL_W = narrow ? 50 : 60
  const tableMinWidth = MONTH_COL_W + CELL_W * sortedItems.length + 80 + 20

  const headerCellStyle: React.CSSProperties = {
    padding: '0 6px',
    fontSize: 11,
    fontWeight: 600,
    color: '#6b7280',
    background: '#f9fafb',
    textAlign: 'center' as const,
    whiteSpace: 'nowrap',
    flexShrink: 0,
  }

  const monthHeaderStyle: React.CSSProperties = {
    ...headerCellStyle,
    width: MONTH_COL_W,
    minWidth: MONTH_COL_W,
    textAlign: 'left' as const,
    paddingLeft: 12,
    borderRight: '1px solid #e5e7eb',
    height: 36,
    display: 'flex',
    alignItems: 'center',
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 16 }}>자산</h1>

      {/* Year selector */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
        <span style={{ fontSize: 14, fontWeight: 600, color: JELLY.text }}>연도</span>
        <YearSelectDropdown
          value={year}
          onChange={setYear}
          variant="light"
        />
      </div>

      {/* Summary cards */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ ...jellyCardStyle, padding: '14px 20px', minWidth: 140 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>{year}년 총 적립</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: PRIMARY }}>{fmtSum(totalSum)}</div>
        </div>
        <div style={{ ...jellyCardStyle, padding: '14px 20px', minWidth: 140 }}>
          <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 4 }}>항목 수</div>
          <div style={{ fontSize: 18, fontWeight: 700, color: JELLY.text }}>{sortedItems.length}개</div>
        </div>
      </div>

      {/* Table */}
      <div style={{ ...jellyCardStyle, overflow: 'hidden' }}>
        <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
          <div style={{ minWidth: tableMinWidth }}>
            {/* Header with month column + item headers */}
            {sortedItems.length > 0 && (
              <>
                {/* Item names header row */}
                <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                  <div style={monthHeaderStyle}>월</div>
                  {sortedItems.map((item) => (
                    <div
                      key={`name-${item.id}`}
                      onClick={() => {
                        setEditingItem(item)
                        setEditForm({
                          name: item.name,
                          defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '',
                          initialAmount: item.initialAmount ? String(item.initialAmount) : '',
                          person: item.person ?? '공유',
                        })
                      }}
                      style={{
                        width: CELL_W,
                        minWidth: CELL_W,
                        padding: '6px 2px 0 2px',
                        fontSize: 12,
                        fontWeight: 600,
                        color: JELLY.text,
                        background: '#f9fafb',
                        textAlign: 'center' as const,
                        borderRight: '1px solid #e5e7eb',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap' as const,
                        cursor: 'pointer',
                        borderRadius: 6,
                        position: 'relative' as const,
                      }}
                      title={`${item.name} (${getPersonLabel(item.person)})\n클릭하여 수정`}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4f8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
                    >
                      {/* 명의 컬러 dot */}
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 4,
                      }}>
                        <span style={{
                          display: 'inline-block',
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: getPersonColor(item.person),
                          flexShrink: 0,
                        }} />
                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.name}</span>
                      </div>
                    </div>
                  ))}
                  <div
                    style={{
                      width: 80,
                      minWidth: 80,
                      padding: '6px 6px 0 6px',
                      fontSize: 12,
                      fontWeight: 600,
                      color: JELLY.text,
                      background: '#f9fafb',
                      textAlign: 'center' as const,
                      borderLeft: '2px solid #e5e7eb',
                      borderRight: '1px solid #e5e7eb',
                      marginLeft: 'auto',
                    }}
                  >
                    합계
                  </div>
                </div>

                {/* Item categories + defaultAmount header row */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#fafbfc' }}>
                  <div style={{ ...monthHeaderStyle, background: '#fafbfc' }} />
                  {sortedItems.map((item) => (
                    <div
                      key={`cat-${item.id}`}
                      onClick={() => {
                        setEditingItem(item)
                        setEditForm({
                          name: item.name,
                          defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '',
                          initialAmount: item.initialAmount ? String(item.initialAmount) : '',
                          person: item.person ?? '공유',
                        })
                      }}
                      style={{
                        width: CELL_W,
                        minWidth: CELL_W,
                        padding: '0 2px 6px 2px',
                        fontSize: 10,
                        color: '#9ca3af',
                        background: '#fafbfc',
                        textAlign: 'center' as const,
                        borderRight: '1px solid #e5e7eb',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        gap: 2,
                        cursor: 'pointer',
                        borderRadius: 6,
                      }}
                      title="클릭하여 수정"
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f7fc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fafbfc')}
                    >
                      <div style={{ color: getPersonColor(item.person), fontWeight: 600, fontSize: 9 }}>
                        {getPersonLabel(item.person)}
                      </div>
                      <div>{item.category}</div>
                      {item.defaultAmount ? (
                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500 }}>
                          +{item.defaultAmount.toLocaleString('ko-KR')}
                        </div>
                      ) : null}
                    </div>
                  ))}
                  <div style={{ width: 80, minWidth: 80, background: '#fafbfc', borderLeft: '2px solid #e5e7eb', borderRight: '1px solid #e5e7eb', marginLeft: 'auto' }} />
                </div>

                {/* 초기잔액 row (initialAmount 있는 항목만) */}
                {sortedItems.some(item => item.initialAmount) && (
                  <div style={{ display: 'flex', borderBottom: '1px solid #e5e7eb', background: '#f9fafb' }}>
                    <div style={{ ...monthHeaderStyle, background: '#f9fafb', fontSize: 10, color: '#9ca3af' }}>초기잔액</div>
                    {sortedItems.map((item) => (
                      <div
                        key={`init-${item.id}`}
                        style={{
                          width: CELL_W,
                          minWidth: CELL_W,
                          padding: '0 6px',
                          height: 32,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          fontSize: 11,
                          color: item.initialAmount ? '#6b7280' : '#d1d5db',
                          borderRight: '1px solid #f3f4f6',
                        }}
                      >
                        {item.initialAmount ? item.initialAmount.toLocaleString('ko-KR') : '—'}
                      </div>
                    ))}
                    <div style={{
                      width: 80, minWidth: 80, padding: '0 6px', height: 32,
                      display: 'flex', alignItems: 'center', justifyContent: 'flex-end',
                      fontSize: 11, fontWeight: 600, color: totalInitialAmount > 0 ? '#6b7280' : '#d1d5db',
                      borderLeft: '2px solid #f3f4f6', borderRight: '1px solid #f3f4f6', marginLeft: 'auto',
                    }}>
                      {totalInitialAmount > 0 ? totalInitialAmount.toLocaleString('ko-KR') : '—'}
                    </div>
                  </div>
                )}
              </>
            )}

            {/* Month rows */}
            {sortedItems.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                아래 '+ 추가' 버튼으로 자산 항목을 추가해주세요.
              </div>
            ) : (
              <>
                {MONTHS.map((month, mi) => {
                  const editable = isMonthEditable(mi)
                  const isFuture = year === currentYear && mi > currentMonth
                  return (
                    <div key={month} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6', background: isFuture ? 'rgba(243,244,246,0.5)' : undefined }}>
                      <div style={{ ...monthHeaderStyle, color: isFuture ? '#9ca3af' : undefined }}>{month}</div>
                      {sortedItems.map((item) => {
                        const displayValue = isFuture ? getProjectedValue(item, mi) : getEntry(item.id, ym(year, mi))
                        return (
                        <div
                          key={`${item.id}-${mi}`}
                          style={{
                            width: CELL_W,
                            minWidth: CELL_W,
                            padding: '0 2px',
                            borderRight: '1px solid #f3f4f6',
                          }}
                        >
                          <AmountCell
                            value={displayValue}
                            onChange={(v) => {
                              const amount = v ? parseInt(v.replace(/,/g, ''), 10) : 0
                              setEntry(item.id, ym(year, mi), amount)
                            }}
                            disabled={!editable && !isFuture}
                            projected={isFuture}
                          />
                        </div>
                        )
                      })}
                      {/* Month total */}
                      <div
                        style={{
                          width: 80,
                          minWidth: 80,
                          padding: '0 6px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'flex-end',
                          fontSize: 12,
                          fontWeight: 600,
                          color: monthTotals[mi] > 0 ? PRIMARY : '#d1d5db',
                          borderLeft: '2px solid #f3f4f6',
                          borderRight: '1px solid #f3f4f6',
                          marginLeft: 'auto',
                        }}
                      >
                        {monthTotals[mi] > 0 ? monthTotals[mi].toLocaleString('ko-KR') : '—'}
                      </div>
                    </div>
                  )
                })}

                {/* Cumulative row */}
                <div style={{ display: 'flex', borderBottom: 'none', background: `color-mix(in srgb, ${PRIMARY} 4%, white)`, borderTop: '2px solid #e5e7eb' }}>
                  <div style={{ ...monthHeaderStyle, background: `color-mix(in srgb, ${PRIMARY} 4%, white)` }}>누적</div>
                  {sortedItems.map((item) => (
                    <div
                      key={`cum-${item.id}`}
                      style={{
                        width: CELL_W,
                        minWidth: CELL_W,
                        padding: '0 2px',
                        borderRight: '1px solid #f3f4f6',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'flex-end',
                        fontSize: 12,
                        fontWeight: 600,
                        color: PRIMARY,
                        height: 36,
                      }}
                    >
                      {/* 연말 예측값 (초기잔액 + 전체 월 합산) */}
                      {(() => {
                        const yearEndValue = Array.from({ length: 12 }, (_, mi) => {
                          const isFuture = year === currentYear && mi > currentMonth
                          return isFuture ? getProjectedValue(item, mi) : getEntry(item.id, ym(year, mi))
                        }).reduce((_, val) => val, item.initialAmount ?? 0)
                        // 마지막 달의 값 (누적 잔액)
                        const lastMonthValue = (() => {
                          for (let mi = 11; mi >= 0; mi--) {
                            const isFuture = year === currentYear && mi > currentMonth
                            const val = isFuture ? getProjectedValue(item, mi) : getEntry(item.id, ym(year, mi))
                            if (val > 0) return val
                          }
                          return item.initialAmount ?? 0
                        })()
                        return lastMonthValue > 0 ? lastMonthValue.toLocaleString('ko-KR') : '—'
                      })()}
                    </div>
                  ))}
                  <div
                    style={{
                      width: 80,
                      minWidth: 80,
                      padding: '0 6px',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'flex-end',
                      fontSize: 13,
                      fontWeight: 700,
                      color: PRIMARY,
                      borderLeft: '2px solid #f3f4f6',
                      borderRight: '1px solid #f3f4f6',
                      marginLeft: 'auto',
                    }}
                  >
                    {totalSum > 0 ? totalSum.toLocaleString('ko-KR') : '—'}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Add row + Controls */}
        <div style={{ padding: '12px 16px', borderTop: '1px solid #f3f4f6' }}>
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

              // 정기입금액이 설정되면 현재 월부터 (초기잔액 + 정기입금액 누적) 자동 채우기
              if (defaultAmount > 0) {
                for (let mi = currentMonth; mi < 12; mi++) {
                  const base = initialAmount > 0 ? initialAmount : 0
                  const cumulativeAmount = base + defaultAmount * (mi - currentMonth + 1)
                  setEntry(newItemId, ym(currentYear, mi), cumulativeAmount)
                }
              }
            }}
          />
        </div>
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
