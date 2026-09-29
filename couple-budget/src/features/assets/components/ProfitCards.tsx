import { jellyCardStyle } from '@/styles/jellyGlass'
import type { AssetItem } from '@/types'
import { fmtMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'

/** 전체 탭: 수익 현황 (투자 손익 · 저축 만기 예상 이자) */
export function ProfitCards({ model }: { model: AssetModel }) {
  const { currentYear, currentMonth, sortedItems, getProjectedValue, getMaturity, getPnl } = model
  // 투자 항목 손익
  const investItems = sortedItems.filter((i) => i.category === '투자')
  // 저축 만기 예상 이자 (만기일 + 이율 있는 적금·예금) — 공용 calcMaturity 사용
  const savingsMaturityItems = sortedItems
    .filter((i) => i.category === '저축')
    .map((item) => ({ item, result: getMaturity(item) }))
    .filter((x): x is { item: AssetItem; result: NonNullable<typeof x.result> } => x.result !== null && x.result.principal > 0)
    .sort((a, b) => a.item.maturityDate!.localeCompare(b.item.maturityDate!))
  const savingsWithMaturity = savingsMaturityItems.map((x) => x.item)
  const totalMaturityInterest = savingsMaturityItems.reduce((sum, x) => sum + x.result.interest, 0)
  if (investItems.length === 0 && savingsWithMaturity.length === 0) return null
  // 투자 전체 합산
  const totalInvestPnl = investItems.reduce((s, item) => s + getPnl(item, currentYear, currentMonth), 0)
  const totalInvestBasis = investItems.reduce((s, item) => {
    const bal = getProjectedValue(currentYear, item, currentMonth)
    return s + (bal - getPnl(item, currentYear, currentMonth))
  }, 0)
  const totalInvestPnlPct = totalInvestBasis !== 0 ? Math.round((totalInvestPnl / totalInvestBasis) * 1000) / 10 : 0
  const investPnlColor = totalInvestPnl === 0 ? '#6b7280' : totalInvestPnl > 0 ? '#059669' : '#dc2626'
  const savingsMaturityColor = totalMaturityInterest > 0 ? '#059669' : '#6b7280'
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 10 }}>수익 현황</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {/* 총 투자 수익 카드 */}
        {investItems.length > 0 && (
          <div style={{
            ...jellyCardStyle,
            padding: '14px 16px',
            flex: '1 1 180px',
            minWidth: 160,
            border: totalInvestPnl !== 0 ? `1.5px solid ${totalInvestPnl > 0 ? '#a7f3d0' : '#fca5a5'}` : undefined,
          }}>
            <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>총 투자 수익</div>
            <div style={{ fontSize: 22, fontWeight: 700, color: investPnlColor, marginBottom: 6 }}>
              {totalInvestPnl === 0 ? '—' : `${totalInvestPnl > 0 ? '+' : ''}${fmtMan(Math.round(totalInvestPnl / 10000))}원`}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f3f4f6' }}>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>원금</span>
              <span style={{ fontSize: 11, color: '#374151' }}>{fmtMan(Math.round(totalInvestBasis / 10000))}원</span>
            </div>
            {totalInvestPnlPct !== 0 && (
              <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
                <span style={{ fontSize: 11, color: '#9ca3af' }}>수익률</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: investPnlColor }}>{totalInvestPnlPct > 0 ? '+' : ''}{totalInvestPnlPct}%</span>
              </div>
            )}
          </div>
        )}
        {/* 저축 수익 (만기 예상 이자) 카드 */}
        {savingsWithMaturity.length > 0 && (() => {
          return (
            <div style={{
              ...jellyCardStyle,
              padding: '14px 16px',
              flex: '1 1 200px',
              minWidth: 200,
              border: totalMaturityInterest > 0 ? '1.5px solid #a7f3d0' : undefined,
            }}>
              <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 6 }}>저축 수익 (만기 예상 이자)</div>
              <div style={{ fontSize: 22, fontWeight: 700, color: savingsMaturityColor, marginBottom: 10 }}>
                {totalMaturityInterest === 0 ? '—' : `+${fmtMan(Math.round(totalMaturityInterest / 10000))}원`}
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {savingsMaturityItems.map(({ item, result }) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: 11, color: '#374151', fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      <span style={{ fontSize: 10, color: '#9ca3af' }}>{item.maturityDate}</span>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#059669', flexShrink: 0 }}>+{fmtMan(Math.round(result.interest / 10000))}원</span>
                  </div>
                ))}
              </div>
            </div>
          )
        })()}
      </div>
    </div>
  )
}
