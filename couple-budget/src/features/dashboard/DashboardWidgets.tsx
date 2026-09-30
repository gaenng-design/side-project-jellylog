import { useMemo, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { DS, tabularNums } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { StatCard } from '@/design-system/components/StatCard'
import { DeltaText, deltaColor } from '@/design-system/components/DeltaText'
import { InfoTip } from '@/design-system/components/InfoTip'
import { useAppStore } from '@/store/useAppStore'
import { useAssetStore, ASSET_CATEGORIES } from '@/store/useAssetStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { getEffectiveEntry, parseYM, daysUntil, addMonths, ym as toYM } from '@/lib/assetCalc'
import { isMaturityTracked } from '@/features/assets/components/MaturityAlerts'
import type { AssetItem } from '@/types'
import {
  useDashboardAssetStats,
  useDashboardSharedStats,
  type DashboardPeriod,
  type DashboardYearData,
} from './useDashboardData'
import { AssetLineChart, BarChart, CumulativeChart, FLOW_SERIES, FlowChart } from './DashboardCharts'
import { ChartCard, DataTable, LegendDot, fmtWon, fmtWonShort, useMediaQuery } from './chartKit'

const won = (n: number) => `${n.toLocaleString('ko-KR')}원`
const man = (n: number) => `${Math.round(n / 10000).toLocaleString('ko-KR')}만`
const signed = (n: number) => `${n > 0 ? '+' : n < 0 ? '-' : ''}${Math.abs(n).toLocaleString('ko-KR')}원`
const pctText = (n: number) => `${n > 0 ? '+' : n < 0 ? '−' : ''}${Math.abs(n).toFixed(1)}%`

interface WidgetProps {
  period: DashboardPeriod
  data: DashboardYearData
}

function useGo(period: DashboardPeriod) {
  const navigate = useNavigate()
  const setYearMonth = useAppStore((s) => s.setYearMonth)
  return (to: string, withMonth = false) => () => {
    if (withMonth) setYearMonth(period.ym)
    navigate(to)
  }
}

const monthWord = (p: DashboardPeriod) => `${p.monthIdx + 1}월${p.isFuture ? ' (예상)' : ''}`

/* ───────────── 요약: 핵심 지표 카드 ───────────── */

export function KpiWidget({ period, data }: WidgetProps) {
  const go = useGo(period)
  const asset = useDashboardAssetStats(period)
  const shared = useDashboardSharedStats(period.ym)
  const f = data.flow[period.monthIdx]
  const none = f.empty
  const sharedOver = shared.target > 0 && shared.used > shared.target
  const sharedPct = shared.target > 0 ? Math.min(shared.used / shared.target, 1) : 0
  const plan = go('/expense-plan', true)
  // 2열로 좁아지는 화면에서는 큰 금액을 짧게(2억 2,145만원) 보여줘 줄바꿈을 막는다
  const compact = useMediaQuery('(max-width: 719px)')
  const kw = compact ? fmtWonShort : won
  const size = compact ? DS.font.size.title : undefined

  return (
    <div className="dash-kpi-grid" style={{ display: 'grid', gap: DS.space[3] }}>
      <StatCard
        onClick={go('/assets')}
        label={`${monthWord(period)} · 총 자산`}
        value={kw(asset.totalAsset)}
        valueSize={size}
        valueColor={DS.color.primaryDark}
        sub={
          asset.prevTotalAsset > 0 ? (
            <DeltaText value={asset.assetDelta}>
              {asset.assetDelta === 0 ? '전월과 동일' : `${asset.assetDelta > 0 ? '▲' : '▼'} ${won(Math.abs(asset.assetDelta))} 전월 대비`}
            </DeltaText>
          ) : (
            '전월 자산 입력 없음'
          )
        }
      />
      <StatCard onClick={plan} label={`${monthWord(period)} · 수입`} value={none ? '—' : kw(f.income)} valueSize={size} sub={none ? '지출 계획을 시작하지 않은 달' : '지출 계획 기준'} />
      <StatCard
        onClick={plan}
        label={`${monthWord(period)} · 지출`}
        value={none ? '—' : kw(f.spending)}
        valueSize={size}
        sub={none ? undefined : `고정 ${man(f.fixed)} · 별도 ${man(f.separate)} · 생활비 ${man(f.living)}`}
      />
      <StatCard
        onClick={plan}
        label={`${monthWord(period)} · 저축·투자`}
        value={none ? '—' : kw(f.invest)}
        valueSize={size}
        sub={none ? undefined : f.savingRate === null ? '수입 없음' : `저축률 ${f.savingRate.toFixed(1)}%`}
      />
      <StatCard
        onClick={plan}
        label={`${monthWord(period)} · 남는 돈 (용돈)`}
        value={none ? '—' : kw(f.leftover)}
        valueSize={size}
        valueColor={none ? DS.color.text.muted : f.leftover < 0 ? DS.color.negative.main : DS.color.text.primary}
        tone={!none && f.leftover < 0 ? 'negative' : 'neutral'}
        sub={none ? undefined : f.leftover < 0 ? '수입보다 많이 쓰는 달이에요' : '수입 − 지출 − 저축·투자'}
      />
      <StatCard
        onClick={go('/shared-expense', true)}
        label={`${monthWord(period)} · 공동 생활비`}
        value={shared.used === 0 && !shared.hasEntries ? '내역 없음' : kw(shared.used)}
        valueSize={size}
        valueColor={sharedOver ? DS.color.negative.main : shared.used === 0 ? DS.color.text.muted : undefined}
        tone={sharedOver ? 'negative' : 'neutral'}
        sub={
          shared.target > 0
            ? sharedOver
              ? `목표 ${man(shared.target)} · ${won(shared.used - shared.target)} 초과`
              : shared.used === 0
                ? `목표 ${man(shared.target)}`
                : `목표 ${man(shared.target)} · ${Math.round(sharedPct * 100)}% 사용`
            : '설정에서 목표를 정해보세요'
        }
      >
        {shared.target > 0 && (
          <div style={{ marginTop: 8, height: 6, borderRadius: 999, background: DS.color.bg.muted, overflow: 'hidden' }}>
            <div style={{ width: `${sharedPct * 100}%`, height: '100%', borderRadius: 999, background: sharedOver ? DS.color.negative.main : DS.color.primary }} />
          </div>
        )}
      </StatCard>
    </div>
  )
}

/* ───────────── 요약: 목표 ───────────── */

type MetricKind = 'total' | 'living' | 'savings'
const METRIC_LABEL: Record<MetricKind, string> = { total: '총자산', living: '생활비', savings: '저축/투자' }

export function GoalsWidget({ period }: WidgetProps) {
  const goalsRaw = useAppStore((s) => s.settings.goals)
  const assetGoal = useAppStore((s) => s.settings.assetGoal)
  const asset = useDashboardAssetStats(period)
  const shared = useDashboardSharedStats(period.ym)

  const goalList = useMemo(() => {
    if (goalsRaw && goalsRaw.length > 0) {
      return goalsRaw.map((g) => ({
        ...g,
        metric: (g.metric === 'total' || g.metric === 'living' || g.metric === 'savings' ? g.metric : 'total') as MetricKind,
      }))
    }
    if (assetGoal && assetGoal.targetAmount > 0) {
      return [{ id: 'legacy', metric: 'total' as MetricKind, targetAmount: assetGoal.targetAmount, action: '모아', purpose: assetGoal.description, deadline: undefined as string | undefined }]
    }
    return []
  }, [goalsRaw, assetGoal])

  const currentFor = (m: MetricKind) => (m === 'living' ? shared.used : m === 'savings' ? asset.savingsAsset : asset.totalAsset)
  const goals = goalList.filter((g) => g.targetAmount > 0)
  if (goals.length === 0) return null

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space[3] }}>
      {goals.map((g) => {
        const current = currentFor(g.metric)
        const progress = Math.min(current / g.targetAmount, 1)
        const achieved = current >= g.targetAmount
        const purpose = g.purpose.trim()
        const deadlineLabel = (() => {
          if (!g.deadline) return ''
          const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(g.deadline)
          if (!m) return ''
          const diff = daysUntil(g.deadline)
          const label = `${Number(m[1])}.${Number(m[2])}.${Number(m[3])}`
          if (diff < 0) return `${label} (${-diff}일 초과)`
          if (diff === 0) return `${label} (오늘 마감)`
          if (diff < 30) return `${label} (${diff}일 남음)`
          const months = Math.round(diff / 30)
          return months < 24 ? `${label} (${months}개월 남음)` : `${label} (${(diff / 365).toFixed(1)}년 남음)`
        })()
        const sentence = `${METRIC_LABEL[g.metric]}을 ${g.targetAmount.toLocaleString('ko-KR')}원 ${deadlineLabel ? `${deadlineLabel} 까지 ` : ''}${g.action || '모아'} ${purpose ? purpose + '을/를 ' : ''}하고 싶어요`
        return (
          <Card key={g.id} variant="data" padding={4} hoverLift={false}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
              <div style={{ fontSize: DS.font.size.body, fontWeight: 600, color: DS.color.text.primary }}>🎯 {sentence}</div>
              <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, ...tabularNums }}>{won(current)} / {won(g.targetAmount)}</div>
            </div>
            <div style={{ height: 10, borderRadius: 999, background: DS.color.bg.muted, overflow: 'hidden', margin: '8px 0 6px' }}>
              <div style={{ width: `${progress * 100}%`, height: '100%', borderRadius: 999, background: achieved ? DS.color.positive.main : DS.color.primary, transition: 'width 0.4s ease' }} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: DS.font.size.caption, color: DS.color.text.secondary, ...tabularNums }}>
              <span>{achieved ? <span style={{ color: DS.color.positive.main, fontWeight: 600 }}>🎉 목표 달성!</span> : <>남은 금액 <strong style={{ color: DS.color.text.primary }}>{won(g.targetAmount - current)}</strong></>}</span>
              <span style={{ fontWeight: 600, color: achieved ? DS.color.positive.main : DS.color.primaryDark }}>{(progress * 100).toFixed(1)}%</span>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

