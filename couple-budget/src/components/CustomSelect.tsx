import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { INPUT_HEIGHT, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE, INPUT_BORDER, PRIMARY, PRIMARY_LIGHT } from '@/styles/formControls'

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
  /** compact 모드 높이 (삭제 버튼 등과 통일용) */
  compactHeight?: number
  /** compact 모드에서 넓이를 텍스트에 맞춤 */
  compactAutoWidth?: boolean
}

const dropdownStyle = {
  background: '#fff',
  border: INPUT_BORDER,
  borderRadius: INPUT_BORDER_RADIUS,
  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
  zIndex: 10000,
} as const

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}

export function CustomSelect({ options, value, onChange, placeholder = '선택', compact, compactMinWidth = 64, customBgColor, customChipBg, compactHeight, compactAutoWidth }: CustomSelectProps) {
  const [open, setOpen] = useState(false)
  const [dropdownRect, setDropdownRect] = useState<{ top: number; left: number; width: number } | null>(null)
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

  useEffect(() => {
    if (!open || !ref.current) {
      setDropdownRect(null)
      return
    }
    const rect = ref.current.getBoundingClientRect()
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: compact ? Math.max(rect.width, 100) : rect.width,
    })
  }, [open, compact])

  const close = () => setOpen(false)

  if (compact) {
    return (
      <>
        <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
          <button
            type="button"
            onClick={() => setOpen((o) => !o)}
            style={{
              height: compactHeight ?? INPUT_HEIGHT,
              minHeight: compactHeight ?? INPUT_HEIGHT,
              ...(compactAutoWidth ? {} : { minWidth: compactMinWidth, maxWidth: compactMinWidth }),
              padding: '0 10px',
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 8,
              fontSize: 12,
              borderRadius: compactAutoWidth && customChipBg ? 999 : INPUT_BORDER_RADIUS,
              border: `1.5px solid ${open || (value && (customChipBg || customBgColor)) ? (customBgColor ?? PRIMARY) : '#e5e7eb'}`,
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
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{value || placeholder}</span>
            <span style={{ flexShrink: 0, color: '#6b7280', fontSize: 10 }}>▾</span>
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
                  minHeight: INPUT_HEIGHT,
                  padding: '0 12px',
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
      <div ref={ref} style={{ position: 'relative' }}>
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          style={{
            width: '100%',
            height: INPUT_HEIGHT,
            padding: '0 12px',
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
          <span style={{ color: '#6b7280', fontSize: 12, flexShrink: 0 }}>▾</span>
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
                minHeight: INPUT_HEIGHT,
                padding: '0 14px',
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
