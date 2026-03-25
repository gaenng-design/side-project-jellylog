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
import { PRIMARY } from '@/styles/formControls'

const SIDEBAR_NAVY = '#1e3a5f'
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
          background: '#f0f2f5',
          fontFamily: "'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', sans-serif",
        }}
      >
        <nav
          style={{
            width: sidebarWidth,
            flexShrink: 0,
            background: SIDEBAR_NAVY,
            display: 'flex',
            flexDirection: 'column',
            padding: sidebarCollapsed ? '20px 12px' : '28px 16px 24px',
            transition: 'width 0.2s ease, padding 0.2s ease',
            overflow: 'hidden',
          }}
        >
          <div style={{ marginBottom: sidebarCollapsed ? 24 : 32, paddingLeft: sidebarCollapsed ? 0 : 8, display: 'flex', alignItems: 'center', justifyContent: sidebarCollapsed ? 'center' : 'flex-start' }}>
            {!sidebarCollapsed && (
              <div>
                <div style={{ fontSize: 18, fontWeight: 800, color: '#fff' }}>Jelly log</div>
                <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>부부 월 정산</div>
              </div>
            )}
            {sidebarCollapsed && <div style={{ fontSize: 18 }}>📒</div>}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: 1 }}>
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
                  padding: sidebarCollapsed ? '10px' : '10px 12px',
                  borderRadius: 10,
                  textDecoration: 'none',
                  fontSize: 14,
                  fontWeight: 500,
                  color: isActive ? '#fff' : '#94a3b8',
                  background: isActive ? PRIMARY : 'transparent',
                  transition: 'all 0.15s',
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
              marginTop: 8,
              padding: 8,
              border: 'none',
              background: 'rgba(255,255,255,0.1)',
              borderRadius: 8,
              color: '#94a3b8',
              cursor: 'pointer',
              fontSize: 16,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            {sidebarCollapsed ? '▶' : '◀'}
          </button>
        </nav>
        <main style={{ flex: 1, overflow: 'auto', padding: '32px 40px' }}>
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/expense-plan" element={<ExpensePlanPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  )
}
