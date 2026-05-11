import { useEffect, useRef, useState } from 'react'
import { useAppStore, getYearPickerYearOptions } from '@/store/useAppStore'
import {
  CATEGORY_SELECT_TRIGGER_WIDTH,
  INPUT_BORDER_RADIUS,
  INPUT_HEIGHT,
  PRIMARY,
  PRIMARY_DARK,
  PRIMARY_LIGHT,
  DROPDOWN_PADDING_COMPACT,
  DROPDOWN_CARET_COLOR,
  DROPDOWN_CARET_FONT_SIZE_COMPACT,
  DROPDOWN_ITEM_PADDING_REGULAR,
} from '@/styles/formControls'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { DropdownArrowIcon } from './DropdownArrowIcon'

type YearSelectDropdownProps = {
  value: number
  onChange: (year: number) => void
  /** dark: 월 선택기 상단 트리거, light: 모달·폼용 글래스 스타일 */
  variant?: 'dark' | 'light'
}

export function YearSelectDropdown({ value, onChange, variant = 'light' }: YearSelectDropdownProps) {
  const narrow = useNarrowLayout()
  const yearPickerMaxYear = useAppStore((s) => s.yearPickerMaxYear)
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

  /** 고정지출·투자 행의 카테고리 `CustomSelect`(compact, triggerWidth)와 동일 계열 */
  const triggerStyle = {
    appearance: 'none' as const,
    width: CATEGORY_SELECT_TRIGGER_WIDTH,
    minWidth: CATEGORY_SELECT_TRIGGER_WIDTH,
    maxWidth: CATEGORY_SELECT_TRIGGER_WIDTH,
    height: INPUT_HEIGHT,
    minHeight: INPUT_HEIGHT,
    padding: DROPDOWN_PADDING_COMPACT,
    borderRadius: INPUT_BORDER_RADIUS,
    border: `1px solid ${open ? PRIMARY : '#e5e7eb'}`,
    background: '#fff',
    color: '#111827',
    fontSize: 12,
    fontWeight: 500,
    lineHeight: 1,
    cursor: 'pointer',
    outline: 'none',
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'space-between' as const,
    gap: 6,
    boxSizing: 'border-box' as const,
    whiteSpace: 'nowrap' as const,
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
  }

  const caretColor = DROPDOWN_CARET_COLOR

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

  const triggerW = triggerRef.current?.offsetWidth ?? CATEGORY_SELECT_TRIGGER_WIDTH

  return (
    <div
      ref={wrapRef}
      style={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        width: CATEGORY_SELECT_TRIGGER_WIDTH,
        minWidth: CATEGORY_SELECT_TRIGGER_WIDTH,
        maxWidth: CATEGORY_SELECT_TRIGGER_WIDTH,
        flexShrink: 0,
        boxSizing: 'border-box',
        alignSelf: variant === 'dark' ? 'center' : 'flex-start',
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
        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{value}년</span>
        <DropdownArrowIcon style={{ width: 10, height: 10, color: DROPDOWN_CARET_COLOR }} />
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
                    padding: DROPDOWN_ITEM_PADDING_REGULAR,
                    border: 'none',
                    background: active ? PRIMARY_LIGHT : 'transparent',
                    color: active ? PRIMARY_DARK : JELLY.text,
                    fontSize: 13,
                    fontWeight: active ? 700 : 500,
                    cursor: 'pointer',
                    borderRadius: JELLY.radiusControl,
                    height: INPUT_HEIGHT,
                    display: 'flex',
                    alignItems: 'center',
                  }}
                >
                  {y}년
                </button>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
