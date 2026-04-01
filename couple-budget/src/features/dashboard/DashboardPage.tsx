import { DS } from '@/design-system/tokens'
import { DashboardYearCharts } from '@/features/dashboard/DashboardYearCharts'
import { pageTitleH1Style } from '@/styles/formControls'

/** 디자인 토큰 기반 대시보드(카드·차트 그리드) */
export function DashboardPage() {
  const grid = {
    display: 'grid',
    gridTemplateColumns: `repeat(${DS.grid.columns}, 1fr)`,
    gap: DS.grid.gutter,
    width: '100%',
    maxWidth: DS.grid.maxWidth,
    margin: '0 auto',
    padding: `0 0 ${DS.grid.margin}px`,
    boxSizing: 'border-box' as const,
  }

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
        <h1 style={{ ...pageTitleH1Style, marginBottom: 12 }}>대시보드</h1>
        <div style={grid}>
          <DashboardYearCharts />
        </div>
      </div>
    </div>
  )
}
