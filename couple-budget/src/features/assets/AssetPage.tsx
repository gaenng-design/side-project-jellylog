import { useState, useRef } from 'react'
import { useAssetStore, ASSET_CATEGORIES } from '@/store/useAssetStore'
import { useAppStore } from '@/store/useAppStore'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { JELLY, jellyCardStyle, jellyPrimaryButton } from '@/styles/jellyGlass'
import { pageTitleH1Style, PRIMARY, PRIMARY_LIGHT, settingsTemplateDeleteButtonStyle } from '@/styles/formControls'
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
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
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
    const v = parseInt(raw.replace(/,/g, ''), 10)
    onChange(isNaN(v) ? 0 : v)
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
      onClick={() => !disabled && startEdit()}
      style={{
        height: 32,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 6px',
        borderRadius: 6,
        fontSize: 12,
        color: value === 0 ? '#d1d5db' : JELLY.text,
        cursor: disabled ? 'default' : 'pointer',
        userSelect: 'none',
        background: value > 0 ? 'rgba(79, 140, 255, 0.04)' : 'transparent',
        border: '1.5px solid transparent',
        boxSizing: 'border-box',
        minWidth: 60,
        whiteSpace: 'nowrap',
      }}
    >
      {value === 0 ? '—' : value.toLocaleString('ko-KR')}
    </div>
  )
}

function AddItemRow({ onAdd }: { onAdd: (name: string, category: string) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('저축')

  const handleAdd = () => {
    const t = name.trim()
    if (!t) return
    onAdd(t, category)
    setName('')
    setCategory('저축')
  }

  return (
    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 8 }}>
      <select
        value={category}
        onChange={(e) => setCategory(e.target.value)}
        style={{
          height: 36,
          padding: '0 10px',
          borderRadius: JELLY.radiusControl,
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
          fontSize: 13,
          color: JELLY.text,
          outline: 'none',
          fontFamily: 'inherit',
          cursor: 'pointer',
          flexShrink: 0,
        }}
      >
        {ASSET_CATEGORIES.map((c) => (
          <option key={c} value={c}>{c}</option>
        ))}
      </select>
      <input
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="항목명 입력 (예: 청약저축, 주식 계좌)"
        onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        style={{
          flex: 1,
          height: 36,
          padding: '0 12px',
          borderRadius: JELLY.radiusControl,
          border: '1px solid #e5e7eb',
          background: '#fff',
          fontSize: 13,
          color: JELLY.text,
          outline: 'none',
          boxSizing: 'border-box',
          fontFamily: 'inherit',
        }}
      />
      <button
        type="button"
        onClick={handleAdd}
        style={{
          ...jellyPrimaryButton,
          fontSize: 13,
          padding: '0 16px',
          height: 36,
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
  const currentYear = parseInt(currentYearMonth.split('-')[0], 10)
  const [year, setYear] = useState(currentYear)

  const items = useAssetStore((s) => s.items)
  const addItem = useAssetStore((s) => s.addItem)
  const updateItem = useAssetStore((s) => s.updateItem)
  const removeItem = useAssetStore((s) => s.removeItem)
  const reorderItem = useAssetStore((s) => s.reorderItem)
  const setEntry = useAssetStore((s) => s.setEntry)
  const getEntry = useAssetStore((s) => s.getEntry)

  const sortedItems = [...items].sort((a, b) => a.order - b.order)

  // Monthly totals
  const monthTotals = Array.from({ length: 12 }, (_, mi) => {
    const yearMonth = ym(year, mi)
    return sortedItems.reduce((sum, item) => sum + getEntry(item.id, yearMonth), 0)
  })

  // Cumulative totals
  const cumulativeTotals = monthTotals.reduce<number[]>((acc, v, i) => {
    acc.push((acc[i - 1] ?? 0) + v)
    return acc
  }, [])

  const totalSum = monthTotals.reduce((a, b) => a + b, 0)

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
                      }}
                      title={item.name}
                    >
                      {item.name}
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
                      borderRight: '1px solid #e5e7eb',
                    }}
                  >
                    합계
                  </div>
                </div>

                {/* Item categories header row */}
                <div style={{ display: 'flex', borderBottom: '2px solid #e5e7eb', background: '#fafbfc' }}>
                  <div style={{ ...monthHeaderStyle, background: '#fafbfc' }} />
                  {sortedItems.map((item) => (
                    <div
                      key={`cat-${item.id}`}
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
                        alignItems: 'flex-end',
                        justifyContent: 'center',
                      }}
                    >
                      {item.category}
                    </div>
                  ))}
                  <div style={{ width: 80, minWidth: 80, background: '#fafbfc', borderRight: '1px solid #e5e7eb' }} />
                </div>
              </>
            )}

            {/* Month rows */}
            {sortedItems.length === 0 ? (
              <div style={{ padding: '32px 16px', textAlign: 'center', color: '#9ca3af', fontSize: 14 }}>
                아래 '+ 추가' 버튼으로 자산 항목을 추가해주세요.
              </div>
            ) : (
              <>
                {MONTHS.map((month, mi) => (
                  <div key={month} style={{ display: 'flex', borderBottom: '1px solid #f3f4f6' }}>
                    <div style={monthHeaderStyle}>{month}</div>
                    {sortedItems.map((item) => (
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
                          value={getEntry(item.id, ym(year, mi))}
                          onChange={(v) => setEntry(item.id, ym(year, mi), v)}
                        />
                      </div>
                    ))}
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
                        borderRight: '1px solid #f3f4f6',
                      }}
                    >
                      {monthTotals[mi] > 0 ? monthTotals[mi].toLocaleString('ko-KR') : '—'}
                    </div>
                  </div>
                ))}

                {/* Cumulative row */}
                <div style={{ display: 'flex', borderBottom: 'none', background: `color-mix(in srgb, ${PRIMARY} 4%, white)`, borderTop: '2px solid #e5e7eb' }}>
                  <div style={{ ...monthHeaderStyle, background: `color-mix(in srgb, ${PRIMARY} 4%, white)` }}>누적</div>
                  {sortedItems.map((item, idx) => (
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
                        color: cumulativeTotals[11] > 0 ? PRIMARY : '#d1d5db',
                        height: 36,
                      }}
                    >
                      {/* Calculate cumulative sum for each item */}
                      {(() => {
                        const itemCumulative = Array.from({ length: 12 }, (_, mi) => getEntry(item.id, ym(year, mi)))
                          .reduce((sum, val) => sum + val, 0)
                        return itemCumulative > 0 ? itemCumulative.toLocaleString('ko-KR') : '—'
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
                      borderRight: '1px solid #f3f4f6',
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
          <AddItemRow onAdd={(name, category) => addItem({ name, category, source: 'manual' })} />
        </div>
      </div>
    </div>
  )
}