/* ───────────── 요약: 확인할 일 ───────────── */

export function TodoWidget({ period }: WidgetProps) {
  const go = useGo(period)
  const items = useAssetStore((s) => s.items)
  const entries = useAssetStore((s) => s.entries)
  const getEntry = useAssetStore((s) => s.getEntry)
  const startedMonths = useAppStore((s) => s.startedMonths)
  const settlements = useSettlementStore((s) => s.settlements)
  const isSettled = useSettlementStore((s) => s.isSettled)

  const todos = useMemo(() => {
    const list: { key: string; tone: 'warning' | 'info'; text: string; to: string; ym?: string }[] = []
    const { year, monthIdx } = parseYM(period.focusYM)

    // 지난 주기 정산 — 시작했지만 정산 완료가 안 된 최근 달 (이번 달 제외)
    for (let d = 1; d <= 3; d++) {
      const p = addMonths(year, monthIdx, -d)
      const key = toYM(p.year, p.monthIdx)
      if (startedMonths.includes(key) && !isSettled(key)) {
        list.push({ key: `settle-${key}`, tone: 'warning', text: `${p.monthIdx + 1}월 정산이 아직 완료되지 않았어요`, to: '/expense-plan', ym: key })
      }
    }

    // 만기 임박·도래 (30일 이내)
    for (const item of items.filter(isMaturityTracked)) {
      const dday = daysUntil(item.maturityDate!)
      if (dday > 30) continue
      list.push({ key: `mat-${item.id}`, tone: dday <= 0 ? 'warning' : 'info', text: `${item.name} ${dday <= 0 ? '만기가 도래했어요' : `만기 D-${dday}`}`, to: '/assets' })
    }

    // 이번 달 잔액 미입력
    const focus = parseYM(period.focusYM)
    const missing = items.filter(
      (i: AssetItem) => ASSET_CATEGORIES.includes(i.category) && (!i.closedYM || period.focusYM <= i.closedYM) && getEntry(i.id, period.focusYM) === 0,
    )
    if (missing.length > 0) {
      list.push({ key: 'balance', tone: 'info', text: `${focus.monthIdx + 1}월 잔액을 입력하지 않은 자산이 ${missing.length}개 있어요`, to: '/assets' })
    }
    return list
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, entries, getEntry, startedMonths, settlements, isSettled, period.focusYM])

  if (todos.length === 0) return null
  return (
    <Card variant="data" padding={4} hoverLift={false}>
      <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, color: DS.color.text.primary, marginBottom: DS.space[2] }}>확인할 일 <span style={{ color: DS.color.text.muted, fontWeight: 500, fontSize: DS.font.size.body }}>{todos.length}</span></div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {todos.map((t) => (
          <button
            key={t.key}
            type="button"
            onClick={go(t.to, !!t.ym)}
            style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, width: '100%', textAlign: 'left', padding: '10px 12px', borderRadius: DS.radius.control, border: `1px solid ${t.tone === 'warning' ? DS.color.warning.border : DS.color.border.subtle}`, background: t.tone === 'warning' ? DS.color.warning.soft : DS.color.bg.subtle, color: DS.color.text.primary, fontSize: DS.font.size.body, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <span>{t.text}</span>
            <span style={{ color: DS.color.text.muted, flexShrink: 0 }} aria-hidden>›</span>
          </button>
        ))}
      </div>
    </Card>
  )
}

