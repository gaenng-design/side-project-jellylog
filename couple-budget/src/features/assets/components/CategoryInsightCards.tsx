import { jellyCardStyle } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { daysUntil } from '@/lib/assetCalc'
import type { AssetItem } from '@/types'
import { fmtMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { AfterTaxToggle } from './AfterTaxToggle'

/** 카테고리 탭 인사이트 카드 — 명의별 (저축: 만기 수령액, 투자: 수익률) */
export function CategoryInsightCards({ model, categoryFilter, filteredItems }: { model: AssetModel; categoryFilter: string; filteredItems: AssetItem[] }) {
  const { currentYear, currentMonth, personAName, personBName, getPersonColor, getProjectedValue, getMaturity, getPnl, interestAfterTax } = model
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
          const groupColor = personKey ? getPersonColor(personKey) : '#9ca3af'

          if (categoryFilter === '저축') {
            const totalBalance = groupItems.reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0)
            let totalMaturityInterest = 0
            let totalMaturityAmount = 0
            groupItems.forEach((item) => {
              const result = getMaturity(item)
              if (!result) return
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
                  <span style={{ fontSize: 12, fontWeight: 700, color: groupColor }}>{groupLabel}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{groupItems.length}개 항목</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>현재 잔액</span>
                  <span style={{ fontSize: 11, color: '#374151', fontWeight: 500 }}>{fmtMan(Math.round(totalBalance / 10000))}원</span>
                </div>
                {totalMaturityInterest > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                    <span style={{ fontSize: 11, color: '#6b7280' }}>만기 예상 이자{interestAfterTax ? ' (세후)' : ''}</span>
                    <span style={{ fontSize: 11, color: '#059669', fontWeight: 500 }}>+{fmtMan(Math.round(totalMaturityInterest / 10000))}원</span>
                  </div>
                )}
                {totalMaturityAmount > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #f3f4f6', marginTop: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>만기 수령액</span>
                    <span style={{ fontSize: 14, fontWeight: 700, color: PRIMARY }}>{fmtMan(Math.round(totalMaturityAmount / 10000))}원</span>
                  </div>
                )}
                {nearestDday !== null && (
                  <div style={{ fontSize: 11, marginTop: 8, color: nearestDday <= 0 ? '#059669' : nearestDday <= 30 ? '#f59e0b' : '#9ca3af' }}>
                    {nearestDday <= 0 ? '✓ 최근 만기 도달' : `가장 빠른 만기 D-${nearestDday}`}
                    <span style={{ marginLeft: 4, color: '#9ca3af' }}>· {nearestMaturity}</span>
                  </div>
                )}
              </div>
            )
          } else {
            const totalPnl = groupItems.reduce((s, item) => s + getPnl(item, currentYear, currentMonth), 0)
            const totalBalance = groupItems.reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0)
            const totalBasis = totalBalance - totalPnl
            const pnlPct = totalBasis !== 0 ? Math.round((totalPnl / totalBasis) * 1000) / 10 : 0
            const pnlColor = totalPnl === 0 ? '#6b7280' : totalPnl > 0 ? '#059669' : '#dc2626'
            return (
              <div
                key={String(personKey)}
                style={{ ...jellyCardStyle, padding: '14px 16px', flex: '1 1 200px', minWidth: 180, border: totalPnl < 0 ? '1.5px solid #fca5a5' : undefined }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 12 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: groupColor, display: 'inline-block', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, fontWeight: 700, color: groupColor }}>{groupLabel}</span>
                  <span style={{ fontSize: 11, color: '#9ca3af', marginLeft: 'auto' }}>{groupItems.length}개 항목</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>원금</span>
                  <span style={{ fontSize: 11, color: '#374151' }}>{fmtMan(Math.round(totalBasis / 10000))}원</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
                  <span style={{ fontSize: 11, color: '#6b7280' }}>평가 손익</span>
                  <span style={{ fontSize: 11, fontWeight: 600, color: pnlColor }}>
                    {totalPnl === 0 ? '—' : `${totalPnl > 0 ? '+' : ''}${fmtMan(Math.round(totalPnl / 10000))}원`}
                    {pnlPct !== 0 && <span style={{ fontSize: 10, marginLeft: 4, color: pnlColor }}>({pnlPct > 0 ? '+' : ''}{pnlPct}%)</span>}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #e5e7eb', marginTop: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: '#374151' }}>총 잔고</span>
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#374151' }}>{fmtMan(Math.round(totalBalance / 10000))}원</span>
                </div>
              </div>
            )
          }
        })}
      </div>
    </>
  )
}
