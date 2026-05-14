import { useMemo, useRef, useState } from 'react'
import { useSharedExpenseStore } from '@/store/useSharedExpenseStore'
import { useAppStore } from '@/store/useAppStore'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { CustomSelect } from '@/components/CustomSelect'
import { Modal } from '@/components/Modal'
import { JELLY, jellyCardStyle, jellyPrimaryButton, jellyInputSurface } from '@/styles/jellyGlass'
import { pageTitleH1Style, PRIMARY, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE, PRIMARY_LIGHT } from '@/styles/formControls'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { downloadSharedExpenseCSV } from '@/lib/sharedExpenseExport'
import { resolveCategoryColor } from '@/lib/categoryColors'
import { getCycleRange, getCycleKeyForDate, getEntryDisplayDate } from '@/lib/sharedExpenseCycle'
import { CategoryManagerModal } from './CategoryManagerModal'
import type { SharedExpenseEntry } from '@/types'

const fmtSum = (n: number) => n.toLocaleString('ko-KR') + '원'
const DAY_OF_WEEK = ['일', '월', '화', '수', '목', '금', '토']

/** 거래 한 행 (날짜순/카테고리순 공통) */
function EntryRow({
  entry,
  item,
  showCategoryChip,
  showTopBorder,
  borderStrong,
  formatDay,
  onEdit,
  onDelete,
}: {
  entry: import('@/types').SharedExpenseEntry
  item: import('@/types').SharedExpenseItem | undefined
  showCategoryChip: boolean
  showTopBorder: boolean
  /** 진한 디바이더 (날짜가 바뀌는 경계) */
  borderStrong?: boolean
  formatDay: (e: import('@/types').SharedExpenseEntry) => string
  onEdit: (e: import('@/types').SharedExpenseEntry) => void
  onDelete: (id: string) => void
}) {
  const colorMap = useSharedExpenseStore((s) => s.categoryColors)
  const cat = item?.category ?? '미분류'
  const { bg, fg } = resolveCategoryColor(cat, colorMap)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        padding: '12px 16px',
        borderTop: showTopBorder
          ? borderStrong
            ? '1px solid #d1d5db'
            : '1px solid #f3f4f6'
          : 'none',
      }}
    >
      {/* 날짜 */}
      <div
        style={{
          flex: '0 0 auto',
          width: 70,
          fontSize: 12,
          fontWeight: 500,
          color: entry.day == null ? '#9ca3af' : JELLY.text,
          textAlign: 'center',
        }}
      >
        {formatDay(entry)}
      </div>

      {/* 카테고리 칩 (그룹 모드에서는 숨김) */}
      {showCategoryChip && (
        <div
          style={{
            flex: '0 0 auto',
            fontSize: 11,
            fontWeight: 600,
            color: fg,
            background: bg,
            padding: '3px 10px',
            borderRadius: 999,
            whiteSpace: 'nowrap',
          }}
        >
          {cat}
        </div>
      )}

      {/* 이름 + 메모 */}
      <div
        style={{ flex: 1, minWidth: 0, cursor: 'pointer' }}
        onClick={() => onEdit(entry)}
        title="클릭하여 수정"
      >
        <div
          style={{
            fontSize: 14,
            fontWeight: 500,
            color: JELLY.text,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {item?.name ?? '(이름 없음)'}
        </div>
        {entry.memo && (
          <div
            style={{
              fontSize: 11,
              color: '#9ca3af',
              marginTop: 2,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {entry.memo}
          </div>
        )}
      </div>

      {/* 금액 */}
      <div
        onClick={() => onEdit(entry)}
        style={{
          flex: '0 0 auto',
          fontSize: 14,
          fontWeight: 700,
          color: JELLY.text,
          cursor: 'pointer',
          whiteSpace: 'nowrap',
        }}
      >
        {entry.amount.toLocaleString('ko-KR')}원
      </div>

      {/* 삭제 */}
      <button
        type="button"
        onClick={() => {
          if (window.confirm('이 결제 내역을 삭제할까요?')) onDelete(entry.id)
        }}
        style={{
          flex: '0 0 auto',
          width: 28,
          height: 28,
          border: '1px solid #e5e7eb',
          background: '#fff',
          borderRadius: 6,
          cursor: 'pointer',
          color: '#ef4444',
          fontSize: 12,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        title="삭제"
      >
        🗑
      </button>
    </div>
  )
}

type SortOption = '날짜' | '카테고리'

/** 항목 추가 폼 */
function AddEntryForm({
  yearMonth,
  monthLabel,
  categories,
  recentItems,
  onAdd,
  disabled,
}: {
  yearMonth: string
  monthLabel: string
  categories: string[]
  recentItems: { name: string; category: string }[]
  onAdd: (params: { name: string; category: string; day?: number; amount: number; memo?: string }) => void
  disabled?: boolean
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(categories[0] ?? '기타')
  const [day, setDay] = useState('')
  const [amount, setAmount] = useState('')
  const [memo, setMemo] = useState('')
  const submittingRef = useRef(false)

  const handleAdd = () => {
    // 중복 호출 방지 (StrictMode/연속 클릭/Enter 동시 입력 등)
    if (submittingRef.current) return
    const t = name.trim()
    const amt = amount ? parseInt(amount.replace(/,/g, ''), 10) || 0 : 0
    if (!t || amt <= 0) return

    submittingRef.current = true

    let dayNum: number | undefined
    if (day.trim()) {
      const d = parseInt(day, 10)
      if (!isNaN(d) && d >= 1 && d <= 31) dayNum = d
    }

    onAdd({
      name: t,
      category,
      day: dayNum,
      amount: amt,
      memo: memo.trim() || undefined,
    })

    setName('')
    setDay('')
    setAmount('')
    setMemo('')
    setCategory(categories[0] ?? '기타')

    // 빠른 시간 안에 다시 호출되지 않도록
    setTimeout(() => {
      submittingRef.current = false
    }, 150)
  }

  return (
    <div style={{ ...jellyCardStyle, padding: 16, marginTop: 16, opacity: disabled ? 0.5 : 1 }}>
      <div style={{ fontSize: 13, fontWeight: 600, color: JELLY.text, marginBottom: 10 }}>
        + {monthLabel}에 결제 추가
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ minWidth: 110, flexShrink: 0 }}>
          <CustomSelect
            options={categories}
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
          placeholder="항목명 (예: 외식비)"
          autoComplete="off"
          onKeyDown={(e) => e.key === 'Enter' && !disabled && handleAdd()}
          disabled={disabled}
          style={{
            flex: 1,
            minWidth: 120,
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

        <input
          value={day ? `${day}일` : ''}
          onChange={(e) => setDay(e.target.value.replace(/[^\d]/g, '').slice(0, 2))}
          placeholder="일"
          inputMode="numeric"
          onKeyDown={(e) => {
            // '일' 텍스트는 보호 - backspace/delete 시 마지막 숫자만 삭제
            if (e.key === 'Backspace' || e.key === 'Delete') {
              e.preventDefault()
              const target = e.currentTarget
              const selStart = target.selectionStart ?? 0
              const selEnd = target.selectionEnd ?? 0
              if (selStart !== selEnd) {
                // 선택 영역이 있으면 전체 클리어
                setDay('')
              } else {
                setDay(day.slice(0, -1))
              }
              return
            }
            if (e.key === 'Enter' && !disabled) handleAdd()
          }}
          disabled={disabled}
          style={{
            width: 70,
            height: 40,
            padding: '0 12px',
            borderRadius: INPUT_BORDER_RADIUS,
            fontSize: INPUT_FONT_SIZE,
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            textAlign: 'left',
            ...jellyInputSurface,
            color: '#232d3c',
          }}
          title={`${yearMonth} 결제일 (1-31, 선택)`}
        />

        <input
          value={amount}
          onChange={(e) => {
            const onlyNum = e.target.value.replace(/[^\d]/g, '')
            setAmount(onlyNum ? parseInt(onlyNum, 10).toLocaleString('ko-KR') : '')
          }}
          placeholder="금액"
          inputMode="numeric"
          onKeyDown={(e) => e.key === 'Enter' && !disabled && handleAdd()}
          disabled={disabled}
          style={{
            width: 130,
            height: 40,
            padding: '0 12px',
            borderRadius: INPUT_BORDER_RADIUS,
            fontSize: INPUT_FONT_SIZE,
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            textAlign: 'right',
            ...jellyInputSurface,
            color: '#232d3c',
          }}
        />

        <button
          type="button"
          onClick={handleAdd}
          disabled={disabled || !name.trim() || !amount}
          style={{
            ...jellyPrimaryButton,
            fontSize: 13,
            padding: '0 16px',
            height: 40,
            flexShrink: 0,
            opacity: !disabled && name.trim() && amount ? 1 : 0.45,
            cursor: !disabled && name.trim() && amount ? 'pointer' : 'default',
          }}
        >
          추가
        </button>
      </div>

      <input
        value={memo}
        onChange={(e) => setMemo(e.target.value)}
        placeholder="메모 (선택)"
        onKeyDown={(e) => e.key === 'Enter' && !disabled && handleAdd()}
        disabled={disabled}
        style={{
          width: '100%',
          height: 36,
          padding: '0 12px',
          borderRadius: INPUT_BORDER_RADIUS,
          fontSize: 12,
          fontFamily: 'inherit',
          outline: 'none',
          boxSizing: 'border-box',
          ...jellyInputSurface,
          color: '#232d3c',
        }}
      />
    </div>
  )
}

export function SharedExpensePage() {
  const narrow = useNarrowLayout()
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const setYearMonth = useAppStore((s) => s.setYearMonth)
  const sharedLivingCostTarget = useAppStore((s) => s.settings.sharedLivingCost ?? 0)
  const cycleStartDay = useAppStore((s) => s.settings.sharedExpenseCycleStartDay ?? 1)
  const [yearStr, monthStr] = currentYearMonth.split('-')
  const year = parseInt(yearStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1
  const cycleRange = useMemo(
    () => getCycleRange(currentYearMonth, cycleStartDay),
    [currentYearMonth, cycleStartDay],
  )
  const monthLabel =
    cycleStartDay > 1
      ? `${year}년 ${monthIdx + 1}월 (${cycleRange.startLabel} ~ ${cycleRange.endLabel})`
      : `${year}년 ${monthIdx + 1}월`

  // 미래 사이클 (오늘 기준 사이클 종료일이 미래) → 입력 불가
  const today = new Date()
  const isFutureMonth = cycleRange.startDate > today

  const items = useSharedExpenseStore((s) => s.items)
  const entries = useSharedExpenseStore((s) => s.entries)
  const categories = useSharedExpenseStore((s) => s.categories)
  const categoryColorMap = useSharedExpenseStore((s) => s.categoryColors)
  const findOrCreateItem = useSharedExpenseStore((s) => s.findOrCreateItem)
  const addEntry = useSharedExpenseStore((s) => s.addEntry)
  const updateEntry = useSharedExpenseStore((s) => s.updateEntry)
  const removeEntry = useSharedExpenseStore((s) => s.removeEntry)

  // 필터 / 정렬
  const [filterCategory, setFilterCategory] = useState<string>('전체')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOption, setSortOption] = useState<SortOption>('날짜')
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  // 거래 편집 모달
  const [editingEntry, setEditingEntry] = useState<SharedExpenseEntry | null>(null)
  const [editForm, setEditForm] = useState({
    name: '',
    category: '',
    day: '',
    amount: '',
    memo: '',
  })

  const itemMap = useMemo(() => new Map(items.map((it) => [it.id, it])), [items])

  // 현재 사이클의 entries (cycleStartDay 적용)
  const monthEntries = useMemo(() => {
    if (cycleStartDay <= 1) {
      return entries.filter((e) => e.yearMonth === currentYearMonth)
    }
    // 사이클 기반: entry.yearMonth + entry.day가 현재 사이클에 속하는지 판별
    return entries.filter((e) => {
      if (e.day == null) return e.yearMonth === currentYearMonth
      const [yStr, mStr] = e.yearMonth.split('-')
      const ey = parseInt(yStr, 10)
      const em = parseInt(mStr, 10) - 1
      const cycleKey = getCycleKeyForDate(ey, em, e.day, cycleStartDay)
      return cycleKey === currentYearMonth
    })
  }, [entries, currentYearMonth, cycleStartDay])

  // 필터/정렬 적용
  const filteredEntries = useMemo(() => {
    const query = searchQuery.trim().toLowerCase()
    const list = monthEntries.filter((e) => {
      const item = itemMap.get(e.itemId)
      if (filterCategory !== '전체' && item?.category !== filterCategory) return false
      if (query) {
        const name = item?.name.toLowerCase() ?? ''
        const memo = e.memo?.toLowerCase() ?? ''
        if (!name.includes(query) && !memo.includes(query)) return false
      }
      return true
    })

    const sorted = [...list]
    sorted.sort((a, b) => {
      const itemA = itemMap.get(a.itemId)
      const itemB = itemMap.get(b.itemId)
      if (sortOption === '카테고리') {
        // 카테고리 순(목록 순서대로) → 같으면 날짜 빠른 순
        const catA = categories.indexOf(itemA?.category ?? '')
        const catB = categories.indexOf(itemB?.category ?? '')
        if (catA !== catB) return catA - catB
        return (a.day ?? 99) - (b.day ?? 99)
      }
      // '날짜' (기본): 빠른 → 늦은 (1일 → 2일 ...)
      return (a.day ?? 99) - (b.day ?? 99)
    })
    return sorted
  }, [monthEntries, itemMap, filterCategory, searchQuery, sortOption, categories])

  // 합계 (현재 월 전체, 필터와 무관)
  const monthTotal = monthEntries.reduce((sum, e) => sum + e.amount, 0)
  const filteredTotal = filteredEntries.reduce((sum, e) => sum + e.amount, 0)

  // 카테고리 옵션 (필터용)
  const filterCategoryOptions = useMemo(() => {
    const usedCategories = Array.from(
      new Set(monthEntries.map((e) => itemMap.get(e.itemId)?.category).filter(Boolean) as string[]),
    )
    return ['전체', ...categories.filter((c) => usedCategories.includes(c))]
  }, [monthEntries, itemMap, categories])

  // 자동완성용 최근 항목 (현재 월 + 동일 연도)
  const recentItems = useMemo(() => {
    const seen = new Set<string>()
    const result: { name: string; category: string }[] = []
    for (const it of [...items].reverse()) {
      const key = `${it.category}::${it.name}`
      if (seen.has(key)) continue
      seen.add(key)
      result.push({ name: it.name, category: it.category })
      if (result.length > 50) break
    }
    return result
  }, [items])

  // entry 정보 헬퍼 (사이클 적용: 실제 날짜로 표시)
  const formatDay = (e: SharedExpenseEntry): string => {
    if (e.day == null) return '-'
    const display = getEntryDisplayDate(e.yearMonth, e.day, cycleStartDay)
    const date = new Date(display.year, display.monthIdx, display.day)
    const dow = DAY_OF_WEEK[date.getDay()]
    return `${display.monthIdx + 1}/${display.day} (${dow})`
  }

  const handleEditOpen = (e: SharedExpenseEntry) => {
    const item = itemMap.get(e.itemId)
    setEditingEntry(e)
    setEditForm({
      name: item?.name ?? '',
      category: item?.category ?? categories[0] ?? '기타',
      day: e.day != null ? String(e.day) : '',
      amount: e.amount > 0 ? e.amount.toLocaleString('ko-KR') : '',
      memo: e.memo ?? '',
    })
  }

  const handleEditSave = () => {
    if (!editingEntry) return
    const newName = editForm.name.trim()
    const newAmount = parseInt(editForm.amount.replace(/,/g, ''), 10) || 0
    if (!newName || newAmount <= 0) return

    let dayNum: number | undefined
    if (editForm.day.trim()) {
      const d = parseInt(editForm.day, 10)
      if (!isNaN(d) && d >= 1 && d <= 31) dayNum = d
    }

    // 카테고리/이름 변경 시 새 itemId로 매핑
    const newItemId = findOrCreateItem(newName, editForm.category)

    updateEntry(editingEntry.id, {
      itemId: newItemId,
      day: dayNum,
      amount: newAmount,
      memo: editForm.memo.trim() || undefined,
    })
    setEditingEntry(null)
  }

  const handleEditDelete = () => {
    if (!editingEntry) return
    if (!window.confirm('이 결제 내역을 삭제할까요?')) return
    removeEntry(editingEntry.id)
    setEditingEntry(null)
  }

  return (
    <div style={{ paddingBottom: 40 }}>
      {/* 제목줄: 제목 + CSV 내보내기 + 카테고리 관리 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
          marginBottom: 16,
          flexWrap: 'wrap',
        }}
      >
        <h1 style={{ ...pageTitleH1Style, margin: 0 }}>공동 생활비</h1>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setCategoryModalOpen(true)}
            style={archiveBtnStyle}
            title="카테고리 추가/삭제/순서 변경"
          >
            ⚙️ 카테고리 관리
          </button>
          <button
            type="button"
            onClick={() => downloadSharedExpenseCSV(year)}
            style={archiveBtnStyle}
            title={`${year}년 데이터 전체를 CSV로 내보내기 (~/Downloads)`}
          >
            📊 CSV 내보내기
          </button>
        </div>
      </div>

      {/* 연도 + 월 탭 한 줄 */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          marginBottom: 16,
          flexWrap: 'nowrap',
          overflow: 'hidden',
        }}
      >
        <YearSelectDropdown
          value={year}
          onChange={(y) => setYearMonth(`${y}-${String(monthIdx + 1).padStart(2, '0')}`)}
          variant="light"
        />
        <div
          style={{
            flex: 1,
            minWidth: 0,
            minHeight: 40,
            borderRadius: INPUT_BORDER_RADIUS,
            background: '#fff',
            border: '1px solid #e5e7eb',
            boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
            boxSizing: 'border-box',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
          }}
        >
          <div
            className={narrow ? 'hide-horizontal-scrollbar' : undefined}
            style={{
              flex: 1,
              minWidth: 0,
              overflowX: 'auto',
              overflowY: 'hidden',
              WebkitOverflowScrolling: 'touch',
              overscrollBehaviorX: 'contain',
              scrollbarWidth: narrow ? undefined : 'thin',
            }}
          >
            <div
              role="tablist"
              aria-label="월 선택"
              style={{
                display: 'flex',
                flexWrap: 'nowrap',
                alignItems: 'center',
                gap: 4,
                padding: '6px 8px',
                width: 'max-content',
                boxSizing: 'border-box',
              }}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const active = m === monthIdx + 1
                return (
                  <button
                    key={m}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setYearMonth(`${year}-${String(m).padStart(2, '0')}`)}
                    style={{
                      flex: '0 0 auto',
                      display: 'inline-flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      padding: narrow ? '8px 12px' : '8px 10px',
                      borderRadius: 10,
                      border: active ? '1px solid rgba(79, 140, 255, 0.45)' : '1px solid transparent',
                      background: active ? PRIMARY_LIGHT : 'transparent',
                      color: active ? PRIMARY : '#9ca3af',
                      cursor: 'pointer',
                      fontFamily: 'inherit',
                      whiteSpace: 'nowrap',
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      lineHeight: 1,
                    }}
                  >
                    {m}월
                  </button>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      {/* 합계 카드: 사용액 / 목표(공동 생활비 설정) */}
      {(() => {
        const overBudget = sharedLivingCostTarget > 0 && monthTotal > sharedLivingCostTarget
        const usedColor = overBudget ? '#ef4444' : PRIMARY
        const ratio = sharedLivingCostTarget > 0 ? Math.min(monthTotal / sharedLivingCostTarget, 1) : 0
        return (
          <div
            style={{
              ...jellyCardStyle,
              padding: '14px 18px',
              marginBottom: 16,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                  {monthLabel} 사용액 / 목표
                </div>
                <div
                  style={{
                    fontSize: 26,
                    fontWeight: 700,
                    display: 'flex',
                    alignItems: 'baseline',
                    gap: 6,
                    flexWrap: 'wrap',
                  }}
                >
                  <span style={{ color: usedColor }}>{fmtSum(monthTotal)}</span>
                  <span style={{ fontSize: 16, fontWeight: 500, color: '#9ca3af' }}>/</span>
                  <span style={{ fontSize: 18, fontWeight: 600, color: '#6b7280' }}>
                    {sharedLivingCostTarget > 0 ? fmtSum(sharedLivingCostTarget) : '미설정'}
                  </span>
                </div>
                {overBudget && (
                  <div style={{ fontSize: 12, color: '#ef4444', fontWeight: 600, marginTop: 4 }}>
                    ⚠️ 목표를 {fmtSum(monthTotal - sharedLivingCostTarget)} 초과했습니다
                  </div>
                )}
                {sharedLivingCostTarget === 0 && (
                  <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
                    설정 페이지에서 월 공동 생활비를 설정하면 목표 대비 사용량을 볼 수 있습니다
                  </div>
                )}
              </div>
              {isFutureMonth && (
                <div style={{ fontSize: 12, color: '#9ca3af' }}>미래 월은 입력할 수 없습니다</div>
              )}
            </div>

            {/* 진행률 바 */}
            {sharedLivingCostTarget > 0 && (
              <div
                style={{
                  width: '100%',
                  height: 6,
                  background: '#f3f4f6',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${ratio * 100}%`,
                    height: '100%',
                    background: usedColor,
                    transition: 'width 0.3s ease, background 0.3s ease',
                    borderRadius: 999,
                  }}
                />
              </div>
            )}
          </div>
        )
      })()}

      {/* 필터 영역 */}
      <div
        style={{
          ...jellyCardStyle,
          padding: '10px 14px',
          marginBottom: 12,
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          flexWrap: 'wrap',
        }}
      >
        <input
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="🔍 항목명 또는 메모 검색"
          style={{
            flex: 1,
            minWidth: 140,
            height: 36,
            padding: '0 12px',
            borderRadius: 8,
            fontSize: 13,
            fontFamily: 'inherit',
            outline: 'none',
            boxSizing: 'border-box',
            border: '1px solid #e5e7eb',
            background: '#fff',
            color: '#232d3c',
          }}
        />
        <div style={{ minWidth: 120 }}>
          <CustomSelect
            options={filterCategoryOptions}
            value={filterCategory}
            onChange={setFilterCategory}
            compact
            compactFill
            compactHeight={36}
          />
        </div>

        {/* 필터 합계 (카테고리 드롭다운 바로 옆) */}
        {(filterCategory !== '전체' || searchQuery.trim()) && (
          <div style={{ fontSize: 12, color: '#6b7280', whiteSpace: 'nowrap' }}>
            필터 합계: <strong style={{ color: PRIMARY }}>{fmtSum(filteredTotal)}</strong>{' '}
            <span style={{ color: '#9ca3af' }}>({filteredEntries.length}건)</span>
          </div>
        )}

        {/* 정렬 토글 (항상 우측 끝 고정) */}
        <div
          role="tablist"
          aria-label="정렬"
          style={{
            display: 'inline-flex',
            height: 36,
            padding: 3,
            borderRadius: 10,
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            gap: 2,
            marginLeft: 'auto',
            flexShrink: 0,
          }}
        >
          {(['날짜', '카테고리'] as SortOption[]).map((opt) => {
            const active = sortOption === opt
            return (
              <button
                key={opt}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => setSortOption(opt)}
                style={{
                  padding: '0 14px',
                  height: '100%',
                  borderRadius: 8,
                  border: 'none',
                  background: active ? '#fff' : 'transparent',
                  color: active ? PRIMARY : '#6b7280',
                  fontSize: 12,
                  fontWeight: active ? 700 : 500,
                  cursor: 'pointer',
                  fontFamily: 'inherit',
                  boxShadow: active ? '0 1px 2px rgba(0,0,0,0.06)' : 'none',
                  transition: 'all 0.15s ease',
                }}
              >
                {opt}
              </button>
            )
          })}
        </div>
      </div>

      {/* 거래 리스트 */}
      {monthEntries.length === 0 ? (
        <div
          style={{
            ...jellyCardStyle,
            padding: '40px 24px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 14,
            lineHeight: 1.6,
          }}
        >
          {monthLabel}에 등록된 결제 내역이 없습니다.
          <br />
          아래에서 결제를 추가해주세요.
        </div>
      ) : filteredEntries.length === 0 ? (
        <div
          style={{
            ...jellyCardStyle,
            padding: '32px 24px',
            textAlign: 'center',
            color: '#9ca3af',
            fontSize: 13,
          }}
        >
          필터 조건에 맞는 결제 내역이 없습니다.
        </div>
      ) : sortOption === '카테고리' ? (
        // 카테고리별 그룹 카드 (각 카테고리마다 별도 카드)
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {(() => {
            // 카테고리별 그룹핑
            const groups = new Map<string, SharedExpenseEntry[]>()
            for (const e of filteredEntries) {
              const cat = itemMap.get(e.itemId)?.category ?? '미분류'
              if (!groups.has(cat)) groups.set(cat, [])
              groups.get(cat)!.push(e)
            }
            // 카테고리 store 순서대로 정렬 (없는 카테고리는 뒤로)
            const ordered = Array.from(groups.entries()).sort(([a], [b]) => {
              const ia = categories.indexOf(a)
              const ib = categories.indexOf(b)
              if (ia === -1 && ib === -1) return a.localeCompare(b)
              if (ia === -1) return 1
              if (ib === -1) return -1
              return ia - ib
            })

            return ordered.map(([cat, list]) => {
              const subtotal = list.reduce((sum, e) => sum + e.amount, 0)
              const { bg, fg } = resolveCategoryColor(cat, categoryColorMap)
              return (
                <div
                  key={cat}
                  style={{
                    ...jellyCardStyle,
                    padding: 0,
                    overflow: 'hidden',
                  }}
                >
                  {/* 그룹 헤더 */}
                  <div
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: 10,
                      padding: '10px 16px',
                      background: bg,
                    }}
                  >
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        minWidth: 0,
                      }}
                    >
                      <span style={{ fontSize: 14, fontWeight: 700, color: fg }}>{cat}</span>
                      <span style={{ fontSize: 11, color: fg, opacity: 0.7 }}>{list.length}건</span>
                    </div>
                    <div style={{ fontSize: 14, fontWeight: 700, color: fg, whiteSpace: 'nowrap' }}>
                      {fmtSum(subtotal)}
                    </div>
                  </div>

                  {/* 그룹 내 항목들 */}
                  {list
                    .slice()
                    .sort((a, b) => (a.day ?? 99) - (b.day ?? 99))
                    .map((e, idx) => (
                      <EntryRow
                        key={e.id}
                        entry={e}
                        item={itemMap.get(e.itemId)}
                        showCategoryChip={false}
                        showTopBorder={idx > 0}
                        formatDay={formatDay}
                        onEdit={handleEditOpen}
                        onDelete={removeEntry}
                      />
                    ))}
                </div>
              )
            })
          })()}
        </div>
      ) : (
        // 날짜순: 같은 날짜끼리는 한 카드, 날짜가 바뀌면 새 카드 (8px 간격)
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {(() => {
            // 날짜별 그룹핑 (정렬은 이미 filteredEntries에서 빠른→늦은 순)
            const groups: { dayKey: string; list: SharedExpenseEntry[] }[] = []
            for (const e of filteredEntries) {
              const dayKey = e.day != null ? String(e.day) : '__none__'
              const last = groups[groups.length - 1]
              if (last && last.dayKey === dayKey) {
                last.list.push(e)
              } else {
                groups.push({ dayKey, list: [e] })
              }
            }

            return groups.map((g, gi) => (
              <div
                key={`${g.dayKey}-${gi}`}
                style={{ ...jellyCardStyle, padding: 0, overflow: 'hidden' }}
              >
                {g.list.map((e, idx) => (
                  <EntryRow
                    key={e.id}
                    entry={e}
                    item={itemMap.get(e.itemId)}
                    showCategoryChip
                    showTopBorder={idx > 0}
                    formatDay={formatDay}
                    onEdit={handleEditOpen}
                    onDelete={removeEntry}
                  />
                ))}
              </div>
            ))
          })()}
        </div>
      )}

      {/* 추가 폼 */}
      <AddEntryForm
        yearMonth={currentYearMonth}
        monthLabel={monthLabel}
        categories={categories.length > 0 ? categories : ['기타']}
        recentItems={recentItems}
        disabled={isFutureMonth}
        onAdd={({ name, category, day, amount, memo }) => {
          const itemId = findOrCreateItem(name, category)
          addEntry({ itemId, yearMonth: currentYearMonth, day, amount, memo })
        }}
      />

      {/* 거래 수정 모달 */}
      <Modal open={editingEntry !== null} title="결제 내역 수정" onClose={() => setEditingEntry(null)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리</div>
            <CustomSelect
              options={categories.length > 0 ? categories : ['기타']}
              value={editForm.category}
              onChange={(v) => setEditForm({ ...editForm, category: v })}
              compact
              compactFill
              compactHeight={40}
            />
          </div>

          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>항목명</div>
            <input
              value={editForm.name}
              onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
              placeholder="항목명"
              style={modalInputStyle}
            />
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <div style={{ flex: '0 0 100px' }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>결제일</div>
              <input
                value={editForm.day ? `${editForm.day}일` : ''}
                onChange={(e) =>
                  setEditForm({ ...editForm, day: e.target.value.replace(/[^\d]/g, '').slice(0, 2) })
                }
                onKeyDown={(e) => {
                  // '일' 텍스트 보호 - backspace/delete 시 마지막 숫자만 삭제
                  if (e.key === 'Backspace' || e.key === 'Delete') {
                    e.preventDefault()
                    const target = e.currentTarget
                    const selStart = target.selectionStart ?? 0
                    const selEnd = target.selectionEnd ?? 0
                    if (selStart !== selEnd) {
                      setEditForm({ ...editForm, day: '' })
                    } else {
                      setEditForm({ ...editForm, day: editForm.day.slice(0, -1) })
                    }
                  }
                }}
                placeholder="일 (선택)"
                inputMode="numeric"
                style={{ ...modalInputStyle, textAlign: 'left' }}
              />
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>금액</div>
              <input
                value={editForm.amount}
                onChange={(e) => {
                  const onlyNum = e.target.value.replace(/[^\d]/g, '')
                  setEditForm({
                    ...editForm,
                    amount: onlyNum ? parseInt(onlyNum, 10).toLocaleString('ko-KR') : '',
                  })
                }}
                placeholder="0"
                inputMode="numeric"
                style={{ ...modalInputStyle, textAlign: 'right' }}
              />
            </div>
          </div>

          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>메모 (선택)</div>
            <input
              value={editForm.memo}
              onChange={(e) => setEditForm({ ...editForm, memo: e.target.value })}
              placeholder="예: 주말 외식"
              style={modalInputStyle}
            />
          </div>
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
          <button
            onClick={handleEditDelete}
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
              onClick={() => setEditingEntry(null)}
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
              onClick={handleEditSave}
              style={{
                padding: '8px 16px',
                borderRadius: JELLY.radiusControl,
                border: 'none',
                fontSize: 13,
                fontWeight: 600,
                cursor: editForm.name.trim() && editForm.amount ? 'pointer' : 'not-allowed',
                background: editForm.name.trim() && editForm.amount ? PRIMARY : '#e5e7eb',
                color: editForm.name.trim() && editForm.amount ? '#fff' : '#9ca3af',
              }}
            >
              저장
            </button>
          </div>
        </div>
      </Modal>

      {/* 카테고리 관리 모달 */}
      <CategoryManagerModal open={categoryModalOpen} onClose={() => setCategoryModalOpen(false)} />
    </div>
  )
}

const archiveBtnStyle: React.CSSProperties = {
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #e5e7eb',
  background: '#fff',
  fontSize: 12,
  fontWeight: 500,
  color: '#374151',
  cursor: 'pointer',
  whiteSpace: 'nowrap',
  flexShrink: 0,
}

const modalInputStyle: React.CSSProperties = {
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
}