/* ───────────── 자산: 구성·성장·투자 손익 ───────────── */

export function AssetOverviewWidget({ period }: WidgetProps) {
  const go = useGo(period)
  const a = useDashboardAssetStats(period)
  const catColors: Record<string, string> = { 저축: DS.color.category.savings, 투자: DS.color.category.invest, 부동산: DS.color.category.realEstate }
  const baselineLabel = a.baselineMonthIdx === 0 ? '연초(1월)' : `${a.baselineMonthIdx + 1}월`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space[3] }}>
      <div style={{ display: 'grid', gap: DS.space[3], gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))' }}>
        <StatCard
          onClick={go('/assets')}
          label={`올해 자산 성장 · ${baselineLabel} 대비`}
          value={a.baselineAsset > 0 ? signed(a.ytdDelta) : '—'}
          valueColor={a.baselineAsset > 0 ? deltaColor(a.ytdDelta) : DS.color.text.muted}
          sub={a.baselineAsset > 0 ? `${pctText(a.ytdPct)} · 기준 ${baselineLabel} ${won(a.baselineAsset)}` : '올해 입력된 자산 데이터가 없어요'}
        />
        <StatCard
          onClick={go('/assets')}
          label={`${monthWord(period)} · 투자 손익`}
          value={a.investPnlEntered ? signed(a.investPnl) : '입력 없음'}
          valueColor={a.investPnlEntered ? deltaColor(a.investPnl) : DS.color.text.muted}
          sub={
            a.investBalance <= 0
              ? '투자 자산이 없어요'
              : !a.investPnlEntered
                ? '자산 탭에서 평가손익을 입력해 주세요'
                : a.investBasis > 0
                  ? <>원금 {won(a.investBasis)} · 수익률 <DeltaText value={a.investPnl}>{pctText((a.investPnl / a.investBasis) * 100)}</DeltaText></>
                  : undefined
          }
        />
      </div>

      {a.totalAsset > 0 && (
        <Card variant="data" padding={4} hoverLift={false}>
          <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, color: DS.color.text.primary, marginBottom: DS.space[3] }}>자산 구성 <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, fontWeight: 500 }}>{monthWord(period)}</span></div>
          <div role="img" aria-label="카테고리별 자산 구성 막대" style={{ display: 'flex', width: '100%', height: 14, borderRadius: 999, overflow: 'hidden', gap: 2 }}>
            {a.categoryTotals.map(({ cat, total }) => {
              const pct = (total / a.totalAsset) * 100
              return pct < 0.5 ? null : <div key={cat} style={{ width: `${pct}%`, height: '100%', background: catColors[cat] ?? DS.color.text.muted, borderRadius: 999 }} />
            })}
          </div>
          <div style={{ display: 'flex', gap: '6px 16px', marginTop: 10, flexWrap: 'wrap' }}>
            {a.categoryTotals.map(({ cat, total }) => (
              <div key={cat} style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: DS.font.size.caption, ...tabularNums }}>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: catColors[cat] ?? DS.color.text.muted }} />
                <span style={{ color: DS.color.text.secondary }}>{cat}</span>
                <span style={{ fontWeight: 600, color: DS.color.text.primary }}>{won(total)}</span>
                <span style={{ color: DS.color.text.secondary }}>({((total / a.totalAsset) * 100).toFixed(1)}%)</span>
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  )
}

