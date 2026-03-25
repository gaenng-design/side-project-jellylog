import { useState, useRef, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { CHIP_COLOR_PRESETS } from '@/components/PersonUI'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'

interface UserChipColorSelectProps {
  value: string
  onChange: (pastel: string) => void
}

const dropdownStyle = {
  ...jellyCardStyle,
  padding: 12,
  zIndex: 10000,
  minWidth: 200,
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

  const matched = CHIP_COLOR_PRESETS.find(
    (p) => p.pastel.toLowerCase() === value?.trim().toLowerCase(),
  )
  const displayBg = (matched?.pastel ?? value?.trim()) || CHIP_COLOR_PRESETS[0].pastel

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
          padding: '5px 12px',
          borderRadius: 999,
          border: `1px solid rgba(255,255,255,0.55)`,
          background: displayBg,
          color: JELLY.text,
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
          boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.55)',
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
              top: rect.bottom + 6,
              left: rect.left,
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
                  padding: '8px 14px',
                  borderRadius: 999,
                  border: `1px solid rgba(255,255,255,0.55)`,
                  background: pastel,
                  color: vibrant,
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: value === pastel ? 1 : 0.88,
                  boxShadow:
                    value === pastel
                      ? '0 0 0 2px rgba(14, 165, 233, 0.35), inset 0 1px 0 rgba(255,255,255,0.6)'
                      : 'inset 0 1px 0 rgba(255,255,255,0.5)',
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
