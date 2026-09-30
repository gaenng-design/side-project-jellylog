import type { ButtonHTMLAttributes, ReactNode } from 'react'
import { DS } from '../tokens'

/** 필터·탭용 칩 — 선택되면 주 색 테두리와 연한 면 */
export function Chip({
  active,
  children,
  suffix,
  style,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { active?: boolean; children: ReactNode; suffix?: ReactNode }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      {...rest}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '6px 14px',
        borderRadius: DS.radius.chip,
        border: `1.5px solid ${active ? DS.color.primary : DS.color.border.subtle}`,
        background: active ? DS.color.primarySoft : DS.color.bg.secondary,
        color: active ? DS.color.primaryDark : DS.color.text.secondary,
        fontSize: DS.font.size.caption,
        fontWeight: active ? 600 : 400,
        fontFamily: 'inherit',
        cursor: 'pointer',
        ...style,
      }}
    >
      {children}
      {suffix != null && (
        <span style={{ fontSize: DS.font.size.caption, fontWeight: 400, color: active ? DS.color.primaryDark : DS.color.text.muted }}>{suffix}</span>
      )}
    </button>
  )
}