/* ───────────── 자산: 추이 ───────────── */

export function AssetTrendWidget({ period }: WidgetProps) {
  const items = useAssetStore((s) => s.items)
  const entries = useAssetStore((s) => s.entries)
  const getEntry = useAssetStore((s) => s.getEntry)
  const focus = parseYM(period.focusYM)
  const year = period.year

  const { total, available, lastIdx } = useMemo(() => {
    const last = year > focus.year ? -1 : year === focus.year ? focus.monthIdx : 11
    const assetItems = items.filter((i) => ASSET_CATEGORIES.includes(i.category))
    const amount = (item: AssetItem, mi: number) => getEffectiveEntry(item, year, mi, getEntry)
    const t: (number | null)[] = []
    const av: (number | null)[] = []
    for (let mi = 0; mi < 12; mi++) {
      if (mi > last) { t.push(null); av.push(null); continue }
      t.push(assetItems.reduce((s, it) => s + amount(it, mi), 0))
      av.push(assetItems.filter((it) => !it.locked).reduce((s, it) => s + amount(it, mi), 0))
    }
    return { total: t, available: av, lastIdx: last }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, entries, getEntry, year, focus.year, focus.monthIdx])

  const allZero = total.every((v) => v === null || v === 0)
  const totalMin = Math.min(...total.filter((v): v is number => v !== null && v > 0))
  const showAvailable = available.every((v) => v === null || v <= 0 || v >= totalMin * 0.5)
  return (
    <ChartCard
      title="자산 변화 추이"
      info="자산 탭과 같은 기준이에요. 입력하지 않은 달은 직전 입력값에 월 납입액을 더해 추정하고, 이번 달 이후는 그리지 않아요. 가용 자산은 묶이지 않은(잠금 아님) 자산이에요."
      sub={`${year}년`}
      legend={<><LegendDot color={DS.color.primary} label="총 자산" line />{showAvailable && <LegendDot color={DS.color.chart[1]} label="가용 자산" />}</>}
      empty={allZero ? '해당 연도에 입력된 자산 데이터가 없어요' : undefined}
      chart={<AssetLineChart total={total} available={available} showAvailable={showAvailable} currentIdx={year === focus.year ? focus.monthIdx : -1} />}
      table={
        <DataTable
          head={['월', '총 자산', '가용 자산', '전월 대비']}
          rows={total.map((v, i) => {
            if (v === null) return null
            const prev = i > 0 ? total[i - 1] : null
            return [`${i + 1}월`, won(v), won(available[i] ?? 0), prev === null ? '—' : <DeltaText key={i} value={v - prev}>{signed(v - prev)}</DeltaText>]
          }).filter((r): r is ReactNode[] => r !== null)}
        />
      }
      footer={lastIdx >= 0 ? <>{lastIdx + 1}월 기준 총 자산 {won(total[lastIdx] ?? 0)}</> : undefined}
    />
  )
}

