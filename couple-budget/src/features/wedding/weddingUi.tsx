import type { CSSProperties, ReactNode } from 'react'
import { DS, tabularNums } from '@/design-system/tokens'
import { INPUT_BORDER_RADIUS, INPUT_HEIGHT } from '@/styles/formControls'

export const won = (n: number) => `${Math.round(n).toLocaleString('ko-KR')}원`
export const man = (n: number) => `${Math.round(n / 10000).toLocaleString('ko-KR')}만원`
export const parseAmount = (v: string) => {
  const n = parseInt(v.replace(/[^\d]/g, ''), 10)
  return Number.isFinite(n) ? n : 0
}

export const textInput: CSSProperties = {
  width: '100%',
  height: INPUT_HEIGHT,
  padding: '0 12px',
  borderRadius: INPUT_BORDER_RADIUS,
  border: `1px solid ${DS.color.border.subtle}`,
  background: DS.color.bg.secondary,
  color: DS.color.text.primary,
  fontSize: DS.font.size.body,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  outline: 'none',
}

/** 모달·폼의 라벨 + 입력 한 줄 */
export function Field({ label, children, hint }: { label: string; children: ReactNode; hint?: string }) {
  return (
    <label style={{ display: 'block', marginBottom: 12 }}>
      <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, marginBottom: 4 }}>{label}</div>
      {children}
      {hint && <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, marginTop: 4 }}>{hint}</div>}
    </label>
  )
}

export function Chip({ tone = 'neutral', children }: { tone?: 'neutral' | 'positive' | 'warning' | 'primary'; children: ReactNode }) {
  const map = {
    neutral: { bg: DS.color.bg.muted, fg: DS.color.text.secondary },
    positive: { bg: DS.color.positive.soft, fg: DS.color.positive.main },
    warning: { bg: DS.color.warning.soft, fg: DS.color.warning.text },
    primary: { bg: DS.color.primarySoft, fg: DS.color.primaryDark },
  }[tone]
  return (
    <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: DS.radius.chip, background: map.bg, color: map.fg, fontSize: DS.font.size.caption, fontWeight: 600, whiteSpace: 'nowrap' }}>
      {children}
    </span>
  )
}

export function ProgressBar({ value, over }: { value: number; over?: boolean }) {
  return (
    <div style={{ height: 8, borderRadius: 999, background: DS.color.bg.muted, overflow: 'hidden' }}>
      <div style={{ width: `${Math.min(100, Math.max(0, value * 100))}%`, height: '100%', borderRadius: 999, background: over ? DS.color.negative.main : DS.color.primary }} />
    </div>
  )
}

export function EmptyNote({ children }: { children: ReactNode }) {
  return <div style={{ padding: `${DS.space[6]}px 0`, textAlign: 'center', color: DS.color.text.muted, fontSize: DS.font.size.body, lineHeight: 1.6 }}>{children}</div>
}

export const numStyle: CSSProperties = { ...tabularNums }
