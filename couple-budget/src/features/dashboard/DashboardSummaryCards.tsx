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
    // 가용 자산 (locked 아닌 항목만) — 더 이상 카드로 노출하지 않지만 잠긴 돈 표시에 필요
    const availableAsset = items
      .filter((item) => !item.locked)
      .reduce((sum, item) => sum + getEntry(item.id, currentYM), 0)
    // 전월 총 자산
    const prevTotalAsset = items.reduce((sum, item) => sum + getEntry(item.id, prevYM), 0)
    const assetDelta = totalAsset - prevTotalAsset

    // 연초(1월) 총 자산 — 데이터가 없으면 같은 연도 중 가장 이른 입력 월 사용
    let baselineYM = ym(year, 0)
    let baselineAsset = items.reduce((sum, item) => sum + getEntry(item.id, baselineYM), 0)
    if (baselineAsset === 0) {
      // 1월 데이터가 없으면 현재 달까지 거슬러 올라가며 가장 이른 입력 월 탐색
      for (let mi = 1; mi <= monthIdx; mi++) {
        const candidate = ym(year, mi)
        const sum = items.reduce((s, item) => s + getEntry(item.id, candidate), 0)
        if (sum > 0) {
          baselineYM = candidate
          baselineAsset = sum
          break
        }
      }
    }
    const ytdDelta = totalAsset - baselineAsset
    const ytdPct = baselineAsset > 0 ? (ytdDelta / baselineAsset) * 100 : 0
    const baselineMonthIdx = parseInt(baselineYM.split('-')[1], 10) - 1

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
      baselineAsset,
      baselineMonthIdx,
      ytdDelta,
      ytdPct,
      sharedExpenseUsed,
      sharedExpenseTarget,
    }
  }, [items, getEntry, currentYM, prevYM, year, monthIdx, sharedEntries, sharedMonthlyOverride, sharedLivingCostTarget])

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

      {/* 2. 올해 자산 성장 — 연초(또는 첫 입력 월) 대비 누적 증감 */}
      <Card variant="data" padding={4} hoverLift={false}>
        <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
          📈 올해 자산 성장
          <span style={{ color: '#9ca3af', marginLeft: 4 }}>
            ({stats.baselineMonthIdx === 0 ? '연초' : `${stats.baselineMonthIdx + 1}월`} 대비)
          </span>
        </div>
        {stats.baselineAsset > 0 ? (
          <>
            <div
              style={{
                fontSize: 22,
                fontWeight: 700,
                color:
                  stats.ytdDelta > 0
                    ? '#16a34a'
                    : stats.ytdDelta < 0
                      ? '#ef4444'
                      : DS.color.text.primary,
                ...tabularNums,
              }}
            >
              {stats.ytdDelta > 0 ? '+' : stats.ytdDelta < 0 ? '-' : ''}
              {fmt(Math.abs(stats.ytdDelta))}원
            </div>
            <div style={{ fontSize: 11, color: DS.color.text.secondary, marginTop: 4, ...tabularNums }}>
              {stats.ytdPct > 0 ? '+' : stats.ytdPct < 0 ? '−' : ''}
              {Math.abs(stats.ytdPct).toFixed(1)}% · 기준 {fmt(stats.baselineAsset)}원
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 22, fontWeight: 700, color: '#9ca3af', ...tabularNums }}>—</div>
            <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 4 }}>
              올해 입력된 자산 데이터가 없습니다
            </div>
          </>
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

    </div>
  )
}