/* ───────────── 가계 흐름 ───────────── */

export function FlowMetricsWidget({ period, data }: WidgetProps) {
  const f = data.flow[period.monthIdx]
  const yearIncome = data.flow.reduce((s, x) => s + x.income, 0)
  const yearInvest = data.flow.reduce((s, x) => s + x.invest, 0)
  const yearRate = yearIncome > 0 ? (yearInvest / yearIncome) * 100 : null
  const segs = [
    ...FLOW_SERIES.map((s) => ({ label: s.label, color: s.color, value: f[s.key] })),
    { label: f.leftover < 0 ? '부족분' : '남는 돈', color: f.leftover < 0 ? DS.color.negative.main : DS.color.border.default, value: Math.abs(f.leftover) },
  ]
  const base = Math.max(f.income, f.spending + f.invest, 1)

  return (
    <Card variant="data" padding={5} hoverLift={false}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: DS.space[3] }}>
        <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, color: DS.color.text.primary }}>{period.monthIdx + 1}월 돈의 흐름</div>
        <InfoTip>수입에서 고정지출·별도지출·공동 생활비·저축/투자를 빼고 남는 돈이 용돈이에요. 지출 계획에서 시작한 달만 집계해요.</InfoTip>
      </div>
      {f.empty ? (
        <div style={{ padding: `${DS.space[5]}px 0`, textAlign: 'center', fontSize: DS.font.size.body, color: DS.color.text.muted }}>{period.monthIdx + 1}월은 지출 계획을 시작하지 않았어요</div>
      ) : (
        <>
          <div style={{ display: 'flex', gap: DS.space[4], flexWrap: 'wrap', marginBottom: DS.space[4] }}>
            <div style={{ flex: '1 1 150px' }}>
              <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>저축률</div>
              <div style={{ fontSize: DS.font.size.headline, fontWeight: 700, color: DS.color.text.primary, ...tabularNums }}>{f.savingRate === null ? '—' : `${f.savingRate.toFixed(1)}%`}</div>
              {yearRate !== null && <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, ...tabularNums }}>올해 평균 {yearRate.toFixed(1)}%</div>}
            </div>
            <div style={{ flex: '1 1 150px' }}>
              <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>남는 돈</div>
              <div style={{ fontSize: DS.font.size.headline, fontWeight: 700, color: f.leftover < 0 ? DS.color.negative.main : DS.color.text.primary, ...tabularNums }}>{f.leftover < 0 ? '-' : ''}{won(Math.abs(f.leftover))}</div>
              <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, ...tabularNums }}>수입 {won(f.income)}</div>
            </div>
          </div>
          <div role="img" aria-label="수입 대비 항목별 비중 막대" style={{ display: 'flex', height: 14, borderRadius: 999, overflow: 'hidden', gap: 2, background: DS.color.bg.muted }}>
            {segs.map((s) => (s.value > 0 ? <div key={s.label} style={{ width: `${(s.value / base) * 100}%`, background: s.color, borderRadius: 999 }} /> : null))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6, marginTop: DS.space[3] }}>
            {segs.map((s) => (
              <div key={s.label} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, fontSize: DS.font.size.body, ...tabularNums }}>
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, color: DS.color.text.body }}>
                  <span style={{ width: 10, height: 10, borderRadius: 4, background: s.color }} />
                  {s.label}
                </span>
                <span style={{ fontWeight: 600, color: DS.color.text.primary }}>
                  {won(s.value)} <span style={{ fontSize: DS.font.size.caption, fontWeight: 500, color: DS.color.text.secondary }}>{f.income > 0 ? `${((s.value / f.income) * 100).toFixed(0)}%` : ''}</span>
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </Card>
  )
}

