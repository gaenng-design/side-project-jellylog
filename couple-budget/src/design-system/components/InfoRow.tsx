import type { ReactNode } from 'react'
import { DS, tabularNums } from '../tokens'

/** 카드 안 "라벨 — 값" 한 줄. strong 이면 위 구분선과 큰 글자(합계 줄) */
export function InfoRow({
  label,
  value,
  strong,
  valueColor,
}: {
  label: ReactNode
  value: ReactNode
  strong?: boolean
  valueColor?: string
}) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'baseline',
        gap: 8,
        marginBottom: strong ? 0 : 4,
        ...(strong ? { paddingTop: 8, marginTop: 4, borderTop: `1px solid ${DS.color.border.subtle}` } : {}),
      }}
    >
      <span style={{ fontSize: DS.font.size.caption, fontWeight: strong ? 600 : 400, color: strong ? DS.color.text.body : DS.color.text.secondary }}>
        {label}
      </span>
      <span
        style={{
          fontSize: strong ? DS.font.size.body : DS.font.size.caption,
          fontWeight: strong ? 700 : 500,
          color: valueColor ?? (strong ? DS.color.primary : DS.color.text.body),
          ...tabularNums,
        }}
      >
        {value}
      </span>
    </div>
  )
}
