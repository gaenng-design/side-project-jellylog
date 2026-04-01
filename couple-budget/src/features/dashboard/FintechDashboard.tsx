import { DS } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { Button } from '@/design-system/components/Button'
import { DashboardYearCharts } from '@/features/dashboard/DashboardYearCharts'

export function FintechDashboard() {
  const grid = {
    display: 'grid',
    gridTemplateColumns: `repeat(${DS.grid.columns}, 1fr)`,
    gap: DS.grid.gutter,
    width: '100%',
    maxWidth: DS.grid.maxWidth,
    margin: '0 auto',
    padding: `0 ${DS.grid.margin}px ${DS.grid.margin}px`,
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
        {/* Header — 전체를 카드로 */}
        <div style={{ padding: `${DS.grid.margin}px ${DS.grid.margin}px ${DS.space[4]}px` }}>
          <Card variant="data" padding={5} hoverLift={false} style={{ boxShadow: DS.shadow[2] }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: DS.space[5],
                flexWrap: 'wrap',
              }}
            >
              <div style={{ flex: '1 1 200px', minWidth: 0 }}>
                <div style={{ fontSize: DS.font.title2.size, fontWeight: DS.font.title2.weight, color: DS.color.text.primary }}>
                  안녕하세요, 함께 쓰는 지갑
                </div>
                <div style={{ fontSize: DS.font.body.size, color: DS.color.text.secondary, marginTop: 6 }}>
                  연도별 수입과 저축·투자 누적을 확인하세요.
                </div>
              </div>
              <div style={{ flex: '1 1 240px', maxWidth: 400 }}>
                <input
                  type="search"
                  placeholder="거래·항목 검색"
                  aria-label="검색"
                  style={{
                    width: '100%',
                    height: 44,
                    padding: '0 16px',
                    borderRadius: 12,
                    border: 'none',
                    background: DS.color.bg.tertiary,
                    boxShadow: DS.shadow[1],
                    fontSize: DS.font.body.size,
                    fontFamily: DS.font.family,
                    color: DS.color.text.primary,
                    outline: 'none',
                  }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: DS.space[3] }}>
                <Button variant="ghost" style={{ height: 44, padding: '0 12px' }}>
                  알림
                </Button>
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    background: DS.color.primarySoft,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontWeight: 700,
                    color: DS.color.primary,
                    boxShadow: DS.shadow[1],
                  }}
                >
                  나
                </div>
              </div>
            </div>
          </Card>
        </div>

        <div style={grid}>
          <DashboardYearCharts />
        </div>
      </div>
    </div>
  )
}
