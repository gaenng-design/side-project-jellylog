import type { CSSProperties, ReactNode } from 'react'
import { DS, tabularNums } from '../tokens'
import { Card } from './Card'

/** 큰 숫자 요약 카드 — 라벨 / 값 / 보조 문구 */
export function StatCard({
  label,
  value,
  valueColor,
  sub,
  tone = 'neutral',
  children,
  style,
}: {
  label: ReactNode
  value: ReactNode
  valueColor?: string
  sub?: ReactNode
  /** 테두리 색으로 상태를 강조 */
  tone?: 'neutral' | 'positive' | 'negative'
  children?: ReactNode
  style?: CSSProperties
}) {
  const border =
    tone === 'positive' ? `1.5px solid ${DS.color.positive.border}` : tone === 'negative' ? `1.5px solid ${DS.color.negative.border}` : undefined
  return (
    <Card variant="data" padding={4} hoverLift={false} style={{ border, ...style }}>
      <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: 22, fontWeight: 700, color: valueColor ?? DS.color.text.primary, ...tabularNums }}>{value}</div>
      {sub != null && <div style={{ fontSize: 11, color: DS.color.text.muted, marginTop: 4 }}>{sub}</div>}
      {children}
    </Card>
  )
}
