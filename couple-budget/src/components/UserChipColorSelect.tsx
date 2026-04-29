import { useState, useRef, useEffect, useLayoutEffect } from 'react'
import { createPortal } from 'react-dom'
import { CHIP_COLOR_PRESETS } from '@/components/PersonUI'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { DROPDOWN_ARROW_ICON } from '@/styles/formControls'

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

const VIEWPORT_PAD = 8

export function UserChipColorSelect({ value, onChange }: UserChipColorSelectProps) {
  const [open, setOpen] = useState(false)
  const [rect, setRect] = useState<DOMRect | null>(null)
  const [menuPos, setMenuPos] = useState<{ top: number; left: number } | null>(null)
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
      setMenuPos(null)
      return
    }
    setRect(ref.current.getBoundingClientRect())
  }, [open])

  useEffect(() => {
    if (!open) return
    const syncTriggerRect = () => {
      if (ref.current) setRect(ref.current.getBoundingClientRect())
    }
    syncTriggerRect()
    window.addEventListener('scroll', syncTriggerRect, true)
    window.addEventListener('resize', syncTriggerRect)
    const vv = window.visualViewport
    vv?.addEventListener('resize', syncTriggerRect)
    vv?.addEventListener('scroll', syncTriggerRect)
    const id = requestAnimationFrame(syncTriggerRect)
    return () => {
      window.removeEventListener('scroll', syncTriggerRect, true)
      window.removeEventListener('resize', syncTriggerRect)
      vv?.removeEventListener('resize', syncTriggerRect)
      vv?.removeEventListener('scroll', syncTriggerRect)
      cancelAnimationFrame(id)
    }
  }, [open])

  useLayoutEffect(() => {
    if (!open || !rect) {
      setMenuPos(null)
      return
    }
    const el = dropdownRef.current
    if (!el) return
    const d = el.getBoundingClientRect()
    let left = rect.left
    let top = rect.bottom + 6
    if (left + d.width > window.innerWidth - VIEWPORT_PAD) {
      left = window.innerWidth - VIEWPORT_PAD - d.width
    }
    if (left < VIEWPORT_PAD) left = VIEWPORT_PAD
    if (top + d.height > window.innerHeight - VIEWPORT_PAD) {
      top = rect.top - 6 - d.height
    }
    if (top < VIEWPORT_PAD) top = VIEWPORT_PAD
    setMenuPos({ top, left })
  }, [open, rect])

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
          borderRadius: JELLY.radiusUserChip,
          border: `1px solid rgba(255,255,255,0.55)`,
          background: displayBg,
          color: '#fff',
          textShadow: '0 1px 2px rgba(15, 23, 42, 0.45)',
          fontSize: 12,
          fontWeight: 700,
          cursor: 'pointer',
        }}
      >
        <img src={DROPDOWN_ARROW_ICON} alt="" style={{ width: 10, height: 10, display: 'block' }} />
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
              top: menuPos?.top ?? rect.bottom + 6,
              left: menuPos?.left ?? rect.left,
              display: 'flex',
              flexWrap: 'wrap',
              gap: 8,
              maxWidth: `calc(100vw - ${VIEWPORT_PAD * 2}px)`,
              boxSizing: 'border-box',
              ...dropdownStyle,
            }}
          >
            {CHIP_COLOR_PRESETS.map(({ pastel }) => (
              <button
                key={pastel}
                type="button"
                onClick={() => {
                  onChange(pastel)
                  setOpen(false)
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: JELLY.radiusUserChip,
                  border: `1px solid rgba(255,255,255,0.55)`,
                  background: pastel,
                  color: '#fff',
                  textShadow: '0 1px 2px rgba(15, 23, 42, 0.45)',
                  fontSize: 12,
                  fontWeight: 700,
                  cursor: 'pointer',
                  opacity: value === pastel ? 1 : 0.88,
                  boxShadow: value === pastel ? '0 0 0 2px rgba(14, 165, 233, 0.35)' : undefined,
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
