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
}: {
  value: number
  onChange: (v: string) => void
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
        opacity: disabled ? 0.5 : 1,
      }}
    >
      {value === 0 ? '—' : value.toLocaleString('ko-KR')}
    </div>
  )
}

function AddItemRow({ onAdd }: { onAdd: (name: string, category: string, amount: number) => void }) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState('저축')
  const [hasAmount, setHasAmount] = useState(false)
  const [amount, setAmount] = useState('')

  const handleAdd = () => {
    const t = name.trim()
    if (!t) return
    const amt = hasAmount && amount ? parseInt(amount.replace(/,/g, ''), 10) : 0
    onAdd(t, category, amt)
    setName('')
    setCategory('저축')
    setHasAmount(false)
    setAmount('')
  }

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

      <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0, paddingTop: 12 }}>
        <input
          type="checkbox"
          checked={hasAmount}
          onChange={(e) => {
            setHasAmount(e.target.checked)
            if (!e.target.checked) setAmount('')
          }}
          style={{
            width: 18,
            height: 18,
            cursor: 'pointer',
            accentColor: PRIMARY,
          }}
        />
        <label style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap', cursor: 'pointer', userSelect: 'none' }}>
          정기입금액
        </label>
      </div>

      {hasAmount && (
        <div style={{ minWidth: 140, flexShrink: 0 }}>
          <AmountInput
            value={amount}
            onChange={setAmount}
            placeholder="0"
            height={40}
          />
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
  const currentYear = parseInt(currentYearMonth.split('-')[0], 10)
  const currentMonth = parseInt(currentYearMonth.split('-')[1], 10) - 1 // 0-based
  const [year, setYear] = useState(currentYear)

  /** 월이 편집 가능한지 확인 (현재 연도에서 현재 월 이전까지만 가능) */
  const isMonthEditable = (monthIdx: number): boolean => {
    // 현재 연도보다 이전 연도는 모두 편집 가능
    if (year < currentYear) return true

    // 다음 연도는 편집 불가 (읽기전용)
    if (year > currentYear) return false

    // 현재 연도: 현재 월과 이전 월만 편집 가능
    // currentMonth는 0-based (0=1월, 3=4월)
    // monthIdx도 0-based (0=1월, 3=4월)
    return monthIdx <= currentMonth
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
  const [editForm, setEditForm] = useState({ name: '', defaultAmount: '' })

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
                      onClick={() => {
                        setEditingItem(item)
                        setEditForm({ name: item.name, defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '' })
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
                      }}
                      title={`${item.name}\n클릭하여 수정`}
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f0f4f8')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#f9fafb')}
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
                        setEditForm({ name: item.name, defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '' })
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
                      title="클릭하여 정기입금액 수정"
                      onMouseEnter={(e) => (e.currentTarget.style.background = '#f4f7fc')}
                      onMouseLeave={(e) => (e.currentTarget.style.background = '#fafbfc')}
                    >
                      <div>{item.category}</div>
                      {item.defaultAmount ? (
                        <div style={{ fontSize: 9, color: '#6b7280', fontWeight: 500 }}>
                          {item.defaultAmount.toLocaleString('ko-KR')}
                        </div>
                      ) : (
                        <div style={{ fontSize: 9, color: '#d1d5db', fontWeight: 400 }}>정기입금액 없음</div>
                      )}
                    </div>
                  ))}
                  <div style={{ width: 80, minWidth: 80, background: '#fafbfc', borderLeft: '2px solid #e5e7eb', borderRight: '1px solid #e5e7eb', marginLeft: 'auto' }} />
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
                {MONTHS.map((month, mi) => {
                  const isEditable = isMonthEditable(mi)
                  return (
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
                            onChange={(v) => {
                              const amount = v ? parseInt(v.replace(/,/g, ''), 10) : 0
                              console.log('[AssetPage] setEntry:', {
                                itemId: item.id,
                                yearMonth: ym(year, mi),
                                inputValue: v,
                                parsedAmount: amount,
                                isEditable: !isEditable
                              })
                              setEntry(item.id, ym(year, mi), amount)
                            }}
                            disabled={!isEditable}
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
          <AddItemRow onAdd={(name, category, amount) => {
            // 새 항목 추가
            const newItemId = addItem({ name, category, defaultAmount: amount > 0 ? amount : undefined, source: 'manual' })

            // CASE 1: 정기입금액이 설정되면 현재 월부터 누적 자동 채우기
            if (amount > 0) {
              for (let mi = currentMonth; mi < 12; mi++) {
                const yearMonth = ym(currentYear, mi)
                const cumulativeAmount = amount * (mi - currentMonth + 1)
                setEntry(newItemId, yearMonth, cumulativeAmount)
              }
            }
          }} />
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
            <div style={{ fontSize: 12, marginBottom: 4 }}>정기입금액 (선택)</div>
            <AmountInput
              value={editForm.defaultAmount}
              onChange={(v) => setEditForm({ ...editForm, defaultAmount: v })}
              placeholder="0"
              height={40}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
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
                const oldDefaultAmount = editingItem.defaultAmount
                const currentMonthIndex = currentMonth // 0-based

                updateItem(editingItem.id, {
                  name: editForm.name.trim(),
                  defaultAmount: newDefaultAmount,
                })

                // 정기입금액 변경 로직 (4가지 경우)
                if (newDefaultAmount && newDefaultAmount > 0) {
                  if (!oldDefaultAmount) {
                    // CASE 1: 새 항목 (AddItemRow에서 체크박스 선택한 경우)
                    // 또는 CASE 2: 기존 항목에 정기입금액 추가 (현재 모달에서 처음 설정)
                    if (year === currentYear) {
                      // 현재 월은 기존값 유지, 다음 월부터 누적 시작
                      const currentMonthAmount = getEntry(editingItem.id, ym(currentYear, currentMonthIndex))

                      // 다음 월부터 적용
                      for (let mi = currentMonthIndex + 1; mi < 12; mi++) {
                        const prevMonthAmount = getEntry(editingItem.id, ym(currentYear, mi - 1))
                        const cumulativeAmount = prevMonthAmount + newDefaultAmount
                        setEntry(editingItem.id, ym(currentYear, mi), cumulativeAmount)
                      }
                    }
                  } else if (newDefaultAmount !== oldDefaultAmount) {
                    // CASE 3: 정기입금액 변경
                    // 이전 월들은 유지, 다음 월부터 새 금액으로 누적
                    if (year === currentYear) {
                      for (let mi = currentMonthIndex + 1; mi < 12; mi++) {
                        const prevMonthAmount = getEntry(editingItem.id, ym(currentYear, mi - 1))
                        const cumulativeAmount = prevMonthAmount + newDefaultAmount
                        setEntry(editingItem.id, ym(currentYear, mi), cumulativeAmount)
                      }
                    }
                  }
                  // else: 정기입금액이 같으면 변경 없음
                } else if (!newDefaultAmount && oldDefaultAmount) {
                  // CASE 4: 정기입금액 삭제
                  // 이전 누적값은 유지, 수동 편집만 가능하게 됨
                  // 아무 처리도 필요 없음 (이미 updateItem에서 defaultAmount를 undefined로 설정함)
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
      </Modal>
    </div>
  )
}
