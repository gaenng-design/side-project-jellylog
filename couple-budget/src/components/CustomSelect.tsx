import { useState, useRef, useEffect, useCallback, type ReactNode, type MouseEvent } from 'react'
import { createPortal } from 'react-dom'
import { INPUT_HEIGHT, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE, INPUT_BORDER, PRIMARY, PRIMARY_LIGHT, DROPDOWN_PADDING_COMPACT, DROPDOWN_PADDING_REGULAR, DROPDOWN_CARET_COLOR, DROPDOWN_CARET_FONT_SIZE_COMPACT, DROPDOWN_CARET_FONT_SIZE_REGULAR, DROPDOWN_ITEM_PADDING_COMPACT, DROPDOWN_ITEM_PADDING_REGULAR } from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'
import { DropdownArrowIcon } from './DropdownArrowIcon'

interface CustomSelectProps {
  options: string[]
  value: string
  onChange: (v: string) => void
  placeholder?: string
  compact?: boolean
  compactMinWidth?: number
  /** 선택 시 배경색 (유저 색상 등) */
  customBgColor?: string
  /** 칩 스타일: 파스텔 배경 (customBgColor는 테두리/텍스트용) */
  customChipBg?: string
  /** 트리거 버튼 높이(비 compact). 미지정 시 INPUT_HEIGHT */
  height?: number
  /** compact 모드 높이 (삭제 버튼 등과 통일용). `height`가 있으면 그것이 우선 */
  compactHeight?: number
  /** compact 모드에서 넓이를 텍스트에 맞춤 */
  compactAutoWidth?: boolean
  /** compact: 부모(플렉스 셀) 너비에 맞춤 — 모바일 줄바꿈 행용 */
  compactFill?: boolean
  /** 트리거·패널 기준 너비 고정 (예: 카테고리 `CATEGORY_SELECT_TRIGGER_WIDTH`) */
  triggerWidth?: number
  /** compact: 트리거 버튼 앞쪽 (예: 별도 정산 ↗). 클릭 시 드롭다운 대신 onCompactLeadingClick */
  compactLeading?: ReactNode
  onCompactLeadingClick?: (e: MouseEvent) => void
  /** compact 모드 ▾ 색 ( tinted 칩에서 흰색 등) */
  compactCaretColor?: string
  title?: string
}

/** Modal 오버레이(12000) 위에 포털 드롭다운이 보이도록 */
const dropdownStyle = {
  background: '#fff',
  border: INPUT_BORDER,
  borderRadius: INPUT_BORDER_RADIUS,
  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
  zIndex: 13000,
} as const

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}

