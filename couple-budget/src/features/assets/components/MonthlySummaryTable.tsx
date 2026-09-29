import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { jellyCardStyle } from '@/styles/jellyGlass'
import { fmtMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'

/** 전체 탭: 최근 12개월 자산 현황 표 */
export function MonthlySummaryTable({ model }: { model: AssetModel }) {
  const { currentYear, currentMonth, sortedItems, getProjectedValue, getPnl, getSavingsCumulativeInterest } = model
  // 최근 12개월 (현재 포함)
  const summaryMonths: { yr: number; mi: number; label: string }[] = []
  for (let offset = 11; offset >= 0; offset--) {
    let yr = currentYear
    let mi = currentMonth - offset
    while (mi < 0) { mi += 12; yr-- }
    const label = `${yr}년 ${mi + 1}월`
    summaryMonths.push({ yr, mi, label })
  }
  const summaryTotals = summaryMonths.map(({ yr, mi }) =>
    sortedItems
      .filter((item) => ASSET_CATEGORIES.includes(item.category))
      .reduce((sum, item) => sum + getProjectedValue(yr, item, mi), 0)
  )
  // 원금 대비 수익: 투자 P&L + 저축 누적 이자
  const summaryGains = summaryMonths.map(({ yr, mi }) => {
    const investPnl = sortedItems
      .filter((item) => item.category === '투자')
      .reduce((sum, item) => sum + getPnl(item, yr, mi), 0)
    const savingsInterest = sortedItems
      .filter((item) => item.category === '저축')
      .reduce((sum, item) => sum + getSavingsCumulativeInterest(item, yr, mi), 0)
    return investPnl + savingsInterest
  })
  return (
    <div style={{ marginBottom: 16, ...jellyCardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: 13, color: '#111827', borderBottom: '1px solid #e5e7eb', background: '#fff' }}>
        월별 자산 현황
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
          <thead>
            <tr style={{ background: '#f3f4f6' }}>
              <th style={{ padding: '6px 12px', textAlign: 'left', color: '#6b7280', fontWeight: 500, minWidth: 80 }}>월</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 500, minWidth: 90 }}>총 자산</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 500, minWidth: 80 }}>전월 대비</th>
              <th style={{ padding: '6px 12px', textAlign: 'right', color: '#6b7280', fontWeight: 500, minWidth: 90 }}>원금 대비 수익</th>
            </tr>
          </thead>
          <tbody>
            {summaryMonths.map(({ label }, idx) => {
              const total = summaryTotals[idx]
              const prev = idx > 0 ? summaryTotals[idx - 1] : null
              const delta = prev !== null ? total - prev : null
              const gain = summaryGains[idx]
              const gainColor = gain === 0 ? '#9ca3af' : gain > 0 ? '#059669' : '#dc2626'
              const isCurrentMonth = idx === summaryMonths.length - 1
              return (
                <tr key={label} style={{ borderTop: '1px solid #e5e7eb', background: isCurrentMonth ? '#eff6ff' : undefined }}>
                  <td style={{ padding: '6px 12px', color: isCurrentMonth ? '#1d4ed8' : '#374151', fontWeight: isCurrentMonth ? 600 : 400 }}>
                    {label}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', fontWeight: 600, color: '#111827' }}>
                    {fmtMan(Math.round(total / 10000))}원
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', color: delta === null ? '#9ca3af' : delta >= 0 ? '#059669' : '#dc2626', fontWeight: 500 }}>
                    {delta === null ? '—' : `${delta >= 0 ? '+' : ''}${fmtMan(Math.round(Math.abs(delta / 10000)))}원`}
                  </td>
                  <td style={{ padding: '6px 12px', textAlign: 'right', color: gainColor, fontWeight: 600 }}>
                    {gain === 0 ? '—' : `${gain > 0 ? '+' : ''}${fmtMan(Math.round(gain / 10000))}원`}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