export function FlowTrendWidget({ period, data }: WidgetProps) {
  const flow = data.flow
  const active = flow.filter((f) => !f.empty)
  const sum = (k: 'income' | 'invest' | 'leftover') => active.reduce((s, f) => s + f[k], 0)
  const rate = sum('income') > 0 ? (sum('invest') / sum('income')) * 100 : null
  return (
    <ChartCard
      title="월별 수입과 지출·저축"
      info="막대는 그 달에 나간 돈(고정+별도+공동 생활비+저축·투자), 점선은 수입이에요. 막대가 점선을 넘으면 수입보다 많이 쓴 달이에요. 지출 계획에서 시작한 달만 집계해요."
      sub={`${period.year}년`}
      legend={<>{FLOW_SERIES.map((s) => <LegendDot key={s.key} color={s.color} label={s.label} />)}<LegendDot color={DS.color.text.primary} label="수입" line dashed /></>}
      empty={active.length === 0 ? '해당 연도에 시작한 달이 없어요' : undefined}
      chart={<FlowChart flow={flow} selectedIdx={period.monthIdx} />}
      table={
        <DataTable
          head={['월', '수입', '고정', '별도', '생활비', '저축·투자', '남는 돈', '저축률']}
          rows={flow.map((f, i) => [`${i + 1}월`, ...(f.empty ? Array(7).fill('—') : [fmtWon(f.income), fmtWon(f.fixed), fmtWon(f.separate), fmtWon(f.living), fmtWon(f.invest), <DeltaText key="l" value={f.leftover}>{signed(f.leftover).replace('+', '')}</DeltaText>, f.savingRate === null ? '—' : `${f.savingRate.toFixed(1)}%`])])}
        />
      }
      footer={<>연간 수입 {won(sum('income'))} · 저축·투자 {won(sum('invest'))}{rate !== null ? ` (저축률 ${rate.toFixed(1)}%)` : ''} · 남는 돈 {won(sum('leftover'))}</>}
    />
  )
}

