import { useMemo, useState, useEffect } from 'react'
import { DS } from '@/design-system/tokens'
import { DashboardYearCharts } from '@/features/dashboard/DashboardYearCharts'
import { DashboardSummaryCards } from '@/features/dashboard/DashboardSummaryCards'
import { DashboardAssetTrendChart } from '@/features/dashboard/DashboardAssetTrendChart'
import { DashboardSharedExpenseTrend } from '@/features/dashboard/DashboardSharedExpenseTrend'
import { useAppStore } from '@/store/useAppStore'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { pageTitleH1Style } from '@/styles/formControls'

/** 종합 요약 + 트렌드 시각화를 결합한 대시보드 */
export function DashboardPage() {
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const initialYear = useMemo(() => {
    const y = Number(String(currentYearMonth).split('-')[0])
    return Number.isFinite(y) ? y : new Date().getFullYear()
  }, [currentYearMonth])

  const [year, setYear] = useState(initialYear)
  useEffect(() => {
    setYear(initialYear)
  }, [initialYear])

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
          <YearSelectDropdown value={year} onChange={setYear} variant="light" />
        </div>

        {/* 상단: 이번 달 한눈 요약 카드 (4개) */}
        <div style={{ marginBottom: DS.grid.gutter }}>
          <DashboardSummaryCards />
        </div>

        {/* 중단: 자산 변화 추이 */}
        <div style={{ marginBottom: DS.grid.gutter }}>
          <DashboardAssetTrendChart year={year} />
        </div>

        {/* 공동 생활비 추이 */}
        <div style={{ marginBottom: DS.grid.gutter }}>
          <DashboardSharedExpenseTrend year={year} />
        </div>

        {/* 하단: 기존 연간 차트 (월별 수입, 고정지출 카테고리, 투자 누적) */}
        <DashboardYearCharts />
      </div>
    </div>
  )
}
