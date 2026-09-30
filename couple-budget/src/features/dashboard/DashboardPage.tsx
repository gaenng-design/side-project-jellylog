import { useMemo, useState, type ReactNode } from 'react'
import { DS } from '@/design-system/tokens'
import { Button } from '@/design-system/components/Button'
import { Switch } from '@/design-system/components/Switch'
import { InfoTip } from '@/design-system/components/InfoTip'
import { useAppStore } from '@/store/useAppStore'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { CustomSelect } from '@/components/CustomSelect'
import { Modal } from '@/components/Modal'
import { CATEGORY_SELECT_TRIGGER_WIDTH, pageTitleH1Style } from '@/styles/formControls'
import { getHouseholdFocusMonth, ym as toYM } from '@/lib/assetCalc'
import { getCycleRange } from '@/lib/sharedExpenseCycle'
import { DashboardSharedExpenseTrend } from './DashboardSharedExpenseTrend'
import { FixedExpenseWidget } from './FixedExpenseWidget'
import {
  AssetOverviewWidget,
  AssetTrendWidget,
  FlowMetricsWidget,
  FlowTrendWidget,
  GoalsWidget,
  IncomeWidget,
  InvestCumulativeWidget,
  KpiWidget,
  TodoWidget,
} from './DashboardWidgets'
import { useDashboardYearData, type DashboardPeriod, type DashboardYearData } from './useDashboardData'

export const DASHBOARD_TABS = [
  { key: 'summary', label: '요약' },
  { key: 'asset', label: '자산' },
  { key: 'flow', label: '가계 흐름' },
  { key: 'spending', label: '지출' },
] as const
export type DashboardTabKey = (typeof DASHBOARD_TABS)[number]['key']

/** 대시보드 위젯 정의 — 기본 순서이자 탭 배치. 표시/순서는 설정에 저장된다 */
export const DASHBOARD_WIDGETS = [
  { key: 'summary', tab: 'summary', label: '핵심 지표 카드', description: '총 자산 · 수입 · 지출 · 저축 · 남는 돈 · 공동 생활비' },
  { key: 'goals', tab: 'summary', label: '목표 진행률', description: '설정한 목표와 달성률' },
  { key: 'todos', tab: 'summary', label: '확인할 일', description: '정산 · 만기 임박 · 잔액 미입력 알림' },
  { key: 'assetOverview', tab: 'asset', label: '자산 성장 · 투자 손익 · 구성', description: '연초 대비 성장, 투자 손익, 카테고리 비중' },
  { key: 'assetTrend', tab: 'asset', label: '자산 변화 추이', description: '월별 총 자산 · 가용 자산' },
  { key: 'flowMetrics', tab: 'flow', label: '이번 달 돈의 흐름', description: '저축률 · 남는 돈 · 수입 대비 항목 비중' },
  { key: 'flowTrend', tab: 'flow', label: '월별 수입과 지출·저축', description: '수입 대비 지출·저축 추이' },
  { key: 'income', tab: 'flow', label: '월별 수입', description: '연간 월별 수입' },
  { key: 'investCumulative', tab: 'flow', label: '저축·투자 누적', description: '월별 납입 누적' },
  { key: 'fixedCategory', tab: 'spending', label: '고정지출 어디에 쓰나', description: '항목별 · 카테고리별, 연간/월' },
  { key: 'sharedTrend', tab: 'spending', label: '공동 생활비 추이', description: '월별 사용액 (카테고리별 스택)' },
] as const satisfies readonly { key: string; tab: DashboardTabKey; label: string; description: string }[]

export type DashboardWidgetKey = (typeof DASHBOARD_WIDGETS)[number]['key']

const TAB_STORAGE_KEY = 'dashboard-tab'
function readTab(): DashboardTabKey {
  try {
    const v = localStorage.getItem(TAB_STORAGE_KEY)
    if (DASHBOARD_TABS.some((t) => t.key === v)) return v as DashboardTabKey
  } catch {
    /* 저장소를 못 쓰는 환경 */
  }
  return 'summary'
}

/** 저장된 순서 + 새로 생긴 위젯을 기본 순서대로 뒤에 붙인 전체 순서 */
export function resolveWidgetOrder(stored: string[] | undefined): DashboardWidgetKey[] {
  const known = DASHBOARD_WIDGETS.map((w) => w.key) as DashboardWidgetKey[]
  const kept = (stored ?? []).filter((k): k is DashboardWidgetKey => (known as string[]).includes(k))
  return [...new Set([...kept, ...known])]
}