export function IncomeWidget({ period, data }: WidgetProps) {
  const total = data.incomeMonthly.reduce((a, b) => a + b, 0)
  return (
    <ChartCard
      title="월별 수입"
      info="지출 계획에서 시작한 달만 집계해요. 급여·추가 수입·기본급 제외 설정을 반영해요."
      sub={`${period.year}년`}
      empty={total === 0 ? '해당 연도에 집계된 수입이 없어요' : undefined}
      chart={<BarChart values={data.incomeMonthly} label="월별 수입 막대 그래프" />}
      table={<DataTable head={['월', '수입']} rows={data.incomeMonthly.map((v, i) => [`${i + 1}월`, v ? fmtWon(v) : '—'])} />}
      footer={<>연간 합계 {won(total)}</>}
    />
  )
}

export function InvestCumulativeWidget({ period, data }: WidgetProps) {
  const focus = parseYM(period.focusYM)
  const lastIdx = period.year < focus.year ? 11 : period.year > focus.year ? -1 : focus.monthIdx
  const endIdx = Math.max(lastIdx, 0)
  return (
    <ChartCard
      title="저축·투자 누적"
      info="지출 계획에서 시작한 달의 월 납부액을 1월부터 더한 값이에요(자산 잔액이 아니라 납입 누적). 정산 스냅샷이 있으면 그 투자 템플릿을 사용해요."
      sub={`${period.year}년`}
      empty={data.investMonthly.every((v) => v === 0) ? '해당 연도에 집계된 저축·투자가 없어요' : undefined}
      chart={<CumulativeChart values={data.investCumulative} lastIdx={lastIdx} label="저축·투자 누적 그래프" />}
      table={<DataTable head={['월', '납부', '누적']} rows={data.investMonthly.map((v, i) => [`${i + 1}월`, v ? fmtWon(v) : '—', i <= lastIdx ? fmtWon(data.investCumulative[i]) : '—'])} />}
      footer={<>{endIdx + 1}월 말 기준 누적 {won(data.investCumulative[endIdx] ?? 0)}</>}
    />
  )
}
