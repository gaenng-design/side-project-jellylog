import type { CSSProperties, ReactNode } from 'react'
import { DS, tabularNums } from '../tokens'
import { Chip } from './Chip'

export function TransactionRow(props: {
  avatar: ReactNode
  title: string
  subtitle: string
  chip: ReactNode
  amount: string
  amountTone?: 'default' | 'income' | 'expense'
  style?: CSSProperties
}) {
  const { avatar, title, subtitle, chip, amount, amountTone = 'default', style } = props
  const amountColor =
    amountTone === 'income' ? DS.color.success : amountTone === 'expense' ? DS.color.text.primary : DS.color.text.primary

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: DS.space[3],
        minHeight: DS.row.transactionHeight,
        padding: `${DS.space[2]}px 0`,
        borderBottom: `1px solid rgba(0,0,0,0.04)`,
        fontFamily: DS.font.family,
        transition: `background ${DS.motion.duration}ms ${DS.motion.easing}`,
        ...style,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.background = DS.color.bg.tertiary
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.background = 'transparent'
      }}
    >
      <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: 12, overflow: 'hidden' }}>{avatar}</div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: DS.font.body.size,
            fontWeight: 600,
            color: DS.color.text.primary,
            lineHeight: 1.3,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap',
          }}
        >
          {title}
        </div>
        <div style={{ fontSize: DS.font.caption.size, color: DS.color.text.secondary, marginTop: 2 }}>{subtitle}</div>
      </div>
      <div style={{ flexShrink: 0 }}>{chip}</div>
      <div
        style={{
          flexShrink: 0,
          fontSize: DS.font.body.size,
          fontWeight: 700,
          color: amountColor,
          ...tabularNums,
          minWidth: 96,
          textAlign: 'right',
        }}
      >
        {amount}
      </div>
    </div>
  )
}
