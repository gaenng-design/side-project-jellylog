import type { CSSProperties } from 'react'
import { DS, tabularNums } from '../tokens'

/**
 * 증감 표시 — 양수 초록(+), 음수 빨강(−), 0은 회색.
 * children 에 이미 부호가 포함된 문자열을 넘기고, 색만 value 부호로 정한다.
 */
export function DeltaText({
  value,
  children,
  style,
}: {
  value: number
  children: React.ReactNode
  style?: CSSProperties
}) {
  const color = value > 0 ? DS.color.positive.main : value < 0 ? DS.color.negative.main : DS.color.text.muted
  return <span style={{ color, ...tabularNums, ...style }}>{children}</span>
}

/** 부호 색만 필요할 때 */
export function deltaColor(value: number): string {
  return value > 0 ? DS.color.positive.main : value < 0 ? DS.color.negative.main : DS.color.text.muted
}
