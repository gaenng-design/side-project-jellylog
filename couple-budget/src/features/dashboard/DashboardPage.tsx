import { useMemo, useState, useEffect } from 'react'
import { DS } from '@/design-system/tokens'
import { DashboardYearCharts } from '@/features/dashboard/DashboardYearCharts'
import { DashboardSummaryCards } from '@/features/dashboard/DashboardSummaryCards'
import { DashboardAssetTrendChart } from '@/features/dashboard/DashboardAssetTrendChart'
import { DashboardSharedExpenseTrend } from '@/features/dashboard/DashboardSharedExpenseTrend'
import { useAppStore } from '@/store/useAppStore'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { Modal } from '@/components/Modal'
import { pageTitleH1Style, PRIMARY } from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'

/** 대시보드 위젯 정의 (커스텀 순서와 라벨) */
export const DASHBOARD_WIDGETS = [
  { key: 'summary', label: '이번 달 요약 카드', description: '총 자산 · 목표 · 공동 생활비 요약' },
  { key: 'assetTrend', label: '자산 변화 추이', description: '월별 총 자산 라인 차트' },
  { key: 'sharedTrend', label: '공동 생활비 추이', description: '월별 사용액 (카테고리별 스택)' },
  { key: 'income', label: '월별 수입', description: '연간 월별 수입 바 차트' },
  { key: 'fixedCategory', label: '연간 고정지출 카테고리 비중', description: '카테고리별 도넛 + 범례' },
  { key: 'investCumulative', label: '저축·투자 누적', description: '월별 누적 라인 차트' },
] as const

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGETS)[number]['key']

/** 위젯 표시 여부 조회 — 값이 없거나 true 면 표시 */
export function useDashboardWidgetVisible(key: DashboardWidgetKey): boolean {
  const map = useAppStore((s) => s.settings.dashboardWidgets)
  return map?.[key] !== false
}

/** 종합 요약 + 트렌드 시각화를 결합한 대시보드 */
export function DashboardPage() {
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const widgetsMap = settings.dashboardWidgets ?? {}
  const [customizeOpen, setCustomizeOpen] = useState(false)

  const initialYear = useMemo(() => {
    const y = Number(String(currentYearMonth).split('-')[0])
    return Number.isFinite(y) ? y : new Date().getFullYear()
  }, [currentYearMonth])

  const [year, setYear] = useState(initialYear)
  useEffect(() => {
    setYear(initialYear)
  }, [initialYear])

  const isVisible = (key: DashboardWidgetKey) => widgetsMap[key] !== false
  const toggle = (key: DashboardWidgetKey) => {
    const next = { ...widgetsMap, [key]: !isVisible(key) }
    updateSettings({ dashboardWidgets: next })
  }
  const showAll = () => {
    const next: Record<string, boolean> = {}
    for (const w of DASHBOARD_WIDGETS) next[w.key] = true
    updateSettings({ dashboardWidgets: next })
  }

  const yearChartsVisible =
    isVisible('income') || isVisible('fixedCategory') || isVisible('investCumulative')

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        minHeight: '100%',
        background: 'transparent',
        fontFamily: DS.font.family,
        color: DS.color.text.primary,
      }}
    >
      <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
        {/* 제목 + 연도 선택 */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
            marginBottom: 16,
          }}
        >
          <h1 style={{ ...pageTitleH1Style, margin: 0 }}>대시보드</h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <YearSelectDropdown value={year} onChange={setYear} variant="light" />
            <button
              type="button"
              onClick={() => setCustomizeOpen(true)}
              title="대시보드 커스텀"
              style={{
                height: 36,
                padding: '0 12px',
                borderRadius: JELLY.radiusControl,
                border: '1px solid #e5e7eb',
                background: '#fff',
                color: '#374151',
                fontSize: 12,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
                display: 'inline-flex',
                alignItems: 'center',
                gap: 4,
                whiteSpace: 'nowrap',
              }}
            >
              ⚙️ 커스텀
            </button>
          </div>
        </div>

        {/* 상단: 이번 달 한눈 요약 카드 */}
        {isVisible('summary') && (
          <div style={{ marginBottom: DS.grid.gutter }}>
            <DashboardSummaryCards />
          </div>
        )}

        {/* 자산 변화 추이 */}
        {isVisible('assetTrend') && (
          <div style={{ marginBottom: DS.grid.gutter }}>
            <DashboardAssetTrendChart year={year} />
          </div>
        )}

        {/* 공동 생활비 추이 */}
        {isVisible('sharedTrend') && (
          <div style={{ marginBottom: DS.grid.gutter }}>
            <DashboardSharedExpenseTrend year={year} />
          </div>
        )}

        {/* 하단: 연간 차트 (월별 수입, 고정지출 카테고리, 투자 누적) — 3개 중 하나라도 켜져 있을 때만 렌더 */}
        {yearChartsVisible && <DashboardYearCharts />}

        {/* 모든 위젯이 꺼진 상태 안내 */}
        {!isVisible('summary') && !isVisible('assetTrend') && !isVisible('sharedTrend') && !yearChartsVisible && (
          <div
            style={{
              padding: '48px 24px',
              textAlign: 'center',
              background: '#f9fafb',
              borderRadius: 12,
              color: '#6b7280',
              fontSize: 14,
              lineHeight: 1.6,
            }}
          >
            표시할 위젯이 없습니다.
            <br />
            우측 상단 <strong>⚙️ 커스텀</strong> 버튼에서 표시할 위젯을 선택하세요.
          </div>
        )}
      </div>

      {/* 커스텀 모달 */}
      <Modal open={customizeOpen} title="대시보드 커스텀" onClose={() => setCustomizeOpen(false)}>
        <p style={{ fontSize: 13, color: '#6b7280', margin: '0 0 16px', lineHeight: 1.5 }}>
          대시보드에 표시할 위젯을 선택하세요.
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {DASHBOARD_WIDGETS.map((w) => {
            const on = isVisible(w.key)
            return (
              <label
                key={w.key}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 12,
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: on ? 'rgba(79, 140, 255, 0.06)' : '#fff',
                  border: `1px solid ${on ? 'rgba(79, 140, 255, 0.25)' : '#e5e7eb'}`,
                  cursor: 'pointer',
                  transition: 'background 0.15s, border 0.15s',
                }}
              >
                <input
                  type="checkbox"
                  checked={on}
                  onChange={() => toggle(w.key)}
                  style={{ width: 16, height: 16, marginTop: 2, cursor: 'pointer', flexShrink: 0 }}
                />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: on ? PRIMARY : '#111827' }}>
                    {w.label}
                  </div>
                  <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>
                    {w.description}
                  </div>
                </div>
              </label>
            )
          })}
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={showAll}
            style={{
              padding: '8px 14px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              background: '#fff',
              fontSize: 13,
              color: '#374151',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            전체 표시
          </button>
          <button
            type="button"
            onClick={() => setCustomizeOpen(false)}
            style={{
              padding: '8px 16px',
              borderRadius: JELLY.radiusControl,
              border: 'none',
              background: PRIMARY,
              color: '#fff',
              fontSize: 13,
              fontWeight: 600,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            완료
          </button>
        </div>
      </Modal>
    </div>
  )
}
