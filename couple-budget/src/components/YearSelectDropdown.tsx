import { useEffect, useRef, useState } from 'react'
import { useAppStore, getYearPickerYearOptions } from '@/store/useAppStore'
import {
  CATEGORY_SELECT_TRIGGER_WIDTH,
  INPUT_BORDER_RADIUS,
  INPUT_HEIGHT,
  PRIMARY,
  DROPDOWN_PADDING_COMPACT,
  DROPDOWN_CARET_COLOR,
  DROPDOWN_CARET_FONT_SIZE_COMPACT,
  DROPDOWN_PANEL_STYLE,
  dropdownItemStyle,
  dropdownItemHover,
} from '@/styles/formControls'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { DropdownArrowIcon } from './DropdownArrowIcon'
import { DS } from '@/design-system/tokens'

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
    border: `1px solid ${open ? PRIMARY : DS.color.border.subtle}`,
    background: DS.color.bg.secondary,
    color: DS.color.text.primary,
    fontSize: DS.font.size.caption,
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
    fontFamily: 'inherit',
  }

  const caretColor = DROPDOWN_CARET_COLOR

  /** 다른 드롭다운과 같은 패널 (variant 와 무관) */
  const panelStyle = DROPDOWN_PANEL_STYLE

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
            zIndex: 200,
            display: 'flex',
            flexDirection: 'column',
            // 다른 드롭다운처럼 트리거 왼쪽 정렬, 최소 너비 100
            left: 0,
            minWidth: Math.max(100, triggerW),
            ...(narrow ? { width: 'max-content', maxWidth: 'min(260px, calc(100vw - 24px))' } : null),
            ...panelStyle,
          }}
        >
          <div style={{ maxHeight: 220, overflowY: 'auto' }}>
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
                  style={dropdownItemStyle(active, true)}
                  onMouseEnter={(e) => dropdownItemHover(e.currentTarget, active, true)}
                  onMouseLeave={(e) => dropdownItemHover(e.currentTarget, active, false)}
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
