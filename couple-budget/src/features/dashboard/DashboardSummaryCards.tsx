import { useMemo } from 'react'
import { DS } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { useAppStore } from '@/store/useAppStore'
import { useAssetStore } from '@/store/useAssetStore'
import { useSharedExpenseStore } from '@/store/useSharedExpenseStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { PRIMARY } from '@/styles/formControls'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const tabularNums: React.CSSProperties = {
  fontVariantNumeric: 'tabular-nums',
}

function ym(year: number, monthIdx: number) {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`
}

/**
 * 대시보드 상단 요약 카드 4개
 * - 총 자산
 * - 가용 자산 (묶이지 않은 돈)
 * - 이번 달 공동 생활비 사용액 / 목표
 * - 이번 달 자산 증감 (전월 대비)
 */
export function DashboardSummaryCards() {
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const sharedLivingCostTarget = useAppStore((s) => s.settings.sharedLivingCost ?? 0)
  const [yearStr, monthStr] = currentYearMonth.split('-')
  const year = parseInt(yearStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1
  const currentYM = ym(year, monthIdx)
  const prevYM = monthIdx === 0 ? ym(year - 1, 11) : ym(year, monthIdx - 1)

  // 자산 store
  const items = useAssetStore((s) => s.items)
  const entries = useAssetStore((s) => s.entries)
  const getEntry = useAssetStore((s) => s.getEntry)
  void entries

  // 공동 생활비 store
  const sharedEntries = useSharedExpenseStore((s) => s.entries)
  const sharedMonthlyOverride = usePlanExtraStore((s) => s.sharedLivingCostByMonth[currentYM])

  const stats = useMemo(() => {
    // 이번 달 총 자산
    const totalAsset = items.reduce((sum, item) => sum + getEntry(item.id, currentYM), 0)
    // 가용 자산 (locked 아닌 항목만)
    const availableAsset = items
      .filter((item) => !item.locked)
      .reduce((sum, item) => sum + getEntry(item.id, currentYM), 0)
    // 전월 총 자산
    const prevTotalAsset = items.reduce((sum, item) => sum + getEntry(item.id, prevYM), 0)
    const assetDelta = totalAsset - prevTotalAsset

    // 이번 달 공동 생활비 사용액
    const sharedExpenseUsed = sharedEntries
      .filter((e) => e.yearMonth === currentYM)
      .reduce((sum, e) => sum + e.amount, 0)
    // 공동 생활비 목표 (월별 override 우선, 없으면 설정값)
    const sharedExpenseTarget = sharedMonthlyOverride ?? sharedLivingCostTarget

    return {
      totalAsset,
      availableAsset,
      lockedAsset: totalAsset - availableAsset,
      prevTotalAsset,
      assetDelta,
      sharedExpenseUsed,
      sharedExpenseTarget,
    }
  }, [items, getEntry, currentYM, prevYM, sharedEntries, sharedMonthlyOverride, sharedLivingCostTarget])

  const sharedProgress =
    stats.sharedExpenseTarget > 0
      ? Math.min(stats.sharedExpenseUsed / stats.sharedExpenseTarget, 1.5)
      : 0
  const sharedOver = stats.sharedExpenseTarget > 0 && stats.sharedExpenseUsed > stats.sharedExpenseTarget

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: DS.space[3],
      }}
    >
      {/* 1. 총 자산 */}
      <Card variant="data" padding={4} hoverLift={false}>
        <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
          {year}년 {monthIdx + 1}월 · 총 자산
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: PRIMARY, ...tabularNums }}>
          {fmt(stats.totalAsset)}원
        </div>
        <div style={{ fontSize: 11, color: DS.color.text.secondary, marginTop: 4, ...tabularNums }}>
          {stats.assetDelta > 0
            ? `▲ ${fmt(stats.assetDelta)} (전월 대비)`
            : stats.assetDelta < 0
              ? `▼ ${fmt(-stats.assetDelta)} (전월 대비)`
              : '전월과 동일'}
        </div>
      </Card>

      {/* 2. 가용 자산 */}
      <Card variant="data" padding={4} hoverLift={false}>
        <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
          💰 가용 자산
          <span style={{ color: '#9ca3af', marginLeft: 4 }}>(묶이지 않은 돈)</span>
        </div>
        <div style={{ fontSize: 22, fontWeight: 700, color: DS.color.text.primary, ...tabularNums }}>
          {fmt(stats.availableAsset)}원
        </div>
        {stats.lockedAsset > 0 && (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4, ...tabularNums }}>
            🔒 묶인 돈: {fmt(stats.lockedAsset)}원
          </div>
        )}
      </Card>

      {/* 3. 공동 생활비 진행 */}
      <Card variant="data" padding={4} hoverLift={false}>
        <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
          🏠 이번 달 공동 생활비
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: sharedOver ? '#ef4444' : DS.color.text.primary,
            ...tabularNums,
          }}
        >
          {fmt(stats.sharedExpenseUsed)}원
        </div>
        {stats.sharedExpenseTarget > 0 ? (
          <>
            <div
              style={{
                marginTop: 8,
                width: '100%',
                height: 6,
                background: '#f3f4f6',
                borderRadius: 999,
                overflow: 'hidden',
              }}
            >
              <div
                style={{
                  width: `${Math.min(sharedProgress * 100, 100)}%`,
                  height: '100%',
                  background: sharedOver ? '#ef4444' : PRIMARY,
                  borderRadius: 999,
                  transition: 'width 0.3s ease',
                }}
              />
            </div>
            <div style={{ fontSize: 11, color: DS.color.text.secondary, marginTop: 4, ...tabularNums }}>
              목표 {fmt(stats.sharedExpenseTarget)}원 ·{' '}
              {sharedOver ? (
                <span style={{ color: '#ef4444', fontWeight: 600 }}>
                  ⚠ {fmt(stats.sharedExpenseUsed - stats.sharedExpenseTarget)} 초과
                </span>
              ) : (
                `${Math.round(sharedProgress * 100)}% 사용`
              )}
            </div>
          </>
        ) : (
          <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>설정 페이지에서 목표 설정</div>
        )}
      </Card>

      {/* 4. 자산 증감 (큰 변화 강조) */}
      <Card variant="data" padding={4} hoverLift={false}>
        <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
          📈 전월 대비 자산
        </div>
        <div
          style={{
            fontSize: 22,
            fontWeight: 700,
            color:
              stats.assetDelta > 0
                ? '#16a34a'
                : stats.assetDelta < 0
                  ? '#ef4444'
                  : DS.color.text.primary,
            ...tabularNums,
          }}
        >
          {stats.assetDelta > 0 ? '+' : stats.assetDelta < 0 ? '-' : ''}
          {fmt(Math.abs(stats.assetDelta))}원
        </div>
        <div style={{ fontSize: 11, color: DS.color.text.secondary, marginTop: 4, ...tabularNums }}>
          전월 {fmt(stats.prevTotalAsset)}원
        </div>
      </Card>
    </div>
  )
}
