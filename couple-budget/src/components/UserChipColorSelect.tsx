import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CHIP_COLOR_PRESETS } from '@/components/PersonUI'
import { INPUT_BORDER_RADIUS, INPUT_BORDER } from '@/styles/formControls'

interface UserChipColorSelectProps {
  value: string
  onChange: (pastel: string) => void
}

const dropdownStyle = {
  background: '#fff',
  border: INPUT_BORDER,
  borderRadius: INPUT_BORDER_RADIUS,
  boxShadow: '0 4px 14px rgba(0,0,0,0.1)',
  zIndex: 10000,
} as const

export function UserChipColorSelect({ value, onChange }: UserChipColorSelectProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const ref = useRef<HTMLButtonElement>(null)
  const dropdownRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const target = e.target as Node
      if (!ref.current?.contains(target) && !dropdownRef.current?.contains(target)) setOpen(false)
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [])

  useEffect(() => {
    if (!open || !ref.current) {
      setRect(null)
      return
    }
    setRect(ref.current.getBoundingClientRect())
  }, [open])

  const current = CHIP_COLOR_PRESETS.find((p) => p.pastel.toLowerCase() === value?.toLowerCase()) ?? CHIP_COLOR_PRESETS[0]

  return (
    <>
      <button
        ref={ref}
        type="button"
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 8,
          padding: '4px 10px',
          borderRadius: 999,
          border: `1.5px solid ${current.vibrant}`,
          background: current.pastel,
          color: current.vibrant,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open &&
        rect &&
        createPortal(
          <div
            ref={(el) => {
              dropdownRef.current = el
            }}
            style={{
              position: 'fixed',
              top: rect.bottom + 4,
              left: rect.left,
              padding: 10,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              ...dropdownStyle,
            }}
          >
            {CHIP_COLOR_PRESETS.map(({ pastel, vibrant }) => (
              <button
                key={pastel}
                type="button"
                onClick={() => {
                  onChange(pastel)
                  setOpen(false)
                }}
                style={{
                  padding: '6px 12px',
                  borderRadius: 999,
                  border: `1.5px solid ${vibrant}`,
                  background: pastel,
                  color: vibrant,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: value === pastel ? 1 : 0.85,
                  boxShadow: value === pastel ? '0 0 0 2px rgba(0,0,0,0.1)' : 'none',
                }}
              >
                색상
              </button>
            ))}
          </div>,
          document.body,
        )}
    </>
  )
}
