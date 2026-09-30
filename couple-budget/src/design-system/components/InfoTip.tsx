import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DS } from '../tokens'

/**
 * 작은 ⓘ 버튼 — 눌러서(또는 마우스를 올려서) 긴 설명을 펼친다.
 * 카드 제목 옆에 두어 본문 설명 문단을 접어두는 용도.
 */
export function InfoTip({ children, label = '설명 보기' }: { children: ReactNode; label?: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  useEffect(() => {
    if (!open) return
    const onDown = (e: MouseEvent | TouchEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('touchstart', onDown, { passive: true })
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('touchstart', onDown)
    }
  }, [open])

  return (
    <span ref={ref} style={{ position: 'relative', display: 'inline-flex', verticalAlign: 'middle' }}>
      <button
        type="button"
        data-compact
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        style={{
          width: 20,
          height: 20,
          minHeight: 20,
          padding: 0,
          borderRadius: '50%',
          border: `1px solid ${DS.color.border.default}`,
          background: open ? DS.color.primarySoft : DS.color.bg.secondary,
          color: open ? DS.color.primaryDark : DS.color.text.muted,
          fontSize: DS.font.size.caption,
          fontWeight: 700,
          lineHeight: 1,
          cursor: 'pointer',
          fontFamily: 'inherit',
        }}
      >
        i
      </button>
      {open && (
        <span
          role="tooltip"
          style={{
            position: 'absolute',
            top: 26,
            left: 0,
            zIndex: 20,
            width: 260,
            maxWidth: 'calc(100vw - 48px)',
            padding: '10px 12px',
            borderRadius: DS.radius.control,
            background: DS.color.text.primary,
            color: DS.color.bg.secondary,
            fontSize: DS.font.size.caption,
            fontWeight: 400,
            lineHeight: 1.5,
            boxShadow: DS.shadow[3],
            textAlign: 'left',
            whiteSpace: 'normal',
          }}
        >
          {children}
        </span>
      )}
    </span>
  )
}
