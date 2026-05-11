import { useState, useEffect } from 'react'
import { HashRouter, Routes, Route, NavLink, useLocation } from 'react-router-dom'
import { ExpensePlanPage } from '@/features/expense-plan/ExpensePlanPage'
import { DashboardPage } from '@/features/dashboard/DashboardPage'
import { SettingsPage } from '@/features/settings/SettingsPage'
import { AssetPage } from '@/features/assets/AssetPage'
import { SharedExpensePage } from '@/features/sharedExpense/SharedExpensePage'
import { PasswordProtection } from '@/features/auth/PasswordProtection'
import {
  JELLY,
  jellyFontStack,
  jellyShellBackground,
  jellySidebarShell,
  jellyPrimaryButton,
  jellyPrimaryButtonDisabled,
} from '@/styles/jellyGlass'
import { NarrowLayoutProvider, useNarrowLayout } from '@/context/NarrowLayoutContext'
import { MobileSnackbar } from '@/components/MobileSnackbar'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { useAssetStore } from '@/store/useAssetStore'
import { useSharedExpenseStore } from '@/store/useSharedExpenseStore'
import { GitHubDataSync } from '@/services/github-sync'

const saveIcon = '💾'
const syncIcon = '🔄'
const syncDoneIcon = '✅'

const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/expense-plan', label: '지출 계획', icon: '📋' },
  { to: '/assets', label: '자산', icon: '💰' },
  { to: '/shared-expense', label: '공동 생활비', icon: '🏠' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

function AppShell() {
  const narrow = useNarrowLayout()
  const location = useLocation()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [syncing, setSyncing] = useState(false)
  const [syncComplete, setSyncComplete] = useState(false)
  const sidebarWidth = sidebarCollapsed ? 56 : 220
  const iconOnlyNav = narrow || sidebarCollapsed

  const handleSave = async () => {
    setSaveMessage(null)
    setSaving(true)
    setSyncComplete(false)  // 저장 시 동기화 상태 리셋

    try {
      const config = GitHubDataSync.loadConfig()
      if (!config) {
        setSaveMessage({ tone: 'err', text: 'GitHub 설정이 필요합니다' })
        setSaving(false)
        return
      }

      // Collect current state from all stores
      const appState = useAppStore.getState()
      const fixedState = useFixedTemplateStore.getState()
      const investState = useInvestTemplateStore.getState()
      const planState = usePlanExtraStore.getState()
      const settlementState = useSettlementStore.getState()
      const assetState = useAssetStore.getState()
      const sharedExpenseState = useSharedExpenseStore.getState()

      // localStorage repository 데이터 (월별 실제 수입/지출 항목들)
      const readRepo = (key: string): unknown[] => {
        try {
          const raw = localStorage.getItem(`couple-budget:repo:${key}`)
          return raw ? JSON.parse(raw) : []
        } catch {
          return []
        }
      }
      const incomeItems = readRepo('incomes')
      const fixedExpenseItems = readRepo('fixed_expenses')
      const investmentItems = readRepo('investments')
      const separateItemList = readRepo('separate_items')

      const data = {
        assets: {
          items: assetState.items,
          entries: assetState.entries,
        },
        sharedExpense: {
          items: sharedExpenseState.items,
          entries: sharedExpenseState.entries,
          categories: sharedExpenseState.categories,
          categoryColors: sharedExpenseState.categoryColors,
        },
        expenses: {
          // 고정지출 템플릿 (전역 + 월별 데이터)
          fixedTemplates: fixedState.templates,
          fixedExclusions: fixedState.exclusions,
          fixedMonthlyAmounts: fixedState.monthlyAmounts,
          fixedMonthlySeparations: fixedState.monthlySeparations,
          // 투자 템플릿 (전역 + 월별 데이터)
          investTemplates: investState.templates,
          investExclusions: investState.exclusions,
          investMonthlyAmounts: investState.monthlyAmounts,
          // 월별 추가/별도 지출 데이터
          planExtra: {
            extraRowsByMonth: planState.extraRowsByMonth,
            separateExpenseRowsByMonth: planState.separateExpenseRowsByMonth,
            templateSnapshotsByMonth: planState.templateSnapshotsByMonth,
            defaultSalaryExcludedByMonth: planState.defaultSalaryExcludedByMonth,
          },
          // 월별 실제 항목 (repository localStorage 데이터)
          fixedExpenseItems,
          investmentItems,
          separateItems: separateItemList,
        },
        incomes: {
          // 월별 실제 수입 항목 (repository localStorage 데이터)
          items: incomeItems,
        },
        settlements: {
          settlements: settlementState.settlements,
          transfers: settlementState.transfers,
        },
        metadata: {
          app: appState,
          lastUpdated: new Date().toISOString(),
        },
      }

      const sync = new GitHubDataSync(config)
      const now = new Date()
      const message = `Update from couple-budget app - ${now.toLocaleString('ko-KR')}`
      const result = await sync.push(data, message)

      if (!result.ok) {
        setSaveMessage({ tone: 'err', text: result.error || 'GitHub 저장 실패' })
        setSaving(false)
        return
      }

      setSaveMessage({ tone: 'ok', text: '저장되었습니다' })
      setTimeout(() => setSaveMessage(null), 2000)
    } catch (error) {
      setSaveMessage({
        tone: 'err',
        text: `오류: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setSaving(false)
    }
  }

  const handleSync = async () => {
    setSyncing(true)
    setSyncComplete(false)
    setSaveMessage(null)

    try {
      const config = GitHubDataSync.loadConfig()
      if (!config) {
        setSaveMessage({ tone: 'err', text: '동기화 설정이 필요합니다' })
        setSyncing(false)
        return
      }

      const sync = new GitHubDataSync(config)
      const result = await sync.pull()

      if (result.ok && result.data) {
        // localStorage repository에 직접 저장하는 헬퍼
        const writeRepo = (key: string, items: unknown) => {
          if (!Array.isArray(items)) return
          try {
            localStorage.setItem(`couple-budget:repo:${key}`, JSON.stringify(items))
          } catch (e) {
            console.warn(`Failed to write repo ${key}:`, e)
          }
        }

        // GitHub에서 가져온 데이터를 각 store에 로드
        if (result.data.assets) {
          const assetData = result.data.assets as any
          if (assetData.items) useAssetStore.setState({ items: assetData.items })
          if (assetData.entries) useAssetStore.setState({ entries: assetData.entries })
        }

        // 공동 생활비 데이터 복원
        if ((result.data as any).sharedExpense) {
          const sharedData = (result.data as any).sharedExpense
          if (sharedData.items) useSharedExpenseStore.setState({ items: sharedData.items })
          if (sharedData.entries) useSharedExpenseStore.setState({ entries: sharedData.entries })
          if (sharedData.categories) useSharedExpenseStore.setState({ categories: sharedData.categories })
          if (sharedData.categoryColors) useSharedExpenseStore.setState({ categoryColors: sharedData.categoryColors })
        }

        if (result.data.expenses) {
          const expenseData = result.data.expenses as any
          // 고정지출 템플릿 (전역 + 월별 데이터)
          if (expenseData.fixedTemplates) useFixedTemplateStore.setState({ templates: expenseData.fixedTemplates })
          if (expenseData.fixedExclusions) useFixedTemplateStore.setState({ exclusions: expenseData.fixedExclusions })
          if (expenseData.fixedMonthlyAmounts) useFixedTemplateStore.setState({ monthlyAmounts: expenseData.fixedMonthlyAmounts })
          if (expenseData.fixedMonthlySeparations) useFixedTemplateStore.setState({ monthlySeparations: expenseData.fixedMonthlySeparations })
          // 투자 템플릿 (전역 + 월별 데이터)
          if (expenseData.investTemplates) useInvestTemplateStore.setState({ templates: expenseData.investTemplates })
          if (expenseData.investExclusions) useInvestTemplateStore.setState({ exclusions: expenseData.investExclusions })
          if (expenseData.investMonthlyAmounts) useInvestTemplateStore.setState({ monthlyAmounts: expenseData.investMonthlyAmounts })
          // 월별 추가/별도 지출 데이터
          if (expenseData.planExtra) usePlanExtraStore.setState(expenseData.planExtra)
          // 월별 실제 항목 (repository localStorage 데이터)
          if (expenseData.fixedExpenseItems) writeRepo('fixed_expenses', expenseData.fixedExpenseItems)
          if (expenseData.investmentItems) writeRepo('investments', expenseData.investmentItems)
          if (expenseData.separateItems) writeRepo('separate_items', expenseData.separateItems)
        }

        if (result.data.incomes) {
          const incomeData = result.data.incomes as any
          // 월별 실제 수입 항목 (repository localStorage 데이터)
          if (incomeData.items) writeRepo('incomes', incomeData.items)
        }

        if (result.data.settlements) {
          const settlementData = result.data.settlements as any
          if (settlementData.settlements) useSettlementStore.setState({ settlements: settlementData.settlements })
          if (settlementData.transfers) useSettlementStore.setState({ transfers: settlementData.transfers })
        }

        if (result.data.metadata && result.data.metadata.app) {
          useAppStore.setState(result.data.metadata.app)
        }

        setSyncComplete(true)
        setSaveMessage({ tone: 'ok', text: '동기화 완료 - 페이지 새로고침 중...' })
        // repository는 인스턴스화 시 localStorage를 읽기 때문에 새로고침이 필요
        setTimeout(() => {
          window.location.reload()
        }, 800)
      } else {
        setSaveMessage({ tone: 'err', text: result.error || '동기화 실패' })
      }
    } catch (error) {
      setSaveMessage({
        tone: 'err',
        text: `동기화 오류: ${error instanceof Error ? error.message : String(error)}`
      })
      console.error('동기화 실패:', error)
    } finally {
      setSyncing(false)
    }
  }

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
        position: 'relative',
      }}
    >
      {saving && (
        <>
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              height: 3,
              background: 'linear-gradient(90deg, #3b82f6 0%, #60a5fa 50%, #3b82f6 100%)',
              animation: 'progress 1.5s ease-in-out infinite',
              zIndex: 10000,
            }}
          />
          <style>{`
            @keyframes progress {
              0% { width: 0%; }
              30% { width: 70%; }
              100% { width: 100%; }
            }
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}</style>
        </>
      )}
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
            /* narrow 높이(≈65px) 바꾸면 MobileSnackbar 의 MOBILE_GNB_HEIGHT_PX 도 맞출 것 */
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
            <div style={{ display: 'flex', gap: 8, marginLeft: 'auto' }}>
              <button
                type="button"
                onClick={() => void handleSync()}
                disabled={syncing}
                title="동기화"
                style={{
                  flexShrink: 0,
                  padding: '8px 12px',
                  border: '1px solid #FFFFFF',
                  background: '#0F1419',
                  borderRadius: JELLY.radiusControl,
                  color: '#FFFFFF',
                  cursor: syncing ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: syncing ? 0.6 : 1,
                  transition: 'all 0.2s',
                  minHeight: 44,
                }}
              >
                <span
                  style={{
                    fontSize: 20,
                    display: 'inline-block',
                    animation: syncing ? 'spin 1s linear infinite' : 'none',
                  }}
                >
                  {syncComplete ? syncDoneIcon : syncIcon}
                </span>
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                title="GitHub에 저장"
                style={{
                  flexShrink: 0,
                  padding: '8px 12px',
                  border: 'none',
                  background: saving ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.8)',
                  borderRadius: JELLY.radiusControl,
                  color: '#fff',
                  cursor: saving ? 'not-allowed' : 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 4,
                  opacity: saving ? 0.6 : 1,
                  transition: 'all 0.2s',
                  minHeight: 44,
                }}
              >
                <span style={{ fontSize: 20, display: 'inline-block' }}>{saveIcon}</span>
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
                  <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>승윤 & 경은</div>
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
                gap: 8,
                flexShrink: 0,
                width: '100%',
              }}
            >
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <button
                  type="button"
                  onClick={() => void handleSync()}
                  disabled={syncing}
                  title="동기화"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: '1px solid #FFFFFF',
                    background: '#0F1419',
                    borderRadius: JELLY.radiusControl,
                    color: '#FFFFFF',
                    cursor: syncing ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: syncing ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <span
                    style={{
                      fontSize: 16,
                      display: 'inline-block',
                      lineHeight: 1,
                      animation: syncing ? 'spin 1s linear infinite' : 'none',
                    }}
                  >
                    {syncComplete ? syncDoneIcon : syncIcon}
                  </span>
                  {!iconOnlyNav && <span>{syncing ? '중…' : '동기화'}</span>}
                </button>
                <button
                  type="button"
                  onClick={() => void handleSave()}
                  disabled={saving}
                  title="GitHub에 저장"
                  style={{
                    flex: 1,
                    padding: '10px 12px',
                    border: 'none',
                    background: saving ? 'rgba(59, 130, 246, 0.5)' : 'rgba(59, 130, 246, 0.8)',
                    borderRadius: JELLY.radiusControl,
                    color: '#fff',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: 6,
                    opacity: saving ? 0.6 : 1,
                    transition: 'all 0.2s',
                  }}
                >
                  <span style={{ fontSize: 16, display: 'inline-block' }}>{saveIcon}</span>
                  {!iconOnlyNav && <span>{saving ? '중…' : '저장하기'}</span>}
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setSidebarCollapsed((c) => !c)}
              title={sidebarCollapsed ? '패널 펼치기' : '패널 접기'}
              style={{
                marginTop: 8,
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
                <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.45)', marginTop: 4 }}>승윤 & 경은</div>
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
            <Route path="/assets" element={<AssetPage />} />
            <Route path="/shared-expense" element={<SharedExpensePage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </div>
      </main>
      <MobileSnackbar
        open={saveMessage !== null}
        tone={saveMessage?.tone || 'ok'}
        text={saveMessage?.text || ''}
        onClose={() => setSaveMessage(null)}
      />
    </div>
  )
}

export default function App() {
  return (
    <PasswordProtection>
      <HashRouter>
        <NarrowLayoutProvider>
          <AppShell />
        </NarrowLayoutProvider>
      </HashRouter>
    </PasswordProtection>
  )
}