function renderWidget(key: DashboardWidgetKey, period: DashboardPeriod, data: DashboardYearData): ReactNode {
  const p = { period, data }
  switch (key) {
    case 'summary': return <KpiWidget {...p} />
    case 'goals': return <GoalsWidget {...p} />
    case 'todos': return <TodoWidget {...p} />
    case 'assetOverview': return <AssetOverviewWidget {...p} />
    case 'assetTrend': return <AssetTrendWidget {...p} />
    case 'flowMetrics': return <FlowMetricsWidget {...p} />
    case 'flowTrend': return <FlowTrendWidget {...p} />
    case 'income': return <IncomeWidget {...p} />
    case 'investCumulative': return <InvestCumulativeWidget {...p} />
    case 'fixedCategory': return <FixedExpenseWidget items={data.fixedItems} year={period.year} monthIdx={period.monthIdx} />
    case 'sharedTrend': return <DashboardSharedExpenseTrend period={period} />
  }
}

const MONTH_OPTIONS = Array.from({ length: 12 }, (_, i) => `${i + 1}월`)

/** 종합 요약 + 트렌드 시각화 — 연·월 하나를 골라 탭(요약/자산/가계 흐름/지출)별로 본다 */
export function DashboardPage() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const cycleStartDay = settings.sharedExpenseCycleStartDay ?? 1
  const widgetsMap = settings.dashboardWidgets ?? {}
  const order = useMemo(() => resolveWidgetOrder(settings.dashboardWidgetOrder), [settings.dashboardWidgetOrder])

  const [customizeOpen, setCustomizeOpen] = useState(false)
  const [tab, setTabState] = useState<DashboardTabKey>(readTab)
  const setTab = (t: DashboardTabKey) => {
    setTabState(t)
    try { localStorage.setItem(TAB_STORAGE_KEY, t) } catch { /* 무시 */ }
  }

  // 기준 달: 주기 기준 "이번 달"(자산 탭과 같은 규칙). 직접 고르면 그 달로 고정, "이번 달로"로 되돌린다
  const focus = getHouseholdFocusMonth(new Date(), cycleStartDay)
  const [picked, setPicked] = useState<{ year: number; monthIdx: number } | null>(null)
  const year = picked?.year ?? focus.year
  const monthIdx = picked?.monthIdx ?? focus.monthIdx
  const focusYM = toYM(focus.year, focus.monthIdx)
  const period: DashboardPeriod = {
    year,
    monthIdx,
    ym: toYM(year, monthIdx),
    focusYM,
    isCurrent: toYM(year, monthIdx) === focusYM,
    isFuture: toYM(year, monthIdx) > focusYM,
  }

  const data = useDashboardYearData(year)
  const cycle = getCycleRange(period.ym, cycleStartDay)

  const isVisible = (key: DashboardWidgetKey) => widgetsMap[key] !== false
  const toggle = (key: DashboardWidgetKey) => updateSettings({ dashboardWidgets: { ...widgetsMap, [key]: !isVisible(key) } })
  const showAll = () => updateSettings({ dashboardWidgets: Object.fromEntries(DASHBOARD_WIDGETS.map((w) => [w.key, true])) })
  const move = (key: DashboardWidgetKey, dir: -1 | 1) => {
    const tabKeys = order.filter((k) => DASHBOARD_WIDGETS.find((w) => w.key === k)?.tab === DASHBOARD_WIDGETS.find((w) => w.key === key)?.tab)
    const i = tabKeys.indexOf(key)
    const other = tabKeys[i + dir]
    if (!other) return
    const next = [...order]
    const a = next.indexOf(key)
    const b = next.indexOf(other)
    ;[next[a], next[b]] = [next[b], next[a]]
    updateSettings({ dashboardWidgetOrder: next })
  }

  const tabWidgets = order.filter((k) => DASHBOARD_WIDGETS.find((w) => w.key === k)?.tab === tab && isVisible(k))
  const tabCounts = (t: DashboardTabKey) => DASHBOARD_WIDGETS.filter((w) => w.tab === t && isVisible(w.key)).length

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100%', fontFamily: DS.font.family, color: DS.color.text.primary }}>
      {/* 제목 + 기준 달 선택 */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 6 }}>
        <h1 style={{ ...pageTitleH1Style, margin: 0 }}>대시보드</h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
          <YearSelectDropdown value={year} onChange={(y) => setPicked({ year: y, monthIdx })} variant="light" />
          <CustomSelect
            compact
            triggerWidth={CATEGORY_SELECT_TRIGGER_WIDTH}
            options={MONTH_OPTIONS}
            value={`${monthIdx + 1}월`}
            onChange={(v) => setPicked({ year, monthIdx: parseInt(v, 10) - 1 })}
          />
          {!period.isCurrent && (
            <Button size="sm" variant="soft" onClick={() => setPicked(null)}>이번 달로</Button>
          )}
          <Button size="sm" variant="secondary" onClick={() => setCustomizeOpen(true)} title="대시보드 커스텀">⚙️ 커스텀</Button>
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: DS.space[4], fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>
        <span>
          기준 {year}년 {monthIdx + 1}월{period.isCurrent ? ' (이번 달)' : period.isFuture ? ' (예상)' : ''} · {cycle.startLabel} ~ {cycle.endLabel}
        </span>
        <InfoTip>
          "이번 달"은 지출 주기(매월 {cycleStartDay > 1 ? `${cycleStartDay}일~다음 달 ${cycleStartDay - 1}일` : '1일~말일'})를 기준으로 해요. 주기 시작일이 주말·공휴일일 수 있어 3일 앞당겨 {cycleStartDay > 3 ? `${cycleStartDay - 3}일` : '시작일'}부터 다음 달로 넘어가고, 자산 탭도 같은 기준이에요.
        </InfoTip>
      </div>

      {/* 탭 */}
      <div role="tablist" aria-label="대시보드 구분" style={{ display: 'flex', gap: 4, padding: 4, marginBottom: DS.space[4], borderRadius: DS.radius.control, background: DS.color.bg.muted, overflowX: 'auto' }}>
        {DASHBOARD_TABS.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              data-compact
              onClick={() => setTab(t.key)}
              style={{ flex: '1 0 auto', height: 36, minHeight: 36, padding: '0 16px', borderRadius: DS.radius.control - 2, border: 'none', background: on ? DS.color.bg.secondary : 'transparent', color: on ? DS.color.text.primary : DS.color.text.secondary, fontWeight: on ? 700 : 500, fontSize: DS.font.size.body, boxShadow: on ? DS.shadow[1] : 'none', cursor: 'pointer', whiteSpace: 'nowrap', fontFamily: 'inherit' }}
            >
              {t.label}
              {tabCounts(t.key) === 0 && <span style={{ color: DS.color.text.disabled }}> ·꺼짐</span>}
            </button>
          )
        })}
      </div>

      <div role="tabpanel" style={{ display: 'flex', flexDirection: 'column', gap: DS.grid.gutter, minWidth: 0 }}>
        {tabWidgets.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', background: DS.color.bg.subtle, borderRadius: DS.radius.card, color: DS.color.text.secondary, fontSize: DS.font.size.body, lineHeight: 1.6 }}>
            이 탭에 표시할 위젯이 없어요.
            <br />
            우측 상단 <strong>⚙️ 커스텀</strong>에서 켜 주세요.
          </div>
        ) : (
          tabWidgets.map((k) => <div key={k} style={{ minWidth: 0 }}>{renderWidget(k, period, data)}</div>)
        )}
      </div>

      {/* 커스텀: 표시 여부 + 탭 안 순서 */}
      <Modal open={customizeOpen} title="대시보드 커스텀" onClose={() => setCustomizeOpen(false)}>
        <p style={{ fontSize: DS.font.size.body, color: DS.color.text.secondary, margin: '0 0 12px', lineHeight: 1.5 }}>
          위젯을 켜고 끄고, ▲▼로 탭 안 순서를 바꿀 수 있어요.
        </p>
        {DASHBOARD_TABS.map((t) => {
          const keys = order.filter((k) => DASHBOARD_WIDGETS.find((w) => w.key === k)?.tab === t.key)
          return (
            <div key={t.key} style={{ marginBottom: DS.space[3] }}>
              <div style={{ fontSize: DS.font.size.caption, fontWeight: 700, color: DS.color.text.secondary, margin: '8px 0 4px' }}>{t.label} 탭</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {keys.map((k, i) => {
                  const w = DASHBOARD_WIDGETS.find((x) => x.key === k)!
                  const on = isVisible(k)
                  return (
                    <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '8px 10px', borderRadius: DS.radius.control, background: on ? DS.color.primarySoft : DS.color.bg.secondary, border: `1px solid ${on ? DS.color.border.default : DS.color.border.subtle}` }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: DS.font.size.body, fontWeight: 600, color: on ? DS.color.primaryDark : DS.color.text.primary }}>{w.label}</div>
                        <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>{w.description}</div>
                      </div>
                      <Button size="sm" variant="secondary" aria-label={`${w.label} 위로`} disabled={i === 0} onClick={() => move(k, -1)}>▲</Button>
                      <Button size="sm" variant="secondary" aria-label={`${w.label} 아래로`} disabled={i === keys.length - 1} onClick={() => move(k, 1)}>▼</Button>
                      <Switch compact checked={on} onChange={() => toggle(k)} label={<span style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', clip: 'rect(0 0 0 0)' }}>{w.label} 표시</span>} />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 12 }}>
          <Button onClick={showAll}>전체 표시</Button>
          <Button variant="primary" onClick={() => setCustomizeOpen(false)}>완료</Button>
        </div>
      </Modal>
    </div>
  )
}
