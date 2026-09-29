import { useState } from 'react'
import { jellyCardStyle } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { daysUntil } from '@/lib/assetCalc'
import type { AssetItem } from '@/types'
import { fmtWonAsMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { MaturityProcessModal } from './MaturityProcessModal'
import { DS } from '@/design-system/tokens'
import { Button } from '@/design-system/components'

/** 만기 알림을 보여주기 시작하는 시점 (만기 D-30) */
const NOTICE_DAYS = 30

/** 만기 처리 대상: 만기일이 있는 적금·예금 중 아직 해지 처리하지 않은 항목 */
export function isMaturityTracked(item: AssetItem): boolean {
  return (
    item.category === '저축' &&
    item.savingsType !== 'checking' &&
    item.savingsType !== 'subscription' &&
    !!item.maturityDate &&
    !item.closedYM
  )
}

/**
 * 만기 알림 배너
 * - 만기 30일 전부터 "D-n 만기 예정" 안내
 * - 만기일이 지나면 "만기 처리" 버튼 → 수령액을 다른 항목으로 옮기고 해지 처리
 */
export function MaturityAlerts({ model }: { model: AssetModel }) {
  const { sortedItems, getMaturity, getProjectedValue, currentYear, currentMonth } = model
  const [processing, setProcessing] = useState<AssetItem | null>(null)

  const alerts = sortedItems
    .filter(isMaturityTracked)
    .map((item) => ({ item, dday: daysUntil(item.maturityDate!) }))
    .filter(({ dday }) => dday <= NOTICE_DAYS)
    .sort((a, b) => a.dday - b.dday)

  if (alerts.length === 0) return null

  return (
    <div style={{ ...jellyCardStyle, padding: '12px 16px', marginBottom: 16, display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontSize: 12, fontWeight: 700, color: DS.color.text.primary }}>🔔 만기 알림</div>
      {alerts.map(({ item, dday }) => {
        const matured = dday <= 0
        const expected = getMaturity(item)?.amount ?? getProjectedValue(currentYear, item, currentMonth)
        return (
          <div
            key={item.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              flexWrap: 'wrap',
              padding: '8px 10px',
              borderRadius: 10,
              background: matured ? 'rgba(79, 140, 255, 0.08)' : 'rgba(245, 158, 11, 0.08)',
            }}
          >
            <span
              style={{
                fontSize: 11,
                fontWeight: 700,
                color: DS.color.text.inverse,
                background: matured ? PRIMARY : '#d97706',
                borderRadius: 999,
                padding: '2px 8px',
                flexShrink: 0,
              }}
            >
              {matured ? '만기 도래' : dday === 0 ? 'D-day' : `D-${dday}`}
            </span>
            <div style={{ flex: '1 1 160px', minWidth: 0 }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: DS.color.text.primary }}>{item.name}</div>
              <div style={{ fontSize: 11, color: DS.color.text.secondary }}>
                만기일 {item.maturityDate} · 예상 수령액 {fmtWonAsMan(expected)}
              </div>
            </div>
            {matured ? (
              <Button variant="primary" size="sm" onClick={() => setProcessing(item)} style={{ flexShrink: 0 }}>
                만기 처리
              </Button>
            ) : (
              <span style={{ fontSize: 11, color: DS.color.warning.text, flexShrink: 0 }}>수령 계좌를 미리 정해두세요</span>
            )}
          </div>
        )
      })}

      {processing && (
        <MaturityProcessModal
          key={processing.id}
          model={model}
          item={processing}
          onClose={() => setProcessing(null)}
        />
      )}
    </div>
  )
}
