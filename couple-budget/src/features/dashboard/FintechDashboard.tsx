import { DS } from '@/design-system/tokens'
import { DashboardYearCharts } from '@/features/dashboard/DashboardYearCharts'
import { pageTitleH1Style } from '@/styles/formControls'

export function FintechDashboard() {
  const grid = {
    display: 'grid',
    gridTemplateColumns: `repeat(${DS.grid.columns}, 1fr)`,
    gap: DS.grid.gutter,
    width: '100%',
    maxWidth: DS.grid.maxWidth,
    margin: '0 auto',
    /* App main 패딩과 겹치지 않도록 좌우·상단 여백 제거(지출 계획과 동일한 콘텐츠 박스) */
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
