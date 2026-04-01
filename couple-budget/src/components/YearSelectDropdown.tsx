import { useEffect, useRef, useState } from 'react'
import { useAppStore, getYearPickerYearOptions } from '@/store/useAppStore'
import { PRIMARY, PRIMARY_DARK, PRIMARY_LIGHT } from '@/styles/formControls'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'

type YearSelectDropdownProps = {
  value: number
  onChange: (year: number) => void
  /** dark: 월 선택기 상단 트리거, light: 모달·폼용 글래스 스타일 */
  variant?: 'dark' | 'light'
}

export function YearSelectDropdown({ value, onChange, variant = 'light' }: YearSelectDropdownProps) {
  const narrow = useNarrowLayout()
  const yearPickerMaxYear = useAppStore((s) => s.yearPickerMaxYear)
  const extendYearPickerMax = useAppStore((s) => s.extendYearPickerMax)
  const years = getYearPickerYearOptions(yearPickerMaxYear, value)
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)

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
          background: '#ffffff',
          color: JELLY.text,
          border: '1px solid rgba(15, 23, 42, 0.06)',
          borderRadius: 9999,
          padding: '8px 16px',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          outline: 'none',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center' as const,
          gap: 6,
          minWidth: 108,
          boxShadow: '0 2px 12px rgba(15, 23, 42, 0.07)',
          boxSizing: 'border-box' as const,
        }
      : {
          padding: '8px 18px',
          borderRadius: JELLY.radiusControl,
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

  const caretColor = JELLY.textMuted

  const panelStyle =
    variant === 'dark'
      ? {
          background: '#ffffff',
          border: '1px solid rgba(15, 23, 42, 0.06)',
          boxShadow: '0 8px 24px rgba(15, 23, 42, 0.1)',
        }
      : {
          ...jellyCardStyle,
          background: 'rgba(255, 255, 255, 0.42)',
        }

  const triggerW = triggerRef.current?.offsetWidth ?? (variant === 'dark' ? 108 : 120)

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: 'fit-content',
        maxWidth: '100%',
        alignSelf: 'flex-start',
      }}
    >
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={triggerStyle}
        aria-expanded={open}
        aria-haspopup="listbox"
      >
        <span>{value}년</span>
        <span style={{ fontSize: 10, color: caretColor, pointerEvents: 'none' }}>▾</span>
      </button>

      {open && (
        <div
          role="listbox"
          style={{
            position: 'absolute',
            top: '100%',
            marginTop: 8,
            boxSizing: 'border-box',
            borderRadius: JELLY.radiusControl,
            zIndex: 200,
            overflow: 'hidden',
            display: 'flex',
            flexDirection: 'column',
            ...(narrow
              ? {
                  left: 0,
                  transform: 'none',
                  width: 'max-content',
                  minWidth: Math.max(168, triggerW),
                  maxWidth: 'min(260px, calc(100vw - 24px))',
                }
              : {
                  left: '50%',
                  transform: 'translateX(-50%)',
                  minWidth: Math.max(120, triggerW),
                }),
            ...panelStyle,
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
                    borderRadius: JELLY.radiusControl,
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
              background: variant === 'dark' ? '#f9fafb' : 'rgba(255,255,255,0.25)',
              backdropFilter: variant === 'dark' ? undefined : JELLY.blur,
              WebkitBackdropFilter: variant === 'dark' ? undefined : JELLY.blur,
            }}
          >
            <button
              type="button"
              onClick={() => extendYearPickerMax()}
              style={{
                width: '100%',
                fontSize: 12,
                padding: '10px 14px',
                borderRadius: JELLY.radiusControl,
                border: variant === 'dark' ? `1px solid rgba(79, 140, 255, 0.35)` : `1px solid rgba(14, 165, 233, 0.4)`,
                background: variant === 'dark' ? PRIMARY_LIGHT : 'rgba(255,255,255,0.4)',
                backdropFilter: variant === 'dark' ? undefined : JELLY.blur,
                WebkitBackdropFilter: variant === 'dark' ? undefined : JELLY.blur,
                color: PRIMARY,
                fontWeight: 600,
                cursor: 'pointer',
                whiteSpace: 'nowrap',
                textAlign: 'center',
                boxShadow: variant === 'dark' ? 'none' : '0 4px 14px rgba(14, 165, 233, 0.12)',
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
