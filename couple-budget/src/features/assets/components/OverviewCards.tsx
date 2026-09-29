import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { jellyCardStyle } from '@/styles/jellyGlass'
import { monthlyContribution } from '@/lib/assetCalc'
import { MONTHS, fmtMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'

/** 전체 탭: 카테고리별 자산 구성 + 이달 증감 분석 */
export function OverviewCards({ model }: { model: AssetModel }) {
  const { currentYear, currentMonth, sortedItems, getProjectedValue, getPnl, calcMonthTotals, currentYearMonthTotals } = model
  // ── 카테고리별 바 그래프 데이터 ──
  const catTotals = ASSET_CATEGORIES.map((cat) => ({
    cat,
    total: sortedItems
      .filter((i) => i.category === cat)
      .reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0),
  })).filter((c) => c.total > 0)
  const grandTotal = catTotals.reduce((s, c) => s + c.total, 0)
  const CAT_COLORS: Record<string, string> = { 저축: '#3b82f6', 투자: '#8b5cf6', 부동산: '#f59e0b' }

  // ── 이달 증감 분석 데이터 ──
  const curTotal = currentYearMonthTotals[currentMonth]
  const prevYr = currentMonth > 0 ? currentYear : currentYear - 1
  const prevMi = currentMonth > 0 ? currentMonth - 1 : 11
  const prevTotal = currentMonth > 0
    ? currentYearMonthTotals[currentMonth - 1]
    : calcMonthTotals(currentYear - 1)[11]
  const actualDelta = curTotal - prevTotal
  const plannedDeposits = sortedItems
    .filter((item) => ASSET_CATEGORIES.includes(item.category))
    .reduce((s, item) => s + monthlyContribution(item, currentYear, currentMonth), 0)
  // 카테고리별 손익 계산
  const savingsItemsD = sortedItems.filter((i) => i.category === '저축')
  const investItemsD = sortedItems.filter((i) => i.category === '투자')
  const savingsCurD = savingsItemsD.reduce((s, item) => s + getProjectedValue(currentYear, item, currentMonth), 0)
  const savingsPrevD = savingsItemsD.reduce((s, item) => s + getProjectedValue(prevYr, item, prevMi), 0)
  const savingsDepD = savingsItemsD.reduce((s, item) => s + monthlyContribution(item, currentYear, currentMonth), 0)
  const savingsInterestD = savingsCurD - savingsPrevD - savingsDepD
  // 투자 손익 = 이번 달 평가손익 − 전월 평가손익 (잔액 변동에는 입금·출금이 섞여 있어 손익 기록을 기준으로 함)
  const investCurPnl = investItemsD.reduce((s, item) => s + getPnl(item, currentYear, currentMonth), 0)
  const investPrevPnl = investItemsD.reduce((s, item) => s + getPnl(item, prevYr, prevMi), 0)
  const investPnlD = investCurPnl - investPrevPnl
  const deltaColor = actualDelta === 0 ? '#6b7280' : actualDelta > 0 ? '#059669' : '#dc2626'
  const prevLabel = currentMonth > 0 ? `${MONTHS[currentMonth - 1]}` : `${currentYear - 1}년 12월`

  const showBarChart = catTotals.length > 0 && grandTotal > 0
  const showDelta = curTotal > 0

  if (!showBarChart && !showDelta) return null

  return (
    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 16, alignItems: 'stretch' }}>
      {/* 카테고리별 자산 구성 */}
      {showBarChart && (
        <div style={{ flex: '1 1 280px', ...jellyCardStyle, padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 14 }}>카테고리별 자산 구성</div>
          <div style={{ display: 'flex', height: 20, borderRadius: 6, overflow: 'hidden', marginBottom: 12 }}>
            {catTotals.map(({ cat, total }, idx) => (
              <div
                key={cat}
                title={`${cat}: ${fmtMan(Math.round(total / 10000))}원`}
                style={{
                  flex: `0 0 ${(total / grandTotal) * 100}%`,
                  background: CAT_COLORS[cat] ?? '#9ca3af',
                  marginRight: idx < catTotals.length - 1 ? 2 : 0,
                  borderRadius: idx === 0 ? '6px 0 0 6px' : idx === catTotals.length - 1 ? '0 6px 6px 0' : 0,
                  minWidth: 4,
                }}
              />
            ))}
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px 20px' }}>
            {catTotals.map(({ cat, total }) => {
              const pct = Math.round((total / grandTotal) * 1000) / 10
              return (
                <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 10, height: 10, borderRadius: 3, background: CAT_COLORS[cat] ?? '#9ca3af', flexShrink: 0 }} />
                  <span style={{ fontSize: 12, color: '#374151', fontWeight: 600 }}>{cat}</span>
                  <span style={{ fontSize: 12, color: '#6b7280' }}>{fmtMan(Math.round(total / 10000))}원</span>
                  <span style={{ fontSize: 11, color: '#9ca3af' }}>({pct}%)</span>
                </div>
              )
            })}
          </div>
        </div>
      )}
      {/* 이달 증감 분석 */}
      {showDelta && (
        <div style={{ flex: '1 1 280px', ...jellyCardStyle, padding: '14px 16px' }}>
          <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', marginBottom: 12 }}>
            이달 증감 분석
            <span style={{ fontSize: 11, fontWeight: 400, color: '#9ca3af', marginLeft: 6 }}>({prevLabel} 대비)</span>
          </div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#3b82f6', flexShrink: 0 }} />
              <span style={{ fontSize: 12, color: '#374151' }}>정기 납입</span>
              <span style={{ fontSize: 11, color: '#9ca3af' }}>(적금·투자 등 자동)</span>
            </div>
            <span style={{ fontSize: 13, fontWeight: 600, color: plannedDeposits > 0 ? '#3b82f6' : '#9ca3af' }}>
              {plannedDeposits === 0 ? '—' : `+${fmtMan(Math.round(plannedDeposits / 10000))}원`}
            </span>
          </div>
          {savingsInterestD > 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#059669', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#374151' }}>저축 이자</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#059669' }}>
                {`+${fmtMan(Math.round(savingsInterestD / 10000))}원`}
              </span>
            </div>
          )}
          {savingsInterestD < 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#374151' }}>저축 출금·감소</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: '#dc2626' }}>
                {`${fmtMan(Math.round(savingsInterestD / 10000))}원`}
              </span>
            </div>
          )}
          {investPnlD !== 0 && (
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: 2, background: investPnlD > 0 ? '#059669' : '#dc2626', flexShrink: 0 }} />
                <span style={{ fontSize: 12, color: '#374151' }}>투자 손익</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: investPnlD > 0 ? '#059669' : '#dc2626' }}>
                {`${investPnlD > 0 ? '+' : ''}${fmtMan(Math.round(investPnlD / 10000))}원`}
              </span>
            </div>
          )}
          <div style={{ height: 4 }} />
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: 10, borderTop: '1px solid #e5e7eb' }}>
            <span style={{ fontSize: 12, fontWeight: 600, color: '#374151' }}>= 실제 증감</span>
            <span style={{ fontSize: 16, fontWeight: 700, color: deltaColor }}>
              {actualDelta === 0 ? '—' : `${actualDelta > 0 ? '+' : ''}${fmtMan(Math.round(actualDelta / 10000))}원`}
            </span>
          </div>
        </div>
      )}
    </div>
  )
}
