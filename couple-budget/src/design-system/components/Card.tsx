import { useState, type CSSProperties, type ReactNode } from 'react'
import { DS } from '../tokens'

type CardVariant = 'default' | 'data' | 'highlight'

const transition = `${DS.motion.duration}ms ${DS.motion.easing}`

function restingShadow(variant: CardVariant): string {
  if (variant === 'highlight') return `${DS.shadow[2]}, inset 0 1px 0 rgba(255,255,255,0.2)`
  if (variant === 'data') return DS.shadow[1]
  return DS.shadow[2]
}

export function Card(props: {
  children: ReactNode
  variant?: CardVariant
  padding?: keyof Pick<typeof DS.space, 2 | 3 | 4 | 5 | 6>
  style?: CSSProperties
  className?: string
  hoverLift?: boolean
  role?: string
  tabIndex?: number
  onClick?: () => void
  onKeyDown?: (e: React.KeyboardEvent) => void
}) {
  const { children, variant = 'default', padding = 5, style, className, hoverLift = true, role, tabIndex, onClick, onKeyDown } = props
  const p = DS.space[padding]
  const [hover, setHover] = useState(false)

  const variantStyle: CSSProperties =
    variant === 'highlight'
      ? {
          background: DS.color.gradient,
          color: DS.color.text.inverse,
        }
      : variant === 'data'
        ? { background: DS.color.bg.secondary }
        : { background: DS.color.bg.secondary }

  const boxShadow = hover && hoverLift ? DS.shadow[3] : restingShadow(variant)

  return (
    <div
      className={className}
      role={role}
      tabIndex={tabIndex}
      onClick={onClick}
      onKeyDown={onKeyDown}
      style={{
        borderRadius: DS.radius.card,
        padding: p,
        transition: `transform ${transition}, box-shadow ${transition}`,
        transform: hover && hoverLift ? 'translateY(-2px)' : 'translateY(0)',
        boxShadow,
        ...variantStyle,
        ...style,
      }}
      onMouseEnter={() => hoverLift && setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      {children}
    </div>
  )
}
