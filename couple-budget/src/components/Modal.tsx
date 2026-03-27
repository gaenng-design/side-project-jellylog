import { useEffect } from 'react'
import { createPortal } from 'react-dom'
import { JELLY, jellyModalOverlay, jellyModalPanel } from '@/styles/jellyGlass'

interface ModalProps {
  open: boolean
  title: string
  onClose: () => void
  children: React.ReactNode
}

/** backdrop-filter·transform 조상 안에 있으면 fixed가 뷰포트 기준이 아니게 됨 → body 포털 + 스크롤 잠금 */
let scrollLockDepth = 0
let savedBodyOverflow = ''
let savedMainOverflow = ''

function lockAppScroll() {
  scrollLockDepth++
  if (scrollLockDepth > 1) return
  const main = document.querySelector('main')
  savedBodyOverflow = document.body.style.overflow
  document.body.style.overflow = 'hidden'
  if (main instanceof HTMLElement) {
    savedMainOverflow = main.style.overflow
    main.style.overflow = 'hidden'
  }
}

function unlockAppScroll() {
  scrollLockDepth = Math.max(0, scrollLockDepth - 1)
  if (scrollLockDepth > 0) return
  const main = document.querySelector('main')
  document.body.style.overflow = savedBodyOverflow
  if (main instanceof HTMLElement) main.style.overflow = savedMainOverflow
}

export function Modal({ open, title, onClose, children }: ModalProps) {
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    if (open) document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  useEffect(() => {
    if (!open) return
    lockAppScroll()
    return () => {
      unlockAppScroll()
    }
  }, [open])

  if (!open) return null

  return createPortal(
    <div
      role="presentation"
      onClick={onClose}
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        minHeight: '100dvh',
        zIndex: 12000,
        ...jellyModalOverlay,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(16px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
        boxSizing: 'border-box',
      }}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        onClick={(e) => e.stopPropagation()}
        style={{
          ...jellyModalPanel,
          padding: '28px 28px 24px',
          minWidth: 360,
          maxWidth: 440,
          width: 'min(90vw, 440px)',
          maxHeight: 'min(85dvh, 640px)',
          overflow: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <h2 id="modal-title" style={{ margin: 0, fontSize: 17, fontWeight: 700, color: JELLY.text }}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            style={{
              background: 'rgba(255,255,255,0.35)',
              border: JELLY.innerBorderSoft,
              borderRadius: JELLY.radiusControl,
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
    </div>,
    document.body,
  )
}
