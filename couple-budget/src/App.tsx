import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink } from 'react-router-dom'
import { ExpensePlanPage } from '@/features/expense-plan/ExpensePlanPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AccountPage } from '@/features/auth/AccountPage'
import { supabase, isSupabaseConfigured } from '@/data/supabase'
import {
  ensureSupabaseSessionForSync,
  resolveSessionAndHouseholdBeforeHydrate,
} from '@/services/authHousehold'
import { JELLY, jellyFontStack, jellyShellBackground, jellySidebarShell } from '@/styles/jellyGlass'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/expense-plan', label: '지출 계획', icon: '📋' },
  { to: '/account', label: '계정', icon: '👤' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

export default function App() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const sidebarWidth = sidebarCollapsed ? 56 : 220

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      void (async () => {
        if (!session) await ensureSupabaseSessionForSync()
        await resolveSessionAndHouseholdBeforeHydrate()
      })()
    })
    return () => subscription.unsubscribe()
  }, [])

  return (
    <HashRouter>
      <div
        style={{
          display: 'flex',
          height: '100vh',
          ...jellyShellBackground,
          fontFamily: jellyFontStack,
          color: JELLY.text,
        }}
      >
        <nav
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            ...jellySidebarShell,
            display: 'flex',
            flexDirection: 'column',
            padding: sidebarCollapsed ? '20px 12px' : '28px 16px 24px',
            transition: 'width 0.2s ease, padding 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              marginBottom: sidebarCollapsed ? 24 : 32,
              paddingLeft: sidebarCollapsed ? 0 : 8,
              display: 'flex',
              alignItems: 'center',
              justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
            }}
          >
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: JELLY.text }}>Jelly log</div>
                <div style={{ fontSize: 11, color: JELLY.textMuted, marginTop: 4 }}>부부 월 정산</div>
              </div>
            )}
            {sidebarCollapsed && <div style={{ fontSize: 18 }}>📒</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
            {NAV_ITEMS.map(({ to, label, icon }) => (
              <NavLink
                key={to}
                to={to}
                end={to === '/'}
                title={sidebarCollapsed ? label : undefined}
                style={({ isActive }) => ({
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  padding: sidebarCollapsed ? '10px' : '10px 14px',
                  borderRadius: JELLY.radiusFull,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: isActive ? 700 : 500,
                  color: isActive ? JELLY.text : JELLY.textMuted,
                  background: isActive
                    ? 'linear-gradient(180deg, rgba(248, 250, 252, 0.95) 0%, rgba(224, 242, 254, 0.88) 40%, rgba(186, 230, 253, 0.65) 100%)'
                    : 'transparent',
                  backdropFilter: isActive ? JELLY.blur : undefined,
                  WebkitBackdropFilter: isActive ? JELLY.blur : undefined,
                  border: isActive ? JELLY.innerBorder : '1px solid transparent',
                  boxShadow: isActive ? '0 6px 22px rgba(14, 165, 233, 0.18), inset 0 1px 0 rgba(255,255,255,0.85)' : 'none',
                  transition: 'all 0.18s ease',
                  justifyContent: sidebarCollapsed ? 'center' : 'flex-start',
                })}
              >
                <span>{icon}</span>
                {!sidebarCollapsed && <span>{label}</span>}
              </NavLink>
            ))}
          </div>
          <button
            type="button"
            onClick={() => setSidebarCollapsed((c) => !c)}
            title={sidebarCollapsed ? '패널 펼치기' : '패널 접기'}
            style={{
              marginTop: 10,
              padding: '10px 12px',
              border: JELLY.innerBorderSoft,
              background: 'rgba(255,255,255,0.28)',
              backdropFilter: JELLY.blur,
              WebkitBackdropFilter: JELLY.blur,
              borderRadius: JELLY.radiusFull,
              color: JELLY.textMuted,
              cursor: 'pointer',
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow: '0 4px 16px rgba(15, 23, 42, 0.06)',
            }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </nav>
        <main
          style={{
            flex: 1,
            overflow: 'auto',
            padding: '36px clamp(24px, 4vw, 48px)',
            background: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(10px)',
            WebkitBackdropFilter: 'blur(10px)',
          }}
        >
          <div style={{ maxWidth: 1120, margin: '0 auto' }}>
            <Routes>
              <Route path="/" element={<DashboardPage />} />
              <Route path="/expense-plan" element={<ExpensePlanPage />} />
              <Route path="/account" element={<AccountPage />} />
              <Route path="/settings" element={<SettingsPage />} />
            </Routes>
          </div>
        </main>
      </div>
    </HashRouter>
  )
}
