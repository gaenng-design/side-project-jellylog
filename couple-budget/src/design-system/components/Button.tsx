import type { ButtonHTMLAttributes, CSSProperties } from 'react'
import { DS } from '../tokens'

type Variant = 'primary' | 'secondary' | 'danger' | 'soft'
type Size = 'sm' | 'md'

const SIZE: Record<Size, CSSProperties> = {
  sm: { padding: '6px 12px', fontSize: 12, borderRadius: DS.radius.chip },
  md: { padding: '8px 16px', fontSize: 13, borderRadius: DS.radius.control },
}

function variantStyle(variant: Variant): CSSProperties {
  switch (variant) {
    case 'primary':
      return { background: DS.color.primary, color: DS.color.text.inverse, border: 'none', fontWeight: 600 }
    case 'soft':
      return {
        background: DS.color.primarySoft,
        color: DS.color.primaryDark,
        border: `1px solid ${DS.color.primary}`,
        fontWeight: 600,
      }
    case 'danger':
      return {
        background: DS.color.bg.secondary,
        color: DS.color.negative.main,
        border: `1px solid ${DS.color.negative.border}`,
        fontWeight: 500,
      }
    case 'secondary':
      return {
        background: DS.color.bg.secondary,
        color: DS.color.text.body,
        border: `1px solid ${DS.color.border.strong}`,
        fontWeight: 500,
      }
  }
}

/** 공용 버튼 — 모달 하단·페이지 상단 액션 등 */
export function Button({
  variant = 'secondary',
  size = 'md',
  style,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return (
    <button
      type="button"
      disabled={disabled}
      {...rest}
      style={{
        fontFamily: 'inherit',
        whiteSpace: 'nowrap',
        cursor: disabled ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.5 : 1,
        transition: `opacity ${DS.motion.duration}ms ${DS.motion.easing}`,
        ...SIZE[size],
        ...variantStyle(variant),
        ...style,
      }}
    />
  )
}
