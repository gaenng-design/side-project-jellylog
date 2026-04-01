import type { CSSProperties, ReactNode } from 'react'
import { DS } from '../tokens'

type ChipTone = 'success' | 'warning' | 'error' | 'neutral'

const toneColors: Record<ChipTone, { bg: string; text: string }> = {
  success: { bg: 'rgba(34, 197, 94, 0.12)', text: DS.color.success },
  warning: { bg: 'rgba(245, 158, 11, 0.14)', text: DS.color.warning },
  error: { bg: 'rgba(239, 68, 68, 0.12)', text: DS.color.error },
  neutral: { bg: DS.color.bg.tertiary, text: DS.color.text.secondary },
}

export function Chip(props: { children: ReactNode; tone?: ChipTone; style?: CSSProperties }) {
  const { children, tone = 'neutral', style } = props
  const c = toneColors[tone]
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '6px 12px',
        borderRadius: DS.radius.chip,
        fontFamily: DS.font.family,
        fontSize: DS.font.caption.size,
        fontWeight: DS.font.caption.weight,
        background: c.bg,
        color: c.text,
        whiteSpace: 'nowrap',
        ...style,
      }}
    >
      {children}
    </span>
  )
}
