import type { ButtonHTMLAttributes, CSSProperties, ReactNode } from 'react'
import { DS } from '../tokens'

type Variant = 'primary' | 'secondary' | 'ghost'

const transition = `${DS.motion.duration}ms ${DS.motion.easing}`

export function Button(props: {
  children: ReactNode
  variant?: Variant
  style?: CSSProperties
} & ButtonHTMLAttributes<HTMLButtonElement>) {
  const { children, variant = 'primary', style, disabled, ...rest } = props

  const base: CSSProperties = {
    height: DS.button.height,
    padding: '0 20px',
    borderRadius: DS.radius.button,
    fontFamily: DS.font.family,
    fontSize: DS.font.body.size,
    fontWeight: 600,
    border: 'none',
    cursor: disabled ? 'not-allowed' : 'pointer',
    transition: `transform ${transition}, box-shadow ${transition}, background ${transition}, opacity ${transition}`,
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  }

  const variants: Record<Variant, CSSProperties> = {
    primary: {
      background: DS.color.primary,
      color: '#fff',
      boxShadow: DS.shadow[1],
      opacity: disabled ? 0.5 : 1,
    },
    secondary: {
      background: DS.color.bg.tertiary,
      color: DS.color.text.primary,
      boxShadow: 'none',
      opacity: disabled ? 0.5 : 1,
    },
    ghost: {
      background: 'transparent',
      color: DS.color.primary,
      boxShadow: 'none',
      opacity: disabled ? 0.5 : 1,
    },
  }

  return (
    <button
      type="button"
      disabled={disabled}
      style={{ ...base, ...variants[variant], ...style }}
      onMouseDown={(e) => {
        if (!disabled) e.currentTarget.style.transform = 'scale(0.98)'
        rest.onMouseDown?.(e)
      }}
      onMouseUp={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        rest.onMouseUp?.(e)
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)'
        rest.onMouseLeave?.(e)
      }}
      {...rest}
    >
      {children}
    </button>
  )
}
