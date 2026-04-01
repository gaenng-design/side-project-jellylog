import { useEffect, useRef } from 'react'
import { useAppStore, YEAR_PICKER_MIN } from '@/store/useAppStore'
import { INPUT_BORDER_RADIUS, PRIMARY, PRIMARY_LIGHT } from '@/styles/formControls'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'

interface MonthPickerProps {
  onBeforeChange?: (ym: string) => boolean | void
  /** true면 연도 드롭다운을 렌더하지 않음(부모가 제목 옆 등에 배치) */
  omitYearDropdown?: boolean
}

export function MonthPicker({ onBeforeChange, omitYearDropdown = false }: MonthPickerProps) {
  const narrow = useNarrowLayout()
  const activeMonthBtnRef = useRef<HTMLButtonElement>(null)
  const { currentYearMonth, setYearMonth } = useAppStore()
  const [year, month] = currentYearMonth.split('-').map(Number)

  const trySetYearMonth = (ym: string) => {
    if (onBeforeChange && onBeforeChange(ym) === false) return
    setYearMonth(ym)
  }

  const setYear = (y: number) => trySetYearMonth(`${y}-${String(month).padStart(2, '0')}`)
  const setMonth = (m: number) => trySetYearMonth(`${year}-${String(m).padStart(2, '0')}`)

  useEffect(() => {
    if (year >= YEAR_PICKER_MIN) return
    const ym = `${YEAR_PICKER_MIN}-${String(month).padStart(2, '0')}`
    if (onBeforeChange && onBeforeChange(ym) === false) return
    setYearMonth(ym)
  }, [year, month, onBeforeChange, setYearMonth])

  useEffect(() => {
    if (!narrow || !activeMonthBtnRef.current) return
    activeMonthBtnRef.current.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' })
  }, [month, year, narrow])

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: narrow ? 'column' : 'row',
        alignItems: narrow ? 'stretch' : 'center',
        justifyContent: 'flex-start',
        gap: 10,
        width: '100%',
        minWidth: 0,
        boxSizing: 'border-box',
      }}
    >
      {!omitYearDropdown && <YearSelectDropdown variant="dark" value={year} onChange={setYear} />}
      {/* 모바일: 바깥 트랙은 부모 너비에 고정, 안쪽만 가로 스크롤 */}
      <div
        style={{
          width: narrow ? '100%' : 'fit-content',
          flex: narrow ? undefined : '0 1 auto',
          minWidth: narrow ? 0 : undefined,
          maxWidth: '100%',
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
              gap: narrow ? 4 : 4,
              padding: '6px 8px',
              width: 'max-content',
              maxWidth: '100%',
              boxSizing: 'border-box',
            }}
          >
            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
              const active = m === month
              return (
                <button
                  key={m}
                  ref={active ? activeMonthBtnRef : undefined}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  title={`${m}월`}
                  onClick={() => setMonth(m)}
                  style={{
                    flex: '0 0 auto',
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: narrow ? '8px 12px' : '8px 10px',
                    borderRadius: 10,
                    border: active ? `1px solid rgba(79, 140, 255, 0.45)` : '1px solid transparent',
                    background: active ? PRIMARY_LIGHT : 'transparent',
                    color: active ? PRIMARY : '#9ca3af',
                    cursor: 'pointer',
                    transition: 'background 0.15s ease, color 0.15s ease, border-color 0.15s ease',
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
  )
}
