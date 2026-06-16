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
  const assetGoal = useAppStore((s) => s.settings.assetGoal)
  const goalsRaw = useAppStore((s) => s.settings.goals)
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
    // 저축·투자 자산 (카테고리: 저축 또는 투자)
    const savingsAsset = items
      .filter((item) => item.category === '저축' || item.category === '투자')
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
      .filter((e) => e.yearMonth === currentYM && !e.excluded)
      .reduce((sum, e) => sum + e.amount, 0)
    // 공동 생활비 목표 (월별 override 우선, 없으면 설정값)
    const sharedExpenseTarget = sharedMonthlyOverride ?? sharedLivingCostTarget

    return {
      totalAsset,
      availableAsset,
      savingsAsset,
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

  // 자산 목표 리스트 (레거시 assetGoal → goals 의 첫 항목으로 매핑)
  type MetricKind = 'total' | 'living' | 'savings'
  const METRIC_LABEL: Record<MetricKind, string> = {
    total: '총자산',
    living: '생활비',
    savings: '저축/투자',
  }
  const goalList = useMemo(() => {
    if (goalsRaw && goalsRaw.length > 0) {
      // 알 수 없는 metric (구버전 'available' 등) 은 'total' 로 폴백
      return goalsRaw.map((g) => ({
        ...g,
        metric: (g.metric === 'total' || g.metric === 'living' || g.metric === 'savings'
          ? g.metric
          : 'total') as MetricKind,
      }))
    }
    if (assetGoal && assetGoal.targetAmount > 0) {
      return [
        {
          id: 'legacy',
          metric: 'total' as MetricKind,
          targetAmount: assetGoal.targetAmount,
          action: '모아',
          purpose: assetGoal.description,
        },
      ]
    }
    return []
  }, [goalsRaw, assetGoal])

  // 생활비 metric: 이번 달 공동 생활비 사용액 (절약 목표 시 used < target 이 좋음)
  const currentForMetric = (m: MetricKind) =>
    m === 'living'
      ? stats.sharedExpenseUsed
      : m === 'savings'
        ? stats.savingsAsset
        : stats.totalAsset

  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
        gap: DS.space[3],
      }}
    >
      {/* 0. 자산 목표 — 등록된 목표마다 카드 (전체 행 폭) */}
      {goalList.map((g) => {
        const target = g.targetAmount
        if (target <= 0) return null
        const current = currentForMetric(g.metric)
        const progress = Math.min(current / target, 1)
        const remaining = Math.max(0, target - current)
        const achieved = current >= target
        const purpose = g.purpose.trim()
        const deadlineLabel = (() => {
          if (!g.deadline) return ''
          const d = new Date(g.deadline)
          if (Number.isNaN(d.getTime())) return ''
          const today = new Date()
          today.setHours(0, 0, 0, 0)
          const diffDays = Math.ceil((d.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
          const ymdLabel = `${d.getFullYear()}.${d.getMonth() + 1}.${d.getDate()}`
          if (diffDays < 0) return `${ymdLabel} (${-diffDays}일 초과)`
          if (diffDays === 0) return `${ymdLabel} (오늘 마감)`
          if (diffDays < 30) return `${ymdLabel} (${diffDays}일 남음)`
          const months = Math.round(diffDays / 30)
          if (months < 24) return `${ymdLabel} (${months}개월 남음)`
          const years = (diffDays / 365).toFixed(1)
          return `${ymdLabel} (${years}년 남음)`
        })()
        const sentence = `${METRIC_LABEL[g.metric]}을 ${fmt(target)}원 ${deadlineLabel ? `${deadlineLabel} 까지 ` : ''}${g.action || '모아'} ${purpose ? purpose + '을/를 ' : ''}하고 싶어요`
        return (
          <Card key={g.id} variant="data" padding={4} hoverLift={false} style={{ gridColumn: '1 / -1' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ fontSize: 12, fontWeight: 600, color: DS.color.text.primary }}>
                  🎯 {sentence}
                </div>
                <div style={{ fontSize: 11, color: DS.color.text.secondary, ...tabularNums }}>
                  {fmt(current)}원 / {fmt(target)}원
                </div>
              </div>
              <div
                style={{
                  width: '100%',
                  height: 10,
                  background: '#f3f4f6',
                  borderRadius: 999,
                  overflow: 'hidden',
                }}
              >
                <div
                  style={{
                    width: `${Math.min(progress * 100, 100)}%`,
                    height: '100%',
                    background: achieved
                      ? '#16a34a'
                      : `linear-gradient(90deg, ${PRIMARY}, #60A5FA)`,
                    borderRadius: 999,
                    transition: 'width 0.4s ease',
                  }}
                />
              </div>
              <div
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  gap: 8,
                  fontSize: 11,
                  color: DS.color.text.secondary,
                  flexWrap: 'wrap',
                }}
              >
                <span style={{ ...tabularNums }}>
                  {achieved ? (
                    <span style={{ color: '#16a34a', fontWeight: 600 }}>🎉 목표 달성!</span>
                  ) : (
                    <>남은 금액 <span style={{ fontWeight: 600, color: DS.color.text.primary }}>{fmt(remaining)}원</span></>
                  )}
                </span>
                <span style={{ ...tabularNums, fontWeight: 600, color: achieved ? '#16a34a' : PRIMARY }}>
                  {(progress * 100).toFixed(1)}%
                </span>
              </div>
            </div>
          </Card>
        )
      })}

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
