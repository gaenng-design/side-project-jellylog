import { useEffect } from 'react'
import { JELLY, jellyModalOverlay, jellyModalPanel } from '@/styles/jellyGlass'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        ...jellyModalOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          ...jellyModalPanel,
          padding: '28px 28px 24px',
          minWidth: 360,
          maxWidth: 440,
          width: '90%',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: JELLY.text }}>{title}</h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.35)',
              border: JELLY.innerBorderSoft,
              borderRadius: JELLY.radiusFull,
              cursor: 'pointer',
              color: JELLY.textMuted,
              fontSize: 20,
              lineHeight: 1,
              padding: '6px 12px',
              backdropFilter: JELLY.blur,
              WebkitBackdropFilter: JELLY.blur,
            }}
          >
            ×
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
