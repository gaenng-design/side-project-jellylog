import { useEffect, useRef, useState } from 'react'
import { useAppStore, getYearPickerYearOptions } from '@/store/useAppStore'
import { PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT } from '@/styles/formControls'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'

type YearSelectDropdownProps = {
  value: number
  onChange: (year: number) => void
  /** dark: 월 선택기(젤리 알약), light: 모달·폼용 글래스 스타일 */
  variant?: 'dark' | 'light'
}

export function YearSelectDropdown({ value, onChange, variant = 'light' }: YearSelectDropdownProps) {
  const yearPickerMaxYear = useAppStore((s) => s.yearPickerMaxYear)
  const extendYearPickerMax = useAppStore((s) => s.extendYearPickerMax)
  const years = getYearPickerYearOptions(yearPickerMaxYear, value)
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
          background:
            'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(224, 242, 254, 0.88) 40%, rgba(186, 230, 253, 0.65) 100%)',
          color: JELLY.text,
          border: JELLY.innerBorder,
          borderRadius: JELLY.radiusFull,
          padding: '8px 20px',
          fontSize: 13,
          fontWeight: 700,
          cursor: 'pointer',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center' as const,
          gap: 8,
          minWidth: 120,
          backdropFilter: JELLY.blur,
          WebkitBackdropFilter: JELLY.blur,
          boxShadow: '0 6px 22px rgba(14, 165, 233, 0.18), inset 0 1px 0 rgba(255,255,255,0.85)',
        }
      : {
          padding: '8px 18px',
          borderRadius: JELLY.radiusFull,
          border: JELLY.innerBorder,
          fontSize: 13,
          background: JELLY.surface,
          backdropFilter: JELLY.blur,
          WebkitBackdropFilter: JELLY.blur,
          color: JELLY.text,
          cursor: 'pointer',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center' as const,
          gap: 8,
          minWidth: 120,
          boxShadow: JELLY.shadowFloat,
        }

  const caretColor = variant === 'dark' ? JELLY.textMuted : JELLY.textMuted

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
            marginTop: 8,
            minWidth: Math.max(120, wrapRef.current?.offsetWidth ?? 0),
            boxSizing: 'border-box',
            ...jellyCardStyle,
            borderRadius: JELLY.radiusMd,
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            background: 'rgba(255, 255, 255, 0.42)',
          }}
        >
          <div style={{ maxHeight: 240, overflowY: 'auto', padding: 6 }}>
            {years.map((y) => {
              const active = y === value
              return (
                <button
                  key={y}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => {
                    onChange(y)
                    setOpen(false)
                  }}
                  style={{
                    width: '100%',
                    textAlign: 'left',
                    padding: '10px 14px',
                    border: 'none',
                    background: active ? PRIMARY_LIGHT : 'transparent',
                    color: active ? PRIMARY_DARK : JELLY.text,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    borderRadius: JELLY.radiusMd,
                  }}
                >
                  {y}년
                </button>
              )
            })}
          </div>
          <div
            style={{
              borderTop: JELLY.innerBorderSoft,
              padding: 10,
              background: 'rgba(255,255,255,0.25)',
              backdropFilter: JELLY.blur,
              WebkitBackdropFilter: JELLY.blur,
            }}
          >
            <button
              type="button"
              onClick={() => extendYearPickerMax()}
              style={{
                width: '100%',
                fontSize: 12,
                padding: '10px 14px',
                borderRadius: JELLY.radiusFull,
                border: `1px solid ${variant === 'dark' ? 'rgba(2, 132, 199, 0.45)' : 'rgba(14, 165, 233, 0.4)'}`,
                background: 'rgba(255,255,255,0.4)',
                backdropFilter: JELLY.blur,
                WebkitBackdropFilter: JELLY.blur,
                color: variant === 'dark' ? PRIMARY_DARK : PRIMARY,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                boxShadow: '0 4px 14px rgba(14, 165, 233, 0.12)',
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
