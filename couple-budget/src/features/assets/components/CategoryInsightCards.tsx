import { jellyCardStyle } from '@/styles/jellyGlass'
import { daysUntil } from '@/lib/assetCalc'
import type { AssetItem } from '@/types'
import { fmtWonAsMan, fmtSignedMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { AfterTaxToggle } from './AfterTaxToggle'
import { DS } from '@/design-system/tokens'
import { InfoRow } from '@/design-system/components'

/** 카테고리 탭 인사이트 카드 — 명의별 (저축: 만기 수령액, 투자: 수익률) */
export function CategoryInsightCards({ model, categoryFilter, filteredItems }: { model: AssetModel; categoryFilter: string; filteredItems: AssetItem[] }) {
  const { currentYear, currentMonth, personAName, personBName, getPersonColor, getProjectedValue, getMaturity, getPnl, getInvestMetrics, interestAfterTax } = model
  const isInsightCategory = categoryFilter === '저축' || categoryFilter === '투자'
  if (!isInsightCategory) return null

  const insightItems = filteredItems.filter((item) => {
    if (item.category === '저축') {
      if (item.savingsType === 'subscription') return getProjectedValue(currentYear, item, currentMonth) > 0
      return !!(item.maturityDate || item.interestRate)
    }
    if (item.category === '투자') return getProjectedValue(currentYear, item, currentMonth) > 0
    return false
  })
  if (insightItems.length === 0) return null

  const personsOrder: Array<'A' | 'B' | undefined> = (['A', 'B', undefined] as const).filter(
    (p) => insightItems.some((i) => i.person === p)
  )

  return (
    <>
      {categoryFilter === '저축' && insightItems.some((i) => i.interestRate && i.maturityDate) && (
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
          <AfterTaxToggle model={model} />
        </div>
      )}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 16 }}>
        {personsOrder.map((personKey) => {
          const groupItems = insightItems.filter((i) => i.person === personKey)
          if (groupItems.length === 0) return null
          const groupLabel = personKey === 'A' ? personAName : personKey === 'B' ? personBName : '공유'
          const groupColor = personKey ? getPersonColor(personKey) : DS.color.text.muted

          if (categoryFilter === '저축') {
            const totalBalance = groupItems.reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0)
            let totalMaturityInterest = 0
            let totalMaturityAmount = 0
            groupItems.forEach((item) => {
              const result = getMaturity(item)
              if (!result) {
                // 만기일·이율이 없는 항목은 현재 잔액을 그대로 수령액에 포함
                totalMaturityAmount += getProjectedValue(currentYear, item, currentMonth)
                return
              }
              totalMaturityInterest += result.interest
              totalMaturityAmount += result.amount
            })
            const withMaturity = groupItems
              .filter((i) => i.maturityDate)
              .sort((a, b) => a.maturityDate!.localeCompare(b.maturityDate!))
            const nearestMaturity = withMaturity[0]?.maturityDate
            const nearestDday = nearestMaturity ? daysUntil(nearestMaturity) : null
            return (
              <div
                key={String(personKey)}
                style={{ ...jellyCardStyle, padding: '14px 16px', flex: '1 1 200px', minWidth: 180 }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: groupColor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: DS.font.size.caption, fontWeight: 700, color: groupColor }}>{groupLabel}</span>
                  <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, marginLeft: 'auto' }}>{groupItems.length}개 항목</span>
                </div>
                <InfoRow label="현재 잔액" value={fmtWonAsMan(totalBalance)} />
                {totalMaturityInterest > 0 && (
                  <InfoRow
                    label={`만기 예상 이자${interestAfterTax ? ' (세후)' : ''}`}
                    value={`+${fmtWonAsMan(totalMaturityInterest)}`}
                    valueColor={DS.color.positive.main}
                  />
                )}
                {totalMaturityAmount > 0 && <InfoRow strong label="만기 수령액" value={fmtWonAsMan(totalMaturityAmount)} />}
                {nearestDday !== null && (
                  <div style={{ fontSize: DS.font.size.caption, marginTop: 8, color: nearestDday <= 0 ? DS.color.positive.main : nearestDday <= 30 ? DS.color.warning.main : DS.color.text.muted }}>
                    {nearestDday <= 0 ? '✓ 최근 만기 도달' : `가장 빠른 만기 D-${nearestDday}`}
                    <span style={{ marginLeft: 4, color: DS.color.text.muted }}>· {nearestMaturity}</span>
                  </div>
                )}
              </div>
            )
          } else {
            const ms = groupItems.map((item) => getInvestMetrics(item, currentYear, currentMonth))
            const totalPnl = ms.reduce((s, m) => s + m.unrealized, 0)
            const totalRealized = ms.reduce((s, m) => s + m.realized, 0)
            const totalCash = ms.reduce((s, m) => s + m.cash, 0)
            const totalBalance = ms.reduce((s, m) => s + m.balance, 0)
            const totalBasis = ms.reduce((s, m) => s + m.basis, 0)
            const pnlPct = totalBasis > 0 ? Math.round((totalPnl / totalBasis) * 1000) / 10 : 0
            const realizedColor = totalRealized === 0 ? DS.color.text.secondary : totalRealized > 0 ? DS.color.positive.main : DS.color.negative.main
            const pnlColor = totalPnl === 0 ? DS.color.text.secondary : totalPnl > 0 ? DS.color.positive.main : DS.color.negative.main
            return (
              <div
                key={String(personKey)}
                style={{ ...jellyCardStyle, padding: '14px 16px', flex: '1 1 200px', minWidth: 180, border: totalPnl < 0 ? `1.5px solid ${DS.color.negative.border}` : undefined }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: groupColor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: DS.font.size.caption, fontWeight: 700, color: groupColor }}>{groupLabel}</span>
                  <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, marginLeft: 'auto' }}>{groupItems.length}개 항목</span>
                </div>
                <InfoRow label="보유 원금" value={fmtWonAsMan(totalBasis)} />
                <InfoRow
                  label="평가 손익"
                  valueColor={pnlColor}
                  value={`${fmtSignedMan(totalPnl)}${pnlPct !== 0 ? ` (${pnlPct > 0 ? '+' : ''}${pnlPct}%)` : ''}`}
                />
                {totalRealized !== 0 && <InfoRow label="누적 실현손익" value={fmtSignedMan(totalRealized)} valueColor={realizedColor} />}
                {totalCash > 0 && <InfoRow label="예수금" value={fmtWonAsMan(totalCash)} />}
                <InfoRow strong label="총 잔고" value={fmtWonAsMan(totalBalance)} valueColor={DS.color.text.body} />
              </div>
            )
          }
        })}
      </div>
    </>
  )
}
