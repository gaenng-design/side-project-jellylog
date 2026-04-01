import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ExpensePlanPage } from '@/features/expense-plan/ExpensePlanPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AccountPage } from '@/features/auth/AccountPage'
import { supabase, isSupabaseConfigured } from '@/data/supabase'
import { saveAllToSupabase } from '@/data/saveAllToSupabase'
import {
  ensureSupabaseSessionForSync,
  resolveSessionAndHouseholdBeforeHydrate,
} from '@/services/authHousehold'
import {
  JELLY,
  jellyFontStack,
  jellyShellBackground,
  jellySidebarShell,
  jellyPrimaryButton,
  jellyPrimaryButtonDisabled,
} from '@/styles/jellyGlass'
import { NarrowLayoutProvider, useNarrowLayout } from '@/context/NarrowLayoutContext'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/expense-plan', label: '지출 계획', icon: '📋' },
  { to: '/account', label: '계정', icon: '👤' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

function AppShell() {
  const narrow = useNarrowLayout()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [cloudSaving, setCloudSaving] = useState(false)
  const [cloudMsg, setCloudMsg] = useState<{ tone: 'ok' | 'err' | 'hint'; text: string } | null>(null)
  const sidebarWidth = sidebarCollapsed ? 56 : 220
  const iconOnlyNav = narrow || sidebarCollapsed

  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  useEffect(() => {
    if (!mobileMenuOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMobileMenuOpen(false)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mobileMenuOpen])

  const handleSupabaseUpload = async () => {
    setCloudMsg(null)
    setCloudSaving(true)
    try {
      const res = await saveAllToSupabase()
      if (!res.ok) {
        setCloudMsg({ tone: 'err', text: res.message })
        return
      }
      if (res.snapshotOk) {
        setCloudMsg({ tone: 'ok', text: 'Supabase에 반영했습니다. (가계에 연동된 데이터)' })
      } else {
        setCloudMsg({
          tone: 'hint',
          text:
            res.snapshotHint ??
            'DB 테이블은 가계 기준으로 반영되었습니다. 앱 스냅샷은 SQL 마이그레이션 후 설정에서 다시 시도해 주세요.',
        })
      }
    } finally {
      setCloudSaving(false)
    }
  }

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
    <div
      style={{
        display: 'flex',
        flexDirection: narrow ? 'column' : 'row',
        height: '100vh',
        overflow: narrow ? 'hidden' : undefined,
        ...jellyShellBackground,
        fontFamily: jellyFontStack,
        color: JELLY.text,
      }}
    >
      <div
        style={
          narrow
            ? { width: '100%', flexShrink: 0 }
            : {
                flexShrink: 0,
                display: 'flex',
                alignItems: 'center',
                alignSelf: 'stretch',
                padding: '22px 14px 22px 22px',
                boxSizing: 'border-box',
              }
        }
      >
        <nav
          style={{
            width: narrow ? '100%' : sidebarWidth,
            flexShrink: 0,
            ...(narrow
              ? {
                  ...jellySidebarShell,
                }
              : {
                  background: '#1A1D21',
                  height: 'calc(100vh - 44px)',
                  maxHeight: 'calc(100vh - 44px)',
                  borderRadius: 26,
                  boxShadow:
                    '0 20px 50px rgba(0,0,0,0.22), 0 8px 24px rgba(0,0,0,0.12), 0 0 0 1px rgba(255,255,255,0.04)',
                  border: 'none',
                }),
            display: 'flex',
            flexDirection: narrow ? 'row' : 'column',
            alignItems: narrow ? 'center' : 'stretch',
            gap: narrow ? 0 : undefined,
            padding: narrow ? '10px 12px' : iconOnlyNav ? '20px 12px' : '28px 16px 24px',
            transition: 'width 0.2s ease, padding 0.2s ease',
            overflow: narrow ? 'visible' : 'hidden',
            boxSizing: 'border-box',
            borderBottom: narrow ? '1px solid rgba(255,255,255,0.08)' : undefined,
          }}
        >
        {narrow ? (
          <div
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              gap: 12,
              minWidth: 0,
            }}
          >
            <button
              type="button"
              aria-label="메뉴 열기"
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen(true)}
              style={{
                flexShrink: 0,
                width: 44,
                height: 44,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                borderRadius: JELLY.radiusControl,
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                color: '#F9FAFB',
                cursor: 'pointer',
                padding: 0,
              }}
            >
              <span style={{ display: 'flex', flexDirection: 'column', gap: 5, width: 20 }} aria-hidden>
                <span style={{ height: 2, borderRadius: 1, background: 'currentColor' }} />
                <span style={{ height: 2, borderRadius: 1, background: 'currentColor' }} />
                <span style={{ height: 2, borderRadius: 1, background: 'currentColor' }} />
              </span>
            </button>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexShrink: 0 }}>
              <span style={{ fontSize: 22, lineHeight: 1 }} aria-hidden>
                ☁️
              </span>
              <button
                type="button"
                disabled={!isSupabaseConfigured || cloudSaving}
                title={!isSupabaseConfigured ? 'Supabase가 설정되지 않았습니다' : 'Supabase에 업로드'}
                onClick={() => void handleSupabaseUpload()}
                style={{
                  ...(!isSupabaseConfigured || cloudSaving ? jellyPrimaryButtonDisabled : jellyPrimaryButton),
                  fontSize: 13,
                  fontWeight: 600,
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  whiteSpace: 'nowrap',
                }}
              >
                {cloudSaving ? '업로드 중…' : '업로드'}
              </button>
            </div>
          </div>
        ) : (
          <>
            <div
              style={{
                marginBottom: iconOnlyNav ? 24 : 32,
                paddingLeft: iconOnlyNav ? 0 : 8,
                display: 'flex',
                alignItems: 'center',
                justifyContent: iconOnlyNav ? 'center' : 'flex-start',
                flexShrink: 0,
                width: '100%',
              }}
            >
              {!iconOnlyNav && (
                <div>
                  <div style={{ fontSize: 17, fontWeight: 700, color: '#F9FAFB', letterSpacing: '-0.02em' }}>
                    Jelly log
                  </div>
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>부부 월 정산</div>
                </div>
              )}
              {iconOnlyNav && <div style={{ fontSize: 20, lineHeight: 1 }}>📒</div>}
            </div>
            <div
              style={{
                display: 'flex',
                flexDirection: 'column',
                gap: 4,
                flex: 1,
                overflowX: 'visible',
              }}
            >
              {NAV_ITEMS.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  title={label}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: iconOnlyNav ? '10px 12px' : '12px 14px',
                    borderRadius: JELLY.radiusControl,
                    textDecoration: 'none',
                    fontSize: 14,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.55)',
                    background: isActive ? 'rgba(79, 140, 255, 0.28)' : 'transparent',
                    border: isActive ? '1px solid rgba(79, 140, 255, 0.35)' : '1px solid transparent',
                    boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
                    transition: 'color 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                    justifyContent: iconOnlyNav ? 'center' : 'flex-start',
                    width: '100%',
                    boxSizing: 'border-box',
                    flexShrink: 0,
                  })}
                >
                  <span style={{ fontSize: 18, lineHeight: 1 }}>{icon}</span>
                  {!iconOnlyNav && <span>{label}</span>}
                </NavLink>
              ))}
            </div>
            <div
              style={{
                marginTop: 14,
                paddingTop: 14,
                borderTop: '1px solid rgba(255,255,255,0.08)',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'stretch',
                gap: 0,
                flexShrink: 0,
                width: '100%',
              }}
            >
              <button
                type="button"
                disabled={!isSupabaseConfigured || cloudSaving}
                title={!isSupabaseConfigured ? 'Supabase가 설정되지 않았습니다' : undefined}
                onClick={() => void handleSupabaseUpload()}
                style={{
                  ...(!isSupabaseConfigured || cloudSaving ? jellyPrimaryButtonDisabled : jellyPrimaryButton),
                  width: '100%',
                  fontSize: iconOnlyNav ? 15 : 12,
                  padding: iconOnlyNav ? '10px 12px' : '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 8,
                }}
              >
                <span aria-hidden>☁️</span>
                {!iconOnlyNav && <span>{cloudSaving ? '업로드 중…' : 'Supabase 업로드'}</span>}
              </button>
              {!iconOnlyNav && cloudMsg ? (
                <div
                  style={{
                    marginTop: 8,
                    fontSize: 10,
                    lineHeight: 1.45,
                    color:
                      cloudMsg.tone === 'err'
                        ? '#FCA5A5'
                        : cloudMsg.tone === 'ok'
                          ? '#6EE7B7'
                          : '#FCD34D',
                  }}
                >
                  {cloudMsg.text}
                </div>
              ) : null}
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              title={sidebarCollapsed ? '패널 펼치기' : '패널 접기'}
              style={{
                marginTop: 10,
                padding: '10px 12px',
                border: '1px solid rgba(255,255,255,0.12)',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: JELLY.radiusControl,
                color: 'rgba(255,255,255,0.65)',
                cursor: 'pointer',
                fontSize: 14,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              {sidebarCollapsed ? '▶' : '◀'}
            </button>
          </>
        )}
        </nav>
      </div>
      {narrow && mobileMenuOpen ? (
        <>
          <div
            role="presentation"
            onClick={() => setMobileMenuOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 1000,
              background: 'rgba(0,0,0,0.45)',
            }}
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="앱 메뉴"
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              bottom: 0,
              width: 'min(320px, 88vw)',
              zIndex: 1001,
              background: '#1A1D21',
              boxShadow: '8px 0 32px rgba(0,0,0,0.35)',
              display: 'flex',
              flexDirection: 'column',
              padding: '20px 16px 24px',
              boxSizing: 'border-box',
            }}
          >
            <div
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                justifyContent: 'space-between',
                gap: 12,
                marginBottom: 24,
                flexShrink: 0,
              }}
            >
              <div>
                <div style={{ fontSize: 18, fontWeight: 700, color: '#F9FAFB', letterSpacing: '-0.02em' }}>
                  Jelly log
                </div>
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>부부 월 정산</div>
              </div>
              <button
                type="button"
                aria-label="닫기"
                onClick={() => setMobileMenuOpen(false)}
                style={{
                  width: 40,
                  height: 40,
                  flexShrink: 0,
                  borderRadius: JELLY.radiusControl,
                  border: '1px solid rgba(255,255,255,0.12)',
                  background: 'rgba(255,255,255,0.06)',
                  color: 'rgba(255,255,255,0.85)',
                  cursor: 'pointer',
                  fontSize: 20,
                  lineHeight: 1,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  padding: 0,
                }}
              >
                ×
              </button>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1, overflow: 'auto' }}>
              {NAV_ITEMS.map(({ to, label, icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  onClick={() => setMobileMenuOpen(false)}
                  style={({ isActive }) => ({
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '14px 14px',
                    borderRadius: JELLY.radiusControl,
                    textDecoration: 'none',
                    fontSize: 15,
                    fontWeight: isActive ? 600 : 500,
                    color: isActive ? '#FFFFFF' : 'rgba(255,255,255,0.75)',
                    background: isActive ? 'rgba(79, 140, 255, 0.28)' : 'rgba(255,255,255,0.04)',
                    border: isActive ? '1px solid rgba(79, 140, 255, 0.35)' : '1px solid transparent',
                    boxShadow: isActive ? '0 4px 16px rgba(0,0,0,0.2)' : 'none',
                    transition: 'color 0.15s ease, background 0.15s ease, border-color 0.15s ease',
                  })}
                >
                  <span style={{ fontSize: 22, lineHeight: 1 }}>{icon}</span>
                  <span>{label}</span>
                </NavLink>
              ))}
            </div>
          </div>
        </>
      ) : null}
      {narrow && cloudMsg ? (
        <div
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            fontSize: 11,
            lineHeight: 1.4,
            color:
              cloudMsg.tone === 'err'
                ? '#FCA5A5'
                : cloudMsg.tone === 'ok'
                  ? '#6EE7B7'
                  : '#FCD34D',
            background: 'rgba(15,23,42,0.35)',
            borderBottom: '1px solid rgba(255,255,255,0.06)',
          }}
        >
          {cloudMsg.text}
        </div>
      ) : null}
      <main
        style={{
          flex: 1,
          overflow: 'auto',
          padding: narrow ? '0 14px 24px' : '36px clamp(24px, 4vw, 48px)',
          background: 'transparent',
          minWidth: 0,
          minHeight: narrow ? 0 : undefined,
        }}
      >
        <div
          style={{
            maxWidth: 1200,
            margin: '0 auto',
            minHeight: '100%',
            minWidth: 0,
            paddingTop: narrow ? 16 : 0,
          }}
        >
          <Routes>
            <Route path="/" element={<DashboardPage />} />
            <Route path="/expense-plan" element={<ExpensePlanPage />} />
            <Route path="/account" element={<AccountPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
    </div>
  )
}

export default function App() {
  return (
    <HashRouter>
      <NarrowLayoutProvider>
        <AppShell />
      </NarrowLayoutProvider>
    </HashRouter>
  )
}
