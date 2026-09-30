import { jellyCardStyle } from '@/styles/jellyGlass'
import type { AssetItem } from '@/types'
import { fmtMan, fmtWonAsMan, fmtSignedMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { AfterTaxToggle } from './AfterTaxToggle'
import { DS } from '@/design-system/tokens'
import { StatCard, InfoRow } from '@/design-system/components'

/** 전체 탭: 수익 현황 (투자 손익 · 저축 만기 예상 이자) */
export function ProfitCards({ model }: { model: AssetModel }) {
  const { currentYear, currentMonth, sortedItems, getProjectedValue, getMaturity, getPnl, interestAfterTax } = model
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
  const investPnlColor = totalInvestPnl === 0 ? DS.color.text.secondary : totalInvestPnl > 0 ? DS.color.positive.main : DS.color.negative.main
  const savingsMaturityColor = totalMaturityInterest > 0 ? DS.color.positive.main : DS.color.text.secondary
  return (
    <div style={{ marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 10 }}>
        <div style={{ fontWeight: 700, fontSize: DS.font.size.body, color: DS.color.text.primary }}>수익 현황</div>
        {savingsMaturityItems.length > 0 && <AfterTaxToggle model={model} />}
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10 }}>
        {/* 총 투자 수익 카드 */}
        {investItems.length > 0 && (
          <StatCard
            label="총 투자 수익"
            value={fmtSignedMan(totalInvestPnl)}
            valueColor={investPnlColor}
            tone={totalInvestPnl > 0 ? 'positive' : totalInvestPnl < 0 ? 'negative' : 'neutral'}
            style={{ flex: '1 1 180px', minWidth: 160 }}
          >
            <div style={{ marginTop: 8, paddingTop: 8, borderTop: `1px solid ${DS.color.border.subtle}` }}>
              <InfoRow label="원금" value={fmtWonAsMan(totalInvestBasis)} />
              {totalInvestPnlPct !== 0 && (
                <InfoRow label="수익률" value={`${totalInvestPnlPct > 0 ? '+' : ''}${totalInvestPnlPct}%`} valueColor={investPnlColor} />
              )}
            </div>
          </StatCard>
        )}
        {/* 저축 수익 (만기 예상 이자) 카드 */}
        {savingsWithMaturity.length > 0 && (() => {
          return (
            <div style={{
              ...jellyCardStyle,
              padding: '14px 16px',
              flex: '1 1 200px',
              minWidth: 200,
              border: totalMaturityInterest > 0 ? `1.5px solid ${DS.color.positive.border}` : undefined,
            }}>
              <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, marginBottom: 6 }}>저축 수익 (만기 예상 이자{interestAfterTax ? ' · 세후' : ''})</div>
              <div style={{ fontSize: DS.font.size.headline, fontWeight: 700, color: savingsMaturityColor, marginBottom: 10 }}>
                {totalMaturityInterest === 0 ? '—' : `+${fmtMan(Math.round(totalMaturityInterest / 10000))}원`}
              </div>
              <div style={{ borderTop: `1px solid ${DS.color.bg.muted}`, paddingTop: 8, display: 'flex', flexDirection: 'column', gap: 6 }}>
                {savingsMaturityItems.map(({ item, result }) => (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
                      <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.body, fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                      <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted }}>{item.maturityDate}</span>
                    </div>
                    <span style={{ fontSize: DS.font.size.caption, fontWeight: 600, color: DS.color.positive.main, flexShrink: 0 }}>+{fmtMan(Math.round(result.interest / 10000))}원</span>
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
