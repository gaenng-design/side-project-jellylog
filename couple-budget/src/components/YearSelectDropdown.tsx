import { useEffect, useMemo, useRef, useState } from 'react'
import { useAppStore, YEAR_PICKER_MIN, getYearPickerYearOptions } from '@/store/useAppStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT } from '@/styles/formControls'

function yearHasPlanData(
  year: number,
  startedMonths: string[],
  settledMonths: string[],
  lastSavedKeys: string[],
  extraMonthKeys: string[],
  snapMonthKeys: string[],
): boolean {
  const prefix = `${year}-`
  const anyPrefix = (keys: string[]) => keys.some((k) => k.startsWith(prefix))
  return (
    anyPrefix(startedMonths) ||
    anyPrefix(settledMonths) ||
    anyPrefix(lastSavedKeys) ||
    anyPrefix(extraMonthKeys) ||
    anyPrefix(snapMonthKeys)
  )
}

type YearSelectDropdownProps = {
  value: number
  onChange: (year: number) => void
  /** dark: 월 선택기(파란 알약), light: 모달·폼용 테두리 스타일 */
  variant?: 'dark' | 'light'
}

export function YearSelectDropdown({ value, onChange, variant = 'light' }: YearSelectDropdownProps) {
  const yearPickerMaxYear = useAppStore((s) => s.yearPickerMaxYear)
  const extendYearPickerMax = useAppStore((s) => s.extendYearPickerMax)
  const removeExtendedYearFromPicker = useAppStore((s) => s.removeExtendedYearFromPicker)
  const startedMonths = useAppStore((s) => s.startedMonths)
  const settledMonths = useAppStore((s) => s.settledMonths)
  const lastSavedByMonth = useAppStore((s) => s.lastSavedByMonth)
  const extraRowsByMonth = usePlanExtraStore((s) => s.extraRowsByMonth)
  const templateSnapshotsByMonth = usePlanExtraStore((s) => s.templateSnapshotsByMonth)

  const years = getYearPickerYearOptions(yearPickerMaxYear, value)
  const calendarY = new Date().getFullYear()
  const removableYearFloor = Math.max(YEAR_PICKER_MIN, calendarY)
  const topYear = years.length > 0 ? years[years.length - 1] : null

  const extraKeys = useMemo(() => Object.keys(extraRowsByMonth), [extraRowsByMonth])
  const snapKeys = useMemo(() => Object.keys(templateSnapshotsByMonth), [templateSnapshotsByMonth])
  const savedKeys = useMemo(() => Object.keys(lastSavedByMonth), [lastSavedByMonth])
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    const onDocMouseDown = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocMouseDown)
    return () => document.removeEventListener('mousedown', onDocMouseDown)
  }, [open])

  const triggerStyle =
    variant === 'dark'
      ? {
          appearance: 'none' as const,
          background: PRIMARY_DARK,
          color: '#fff',
          border: 'none',
          borderRadius: 999,
          padding: '6px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center' as const,
          gap: 8,
          minWidth: 120,
        }
      : {
          padding: '6px 16px',
          borderRadius: 8,
          border: '1px solid #e5e7eb',
          fontSize: 13,
          background: '#fff',
          color: '#111827',
          cursor: 'pointer',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center' as const,
          gap: 8,
          minWidth: 120,
        }

  const caretColor = variant === 'dark' ? '#fff' : '#6b7280'

  return (
    <div ref={wrapRef} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button type="button" onClick={() => setOpen((o) => !o)} style={triggerStyle} aria-expanded={open} aria-haspopup="listbox">
        <span>{value}년</span>
        <span style={{ fontSize: 10, color: caretColor, pointerEvents: 'none' }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginTop: 6,
            minWidth: Math.max(120, wrapRef.current?.offsetWidth ?? 0),
            boxSizing: 'border-box',
            background: '#fff',
            borderRadius: 12,
            boxShadow: '0px 4px 24px rgba(15, 23, 42, 0.12)',
            border: '1px solid #e5e7eb',
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: 4 }}>
            {years.map((y) => {
              const active = y === value
              const hasData = yearHasPlanData(y, startedMonths, settledMonths, savedKeys, extraKeys, snapKeys)
              const showRemove =
                topYear != null &&
                y === topYear &&
                y > removableYearFloor &&
                !hasData
              return (
                <div
                  key={y}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    borderRadius: 8,
                    background: active ? PRIMARY_LIGHT : 'transparent',
                  }}
                >
                  <button
                    type="button"
                    role="option"
                    aria-selected={active}
                    onClick={() => {
                      onChange(y)
                      setOpen(false)
                    }}
                    style={{
                      flex: 1,
                      minWidth: 0,
                      textAlign: 'left',
                      padding: '8px 12px',
                      border: 'none',
                      background: 'transparent',
                      color: active ? PRIMARY : '#111827',
                      fontSize: 13,
                      fontWeight: active ? 700 : 500,
                      cursor: 'pointer',
                      borderRadius: 8,
                    }}
                  >
                    {y}년
                  </button>
                  {showRemove && (
                    <button
                      type="button"
                      title={`${y}년 드롭다운에서 제거`}
                      aria-label={`${y}년 제거`}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        removeExtendedYearFromPicker(y)
                      }}
                      style={{
                        flexShrink: 0,
                        width: 28,
                        height: 28,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginRight: 4,
                        border: 'none',
                        borderRadius: 6,
                        background: 'transparent',
                        color: '#9ca3af',
                        fontSize: 14,
                        lineHeight: 1,
                        cursor: 'pointer',
                      }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              )
            })}
          </div>
          <div style={{ borderTop: '1px solid #e5e7eb', padding: 8, background: '#fafafa' }}>
            <button
              type="button"
              onClick={() => extendYearPickerMax()}
              style={{
                width: '100%',
                fontSize: 12,
                padding: '8px 10px',
                borderRadius: 8,
                border: `1px solid ${variant === 'dark' ? PRIMARY_DARK : PRIMARY}`,
                background: '#fff',
                color: variant === 'dark' ? PRIMARY_DARK : PRIMARY,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textAlign: 'center',
              }}
            >
              신년 추가하기
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
