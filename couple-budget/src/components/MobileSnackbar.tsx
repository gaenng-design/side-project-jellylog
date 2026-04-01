import { useEffect, useRef } from 'react'

/** App.tsx 모바일 GNB: padding 10+10 + 행 44 + border 1 */
const MOBILE_GNB_HEIGHT_PX = 65
const BELOW_GNB_GAP_PX = 8

export type SnackbarTone = 'ok' | 'err' | 'hint'

const TONE_TEXT: Record<SnackbarTone, string> = {
  err: '#FCA5A5',
  ok: '#6EE7B7',
  hint: '#FACC15',
}

type MobileSnackbarProps = {
  open: boolean
  tone: SnackbarTone
  text: string
  /** 짧은 확인 메시지는 더 짧게 */
  durationMs?: number
  onClose: () => void
}

/**
 * 모바일용 스낵바 — 상단 GNB(햄버거·업로드 바) 바로 아래, 노치는 safe-area 반영.
 */
export function MobileSnackbar({
  open,
  tone,
  text,
  durationMs = 5600,
  onClose,
}: MobileSnackbarProps) {
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  useEffect(() => {
    if (!open) return
    const id = window.setTimeout(() => onCloseRef.current(), durationMs)
    return () => window.clearTimeout(id)
  }, [open, text, durationMs])

  if (!open || !text.trim()) return null

  return (
    <div
      role="status"
      aria-live="polite"
      style={{
        position: 'fixed',
        left: '50%',
        transform: 'translateX(-50%)',
        top: `calc(env(safe-area-inset-top, 0px) + ${MOBILE_GNB_HEIGHT_PX + BELOW_GNB_GAP_PX}px)`,
        zIndex: 2600,
        boxSizing: 'border-box',
        width: 'fit-content',
        maxWidth: 'calc(100vw - 32px)',
        padding: '12px 16px',
        borderRadius: 14,
        fontSize: 13,
        lineHeight: 1.5,
        fontWeight: 500,
        color: TONE_TEXT[tone],
        background: 'rgba(30, 41, 59, 0.94)',
        backdropFilter: 'blur(12px)',
        WebkitBackdropFilter: 'blur(12px)',
        border: '1px solid rgba(255,255,255,0.1)',
        boxShadow: '0 8px 32px rgba(0,0,0,0.28)',
        maxHeight: 'min(40vh, 200px)',
        overflow: 'auto',
        overflowWrap: 'break-word',
        wordBreak: 'keep-all',
      }}
    >
      {text}
    </div>
  )
}
