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
  onClick,
  valueSize,
}: {
  label: ReactNode
  value: ReactNode
  valueColor?: string
  sub?: ReactNode
  /** 테두리 색으로 상태를 강조 */
  tone?: 'neutral' | 'positive' | 'negative'
  children?: ReactNode
  style?: CSSProperties
  /** 주면 카드 전체가 눌리는 버튼처럼 동작 (해당 화면으로 이동 등) */
  onClick?: () => void
  /** 값 글자 크기 (기본 headline 24) — 좁은 카드에서 title 20 */
  valueSize?: number
}) {
  const border =
    tone === 'positive' ? `1.5px solid ${DS.color.positive.border}` : tone === 'negative' ? `1.5px solid ${DS.color.negative.border}` : undefined
  return (
    <Card
      variant="data"
      padding={4}
      hoverLift={false}
      style={{ border, ...(onClick ? { cursor: 'pointer' } : null), ...style }}
      {...(onClick
        ? {
            role: 'button',
            tabIndex: 0,
            onClick,
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault()
                onClick()
              }
            },
          }
        : null)}
    >
      <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, marginBottom: 6 }}>{label}</div>
      <div style={{ fontSize: valueSize ?? DS.font.size.headline, fontWeight: 700, color: valueColor ?? DS.color.text.primary, ...tabularNums }}>{value}</div>
      {sub != null && <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, marginTop: 4 }}>{sub}</div>}
      {children}
    </Card>
  )
}
