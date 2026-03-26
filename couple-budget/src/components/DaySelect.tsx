import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  INPUT_HEIGHT,
  INPUT_BORDER_RADIUS,
  INPUT_FONT_SIZE,
  INPUT_BORDER,
  PRIMARY,
  PRIMARY_LIGHT,
} from '@/styles/formControls'

const DAY_OPTIONS = [
  { value: undefined as number | undefined, label: '미정' },
  ...Array.from({ length: 31 }, (_, i) => ({ value: i + 1, label: `매월 ${i + 1}일` })),
  { value: 0, label: '말일' },
]

function formatPayDay(v: number | null | undefined): string {
  if (v == null) return ''
  if (v === 0) return '말일'
  return `매월 ${v}일`
}

const dropdownStyle = {
  background: '#fff',
  border: INPUT_BORDER,
  borderRadius: INPUT_BORDER_RADIUS,
  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
  zIndex: 10000,
} as const

interface DaySelectProps {
  value?: number | null
  onChange: (v: number | undefined) => void
  disabled?: boolean
  compact?: boolean
}

export function DaySelect({ value, onChange, disabled, compact }: DaySelectProps) {
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

  const syncDropdownToTrigger = useCallback(() => {
    const el = ref.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    setDropdownRect({
      top: rect.bottom + 4,
      left: rect.left,
      width: compact ? Math.max(rect.width, 100) : rect.width,
    })
  }, [compact])

  useEffect(() => {
    if (!open) {
      setDropdownRect(null)
      return
    }
    syncDropdownToTrigger()
    const onMove = () => syncDropdownToTrigger()
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

  const displayValue = formatPayDay(value ?? null)
  const close = () => setOpen(false)

  const triggerStyle = compact
    ? {
        height: INPUT_HEIGHT,
        minHeight: INPUT_HEIGHT,
        minWidth: 90,
        padding: '0 10px',
        display: 'inline-flex' as const,
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 8,
        fontSize: 12,
        borderRadius: INPUT_BORDER_RADIUS,
        border: `1px solid ${open ? PRIMARY : '#e5e7eb'}`,
        background: '#fff',
        color: displayValue ? '#111827' : '#6b7280',
        cursor: disabled ? 'not-allowed' : 'pointer',
        whiteSpace: 'nowrap' as const,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
        fontWeight: 500,
        boxSizing: 'border-box' as const,
      }
    : {
        width: '100%',
        height: INPUT_HEIGHT,
        padding: '0 12px',
        border: `1px solid ${open ? PRIMARY : '#e5e7eb'}`,
        borderRadius: INPUT_BORDER_RADIUS,
        fontSize: INPUT_FONT_SIZE,
        color: displayValue ? '#111827' : '#6b7280',
        background: '#fff',
        textAlign: 'left' as const,
        cursor: disabled ? 'not-allowed' : 'pointer',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        gap: 10,
        fontFamily: 'inherit',
        boxSizing: 'border-box' as const,
      }

  return (
    <>
      <div ref={ref} style={{ position: 'relative', display: compact ? 'inline-block' : 'block' }}>
        <button
          type="button"
          onClick={() => !disabled && setOpen((o) => !o)}
          disabled={disabled}
          title="입금일"
          style={triggerStyle}
        >
          <span style={{ overflow: 'hidden', textOverflow: 'ellipsis' }}>{displayValue || '미정'}</span>
          <span style={{ color: '#6b7280', fontSize: compact ? 10 : 12, flexShrink: 0 }}>▾</span>
        </button>
      </div>
      {open &&
        dropdownRect &&
        createPortal(
          <div
            ref={(el) => {
              dropdownRef.current = el
            }}
            style={{
              position: 'fixed',
              top: dropdownRect.top,
              left: dropdownRect.left,
              width: dropdownRect.width,
              minWidth: compact ? 100 : undefined,
              ...dropdownStyle,
              maxHeight: 220,
              overflowY: 'auto',
            }}
          >
            {DAY_OPTIONS.map((opt) => {
              const isSelected = (value == null && opt.value == null) || value === opt.value
              return (
                <div
                  key={opt.label}
                  role="option"
                  aria-selected={isSelected}
                  onClick={() => {
                    onChange(opt.value)
                    close()
                  }}
                  style={{
                    minHeight: INPUT_HEIGHT,
                    padding: compact ? '0 12px' : '0 14px',
                    display: 'flex',
                    alignItems: 'center',
                    fontSize: compact ? 12 : INPUT_FONT_SIZE,
                    cursor: 'pointer',
                    color: isSelected ? PRIMARY : '#374151',
                    background: isSelected ? PRIMARY_LIGHT : 'transparent',
                    fontWeight: isSelected ? 600 : 400,
                  }}
                  onMouseEnter={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = PRIMARY_LIGHT
                  }}
                  onMouseLeave={(e) => {
                    if (!isSelected) (e.currentTarget as HTMLDivElement).style.background = 'transparent'
                  }}
                >
                  {opt.label}
                </div>
              )
            })}
          </div>,
          document.body,
        )}
    </>
  )
}
