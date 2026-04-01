import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { DS } from '../tokens'

export function IconSidebar(props: { items: { to: string; end?: boolean; icon: ReactNode; label: string }[] }) {
  const { items } = props
  return (
    <aside
      style={{
        width: DS.sidebar.width,
        flexShrink: 0,
        minHeight: '100%',
        background: DS.color.bg.secondary,
        boxShadow: DS.shadow[1],
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: `${DS.space[5]}px 0`,
        gap: DS.space[2],
        fontFamily: DS.font.family,
      }}
    >
      {items.map(({ to, end, icon, label }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          title={label}
          style={({ isActive }) => ({
            width: 48,
            height: 48,
            borderRadius: 14,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            textDecoration: 'none',
            color: isActive ? DS.color.primary : DS.color.text.secondary,
            background: isActive ? DS.color.primarySoft : 'transparent',
            transition: `all ${DS.motion.duration}ms ${DS.motion.easing}`,
            transform: 'scale(1)',
            boxShadow: isActive ? DS.shadow[1] : 'none',
          })}
        >
          <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
        </NavLink>
      ))}
    </aside>
  )
}