export function CustomSelect({
  options,
  value,
  onChange,
  placeholder = '선택',
  compact,
  compactMinWidth = 64,
  customBgColor,
  customChipBg,
  height: heightProp,
  compactHeight,
  compactAutoWidth,
  compactFill,
  triggerWidth,
  compactLeading,
  onCompactLeadingClick,
  compactCaretColor,
  title,
}: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<{
    top: number
    left: number
    width: number
    placement: 'top' | 'bottom'
  } | null>(null)
  const ref = useRef<HTMLDivElement>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      const insideTrigger = ref.current?.contains(target)
      const insideDropdown = dropdownRef.current?.contains(target)
      if (!insideTrigger && !insideDropdown) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  const syncDropdownToTrigger = useCallback(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    /**
     * 화면 하단에 가까울 때 드롭다운을 위로 펼침
     * - dropdown 최대 높이는 220px (panel 자체의 maxHeight와 동일)
     * - 아래 공간이 부족하고 위 공간이 더 많으면 위로
     */
    const DROPDOWN_MAX_HEIGHT = 220
    const GAP = 4
    const viewportHeight = window.visualViewport?.height ?? window.innerHeight
    const spaceBelow = viewportHeight - rect.bottom
    const spaceAbove = rect.top
    const flipUp = spaceBelow < DROPDOWN_MAX_HEIGHT + GAP && spaceAbove > spaceBelow

    setDropdownRect({
      top: flipUp ? rect.top - GAP : rect.bottom + GAP,
      left: rect.left,
      width: compact ? Math.max(rect.width, 100) : rect.width,
      placement: flipUp ? 'top' : 'bottom',
    })
  }, [compact])

  useEffect(() => {
    if (!open) {
      setDropdownRect(null)
      return
    }
    syncDropdownToTrigger()
    const onMove = () => {
      syncDropdownToTrigger()
    }
    window.addEventListener('scroll', onMove, true)
    window.addEventListener('resize', onMove)
    const vv = window.visualViewport
    vv?.addEventListener('resize', onMove)
    vv?.addEventListener('scroll', onMove)
    const id = window.requestAnimationFrame(syncDropdownToTrigger)
    return () => {
      window.removeEventListener('scroll', onMove, true)
      window.removeEventListener('resize', onMove)
      vv?.removeEventListener('resize', onMove)
      vv?.removeEventListener('scroll', onMove)
      window.cancelAnimationFrame(id)
    }
  }, [open, syncDropdownToTrigger])

  const close = () => setOpen(false)

  const triggerHeight = compact ? (heightProp ?? compactHeight ?? INPUT_HEIGHT) : (heightProp ?? INPUT_HEIGHT)

  const caretColor = compactCaretColor ?? '#6b7280'
  const fixedTriggerW = triggerWidth != null
  const leadingDividerBg =
    caretColor === '#fff' || caretColor.toLowerCase() === '#ffffff'
      ? 'rgba(255,255,255,0.35)'
      : 'rgba(15, 23, 42, 0.1)'

  if (compact) {
    return (
      <>
        <div
          ref={ref}
          style={{
            position: 'relative',
            display: fixedTriggerW ? 'inline-block' : compactFill ? 'block' : 'inline-block',
            width: fixedTriggerW ? triggerWidth : compactFill ? '100%' : undefined,
            minWidth: fixedTriggerW ? triggerWidth : compactFill ? 0 : undefined,
            maxWidth: fixedTriggerW ? triggerWidth : undefined,
            flexShrink: fixedTriggerW ? 0 : undefined,
            boxSizing: 'border-box',
          }}
        >
          <button
            type="button"
            title={title}
            onClick={() => setOpen((o) => !o)}
            style={{
              height: triggerHeight,
              minHeight: triggerHeight,
              ...(fixedTriggerW
                ? { width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' as const }
                : compactFill
                  ? { width: '100%', minWidth: 0, maxWidth: '100%', boxSizing: 'border-box' as const }
                  : compactAutoWidth
                    ? {}
                    : { minWidth: compactMinWidth, maxWidth: compactMinWidth }),
              padding: DROPDOWN_PADDING_COMPACT,
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 6,
              fontSize: 12,
              borderRadius: compactAutoWidth && customChipBg ? JELLY.radiusUserChip : INPUT_BORDER_RADIUS,
              border: `1px solid ${open || (value && (customChipBg || customBgColor)) ? (customBgColor ?? PRIMARY) : '#e5e7eb'}`,
              background: value && customChipBg ? customChipBg : value && customBgColor ? hexToRgba(customBgColor, 0.2) : '#fff',
              color: value && customChipBg ? (customBgColor ?? PRIMARY) : value && customBgColor ? customBgColor : (value ? '#111827' : '#6b7280'),
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              fontWeight: compactAutoWidth && customChipBg ? 700 : 500,
              boxSizing: 'border-box',
            }}
          >
            {compactLeading != null && (
              <>
                <span
                  role="presentation"
                  onClick={(e) => {
                    e.stopPropagation()
                    e.preventDefault()
                    onCompactLeadingClick?.(e)
                  }}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    cursor: onCompactLeadingClick ? 'pointer' : 'default',
                  }}
                >
                  {compactLeading}
                </span>
                {(value || placeholder) && (
                  <span
                    aria-hidden
                    style={{
                      width: 1,
                      alignSelf: 'stretch',
                      minHeight: 14,
                      background: leadingDividerBg,
                      margin: '0 2px 0 0',
                      flexShrink: 0,
                      borderRadius: 1,
                    }}
                  />
                )}
              </>
            )}
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0 }}>{value || placeholder}</span>
            <DropdownArrowIcon style={{ width: 10, height: 10, color: caretColor }} />
          </button>
        </div>
        {open && dropdownRect && createPortal(
          <div
            ref={(el) => { dropdownRef.current = el }}
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              minWidth: 100,
              transform: dropdownRect.placement === 'top' ? 'translateY(-100%)' : undefined,
              ...dropdownStyle,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {options.map((opt) => (
              <div
                key={opt}
                role="option"
                aria-selected={opt === value}
                onClick={() => { onChange(opt); close() }}
                style={{
                  height: INPUT_HEIGHT,
                  padding: DROPDOWN_ITEM_PADDING_COMPACT,
                  display: 'flex',
                  alignItems: 'center',
                  fontSize: 12,
                  cursor: 'pointer',
                  color: opt === value ? PRIMARY : '#374151',
                  background: opt === value ? PRIMARY_LIGHT : 'transparent',
                  fontWeight: opt === value ? 600 : 400,
                }}
                onMouseEnter={(e) => {
                  if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = PRIMARY_LIGHT
                }}
                onMouseLeave={(e) => {
                  if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                }}
              >
                {opt}
              </div>
            ))}
          </div>,
          document.body
        )}
      </>
    )
  }

  return (
    <>
      <div
        ref={ref}
        style={{
          position: 'relative',
          ...(fixedTriggerW
            ? {
                width: triggerWidth,
                maxWidth: triggerWidth,
                flexShrink: 0,
                boxSizing: 'border-box',
              }
            : { width: '100%' }),
        }}
      >
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: '100%',
            height: triggerHeight,
            padding: DROPDOWN_PADDING_REGULAR,
            border: `1px solid ${open ? PRIMARY : '#e5e7eb'}`,
            borderRadius: INPUT_BORDER_RADIUS,
            fontSize: INPUT_FONT_SIZE,
            color: value ? '#111827' : '#6b7280',
            background: '#fff',
            textAlign: 'left',
            cursor: 'pointer',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            gap: 10,
            fontFamily: 'inherit',
            boxSizing: 'border-box',
          }}
        >
          <span>{value || placeholder}</span>
          <DropdownArrowIcon style={{ width: 10, height: 10, color: DROPDOWN_CARET_COLOR }} />
        </button>
      </div>
      {open && dropdownRect && createPortal(
        <div
          ref={(el) => { dropdownRef.current = el }}
          style={{
            position: 'fixed',
            top: dropdownRect.top,
            left: dropdownRect.left,
            width: dropdownRect.width,
            transform: dropdownRect.placement === 'top' ? 'translateY(-100%)' : undefined,
            ...dropdownStyle,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {options.map((opt) => (
            <div
              key={opt}
              role="option"
              aria-selected={opt === value}
              onClick={() => { onChange(opt); close() }}
              style={{
                height: INPUT_HEIGHT,
                padding: DROPDOWN_ITEM_PADDING_REGULAR,
                display: 'flex',
                alignItems: 'center',
                fontSize: INPUT_FONT_SIZE,
                cursor: 'pointer',
                color: opt === value ? PRIMARY : '#374151',
                background: opt === value ? PRIMARY_LIGHT : 'transparent',
                fontWeight: opt === value ? 600 : 400,
              }}
              onMouseEnter={(e) => {
                if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = PRIMARY_LIGHT
              }}
              onMouseLeave={(e) => {
                if (opt !== value) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
              }}
            >
              {opt}
            </div>
          ))}
        </div>,
        document.body
      )}
    </>
  )
}
