import { useEffect, useMemo, useState } from 'react'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { incomeRepo } from '@/data/repository'
import type { Income } from '@/types'
import { DS, tabularNums } from '@/design-system/tokens'
import {
  buildYearFixedExpenseCategoryBreakdown,
  buildYearIncomeSeries,
  buildYearInvestMonthlySeries,
  cumulativeFromMonthly,
} from '@/lib/dashboardYearStats'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { Card } from '@/design-system/components/Card'
import { SpendingDonut } from '@/design-system/components/SpendingDonut'
import { useChartTooltip } from './useChartTooltip'

/** 그래프 툴팁 공통 라벨 포맷 */
const fmtFull = (n: number) => `${n.toLocaleString('ko-KR')}원`

/**
 * 카테고리 비중 도넛 — SVG 기반, 세그먼트 호버 시 강조 + 중앙 라벨 갱신.
 * - props.items 는 amount 기준 정렬된 카테고리 리스트
 * - hoverIdx 가 null 이면 합계 표시, 값이 있으면 그 항목의 카테고리/금액/비율
 */
function FixedCategoryDonut({
  items,
  size = 176,
  thickness = 22,
  hoverIdx,
  onHover,
}: {
  items: { category: string; amount: number; color: string; pct: number }[]
  size?: number
  thickness?: number
  hoverIdx: number | null
  onHover: (i: number | null) => void
}) {
  const total = items.reduce((s, it) => s + it.amount, 0) || 1
  const cx = size / 2
  const cy = size / 2
  const outerR = size / 2 - 4
  const innerR = outerR - thickness
  let acc = 0
  const segments = items.map((it, i) => {
    const startA = (acc / total) * Math.PI * 2 - Math.PI / 2
    acc += it.amount
    const endA = (acc / total) * Math.PI * 2 - Math.PI / 2
    const large = endA - startA > Math.PI ? 1 : 0
    const x1 = cx + outerR * Math.cos(startA)
    const y1 = cy + outerR * Math.sin(startA)
    const x2 = cx + outerR * Math.cos(endA)
    const y2 = cy + outerR * Math.sin(endA)
    const x3 = cx + innerR * Math.cos(endA)
    const y3 = cy + innerR * Math.sin(endA)
    const x4 = cx + innerR * Math.cos(startA)
    const y4 = cy + innerR * Math.sin(startA)
    const d = `M ${x1} ${y1} A ${outerR} ${outerR} 0 ${large} 1 ${x2} ${y2} L ${x3} ${y3} A ${innerR} ${innerR} 0 ${large} 0 ${x4} ${y4} Z`
    return { d, color: it.color, idx: i }
  })

  const hovered = hoverIdx !== null ? items[hoverIdx] : null

  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {segments.map((s) => (
          <path
            key={s.idx}
            d={s.d}
            fill={s.color}
            stroke="#fff"
            strokeWidth={1}
            opacity={hoverIdx === null || hoverIdx === s.idx ? 1 : 0.32}
            style={{ cursor: 'pointer', transition: 'opacity 0.15s' }}
            onMouseEnter={() => onHover(s.idx)}
            onMouseLeave={() => onHover(null)}
          />
        ))}
      </svg>
      {/* 중앙 라벨 — 호버 시 카테고리, 미호버 시 합계 */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          pointerEvents: 'none',
          padding: '0 12px',
        }}
      >
        {hovered ? (
          <>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                color: hovered.color,
                marginBottom: 2,
                maxWidth: innerR * 1.5,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
              title={hovered.category}
            >
              {hovered.category}
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: DS.color.text.primary, ...tabularNums }}>
              {hovered.pct < 10 ? hovered.pct.toFixed(1) : Math.round(hovered.pct)}%
            </div>
            <div style={{ fontSize: 10, color: DS.color.text.secondary, marginTop: 2, ...tabularNums }}>
              {hovered.amount.toLocaleString('ko-KR')}원
            </div>
          </>
        ) : (
          <>
            <div style={{ fontSize: 10, color: DS.color.text.secondary, marginBottom: 2 }}>합계</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: DS.color.text.primary, ...tabularNums }}>
              {total.toLocaleString('ko-KR')}원
            </div>
          </>
        )}
      </div>
    </div>
  )
}

const MONTH_LABELS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'

/** 원형 그래프 조각 색 (DS 프라이머리 톤 + 대비) */
const FIXED_DONUT_PALETTE = [
  '#4F8CFF',
  '#60A5FA',
  '#34D399',
  '#FBBF24',
  '#A78BFA',
  '#FB7185',
  '#2DD4BF',
  '#818CF8',
  '#F472B6',
  '#38BDF8',
  '#4ADE80',
  '#FACC15',
  '#94A3B8',
]

function useDashboardYearSeries(year: number) {
  const [incomes, setIncomes] = useState<Income[]>([])
  const startedMonths = useAppStore((s) => s.startedMonths)
  const settings = useAppStore((s) => s.settings)
  const defaultSalaryExcludedByMonth = usePlanExtraStore((s) => s.defaultSalaryExcludedByMonth)
  const extraRowsByMonth = usePlanExtraStore((s) => s.extraRowsByMonth)
  const templateSnapshotsByMonth = usePlanExtraStore((s) => s.templateSnapshotsByMonth)

  const getSortedFixedTemplates = useFixedTemplateStore((s) => s.getSortedTemplates)
  const fixedTemplates = useMemo(() => getSortedFixedTemplates(), [getSortedFixedTemplates])
  const getFixedMonthlyAmount = useFixedTemplateStore((s) => s.getMonthlyAmount)
  const isFixedExcluded = useFixedTemplateStore((s) => s.isExcluded)
  const fixedTemplatesKey = useFixedTemplateStore((s) => s.templates)
  const fixedExclusions = useFixedTemplateStore((s) => s.exclusions)
  const fixedMonthlyAmounts = useFixedTemplateStore((s) => s.monthlyAmounts)

  const getSortedInvestTemplates = useInvestTemplateStore((s) => s.getSortedTemplates)
  const investTemplates = useMemo(() => getSortedInvestTemplates(), [getSortedInvestTemplates])
  const getInvestMonthlyAmount = useInvestTemplateStore((s) => s.getMonthlyAmount)
  const isInvestExcluded = useInvestTemplateStore((s) => s.isExcluded)
  const investTemplatesKey = useInvestTemplateStore((s) => s.templates)
  const investExclusions = useInvestTemplateStore((s) => s.exclusions)
  const investMonthlyAmounts = useInvestTemplateStore((s) => s.monthlyAmounts)

  useEffect(() => {
    let cancelled = false
    const prefix = `${year}-`
    void incomeRepo.query((i) => i.yearMonth.startsWith(prefix)).then((rows) => {
      if (!cancelled) setIncomes(rows)
    })
    return () => {
      cancelled = true
    }
  }, [year])

  const incomeMonthly = useMemo(
    () =>
      buildYearIncomeSeries(year, incomes, startedMonths, settings, defaultSalaryExcludedByMonth),
    [year, incomes, startedMonths, settings, defaultSalaryExcludedByMonth],
  )

  const investMonthly = useMemo(
    () =>
      buildYearInvestMonthlySeries(
        year,
        startedMonths,
        templateSnapshotsByMonth,
        investTemplates,
        getInvestMonthlyAmount,
        isInvestExcluded,
        extraRowsByMonth,
      ),
    [
      year,
      startedMonths,
      templateSnapshotsByMonth,
      investTemplates,
      getInvestMonthlyAmount,
      isInvestExcluded,
      extraRowsByMonth,
      investTemplatesKey,
      investExclusions,
      investMonthlyAmounts,
    ],
  )

  const investCumulative = useMemo(() => cumulativeFromMonthly(investMonthly), [investMonthly])

  const fixedCategoryBreakdown = useMemo(
    () =>
      buildYearFixedExpenseCategoryBreakdown(
        year,
        startedMonths,
        templateSnapshotsByMonth,
        fixedTemplates,
        getFixedMonthlyAmount,
        isFixedExcluded,
        extraRowsByMonth,
      ),
    [
      year,
      startedMonths,
      templateSnapshotsByMonth,
      fixedTemplates,
      getFixedMonthlyAmount,
      isFixedExcluded,
      extraRowsByMonth,
      fixedTemplatesKey,
      fixedExclusions,
      fixedMonthlyAmounts,
    ],
  )

  return { incomeMonthly, investMonthly, investCumulative, fixedCategoryBreakdown }
}

const VB_W = 720
const VB_H = 220
const PAD_L = 44
const PAD_R = 16
const PAD_T = 16
const PAD_B = 36

/**
 * 연간 고정지출 카테고리 비중 — 도넛 + 범례 (호버 연동).
 * 항상 중앙 정렬, column 레이아웃이라 뷰포트 폭에 따라 범례가 멀어지지 않음.
 */
function FixedCategoryBreakdownBlock({
  breakdown,
}: {
  breakdown: { category: string; amount: number; pct: number }[]
}) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const items = breakdown.map((r, i) => ({
    category: r.category,
    amount: r.amount,
    pct: r.pct,
    color: FIXED_DONUT_PALETTE[i % FIXED_DONUT_PALETTE.length],
  }))

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: DS.space[4],
      }}
    >
      <FixedCategoryDonut
        items={items}
        size={176}
        thickness={22}
        hoverIdx={hoverIdx}
        onHover={setHoverIdx}
      />
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: DS.space[2],
          width: '100%',
          maxWidth: 360,
        }}
      >
        {items.map((row, i) => {
          const isActive = hoverIdx === i
          const isOther = hoverIdx !== null && !isActive
          return (
            <div
              key={row.category}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: DS.space[3],
                padding: '4px 8px',
                borderRadius: 6,
                background: isActive ? 'rgba(79, 140, 255, 0.08)' : 'transparent',
                opacity: isOther ? 0.45 : 1,
                cursor: 'pointer',
                transition: 'opacity 0.15s, background 0.15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: 4,
                    flexShrink: 0,
                    background: row.color,
                  }}
                />
                <span
                  style={{
                    fontSize: DS.font.caption.size,
                    color: isActive ? DS.color.text.primary : DS.color.text.secondary,
                    fontWeight: isActive ? 600 : 400,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={row.category}
                >
                  {row.category}
                </span>
              </div>
              <span
                style={{
                  fontSize: DS.font.caption.size,
                  fontWeight: 600,
                  color: DS.color.text.primary,
                  flexShrink: 0,
                  ...tabularNums,
                }}
              >
                {row.pct < 10 ? row.pct.toFixed(1) : Math.round(row.pct)}% · {fmt(row.amount)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}

function MonthlyIncomeBarChart({ values }: { values: number[] }) {
  const maxV = Math.max(1, ...values)
  const innerW = VB_W - PAD_L - PAD_R
  const innerH = VB_H - PAD_T - PAD_B
  const gap = 6
  const n = 12
  const barW = (innerW - gap * (n - 1)) / n
  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      height={240}
      role="img"
      aria-label="월별 수입 막대 그래프"
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <defs>
        <linearGradient id="dashIncomeBar" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={DS.color.primary} stopOpacity={0.95} />
          <stop offset="100%" stopColor={DS.color.primary} stopOpacity={0.55} />
        </linearGradient>
      </defs>
      {/* 축 가이드 */}
      <line
        x1={PAD_L}
        y1={PAD_T + innerH}
        x2={VB_W - PAD_R}
        y2={PAD_T + innerH}
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={1}
      />
      {[
        { t: 1, label: fmt(Math.round(maxV)) },
        { t: 0.5, label: fmt(Math.round(maxV * 0.5)) },
        { t: 0, label: fmt(0) },
      ].map(({ t, label }) => {
        const y = PAD_T + innerH * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y} x2={VB_W - PAD_R} y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
            <text
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill={DS.color.text.secondary}
              style={{ ...tabularNums, fontFamily: DS.font.family }}
            >
              {label}
            </text>
          </g>
        )
      })}
      {values.map((v, i) => {
        const h = (v / maxV) * innerH
        const x = PAD_L + i * (barW + gap)
        const y = PAD_T + innerH - h
        return (
          <g key={i}>
            <rect
              x={x}
              y={y}
              width={barW}
              height={Math.max(h, v > 0 ? 2 : 0)}
              rx={6}
              fill="url(#dashIncomeBar)"
            />
            {/* 투명 hit 영역 (전체 컬럼) */}
            <rect
              x={x}
              y={PAD_T}
              width={barW}
              height={innerH}
              fill="transparent"
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHover(i)}
              onMouseLeave={() => setHover(null)}
              onClick={(e) => {
                e.stopPropagation()
                setClick(i)
              }}
            />
            <text
              x={x + barW / 2}
              y={VB_H - 10}
              textAnchor="middle"
              fontSize={11}
              fill={DS.color.text.secondary}
              style={{ fontFamily: DS.font.family }}
            >
              {MONTH_LABELS[i]}
            </text>
          </g>
        )
      })}
      {/* 툴팁 */}
      {activeIdx !== null && (() => {
        const i = activeIdx
        const v = values[i] ?? 0
        const x = PAD_L + i * (barW + gap) + barW / 2
        const valueLabel = fmtFull(v)
        const monthLabel = `${MONTH_LABELS[i]}월`
        const w = Math.max(72, Math.max(valueLabel.length, monthLabel.length) * 7 + 16)
        const h = 36
        let tx = x - w / 2
        if (tx < PAD_L) tx = PAD_L
        if (tx + w > VB_W - PAD_R) tx = VB_W - PAD_R - w
        const y = PAD_T + innerH - (v / maxV) * innerH
        const ty = Math.max(PAD_T, y - h - 6)
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={w} height={h} rx={6} fill="#111827" opacity={0.92} />
            <text x={tx + 8} y={ty + 14} fontSize={10.5} fill="#9ca3af" style={tabularNums}>{monthLabel}</text>
            <text x={tx + 8} y={ty + 28} fontSize={11} fill="#fff" style={{ ...tabularNums, fontWeight: 600 }}>{valueLabel}</text>
          </g>
        )
      })()}
    </svg>
  )
}

function InvestCumulativeChart({ cumulative, lastMonthIdx }: { cumulative: number[]; lastMonthIdx: number }) {
  const maxV = Math.max(1, ...cumulative)
  const innerW = VB_W - PAD_L - PAD_R
  const innerH = VB_H - PAD_T - PAD_B
  const stepX = innerW / 11

  const visibleEnd = Math.max(-1, Math.min(11, lastMonthIdx))
  const pts = cumulative
    .slice(0, visibleEnd + 1)
    .map((v, i) => ({
      x: PAD_L + i * stepX,
      y: PAD_T + innerH - (v / maxV) * innerH,
    }))
  const linePts = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const baseY = PAD_T + innerH
  const areaD =
    pts.length > 0
      ? [`M ${PAD_L},${baseY}`, ...pts.map((p) => `L ${p.x},${p.y}`), `L ${pts[pts.length - 1].x},${baseY}`, 'Z'].join(' ')
      : ''
  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VB_W} ${VB_H}`}
      width="100%"
      height={240}
      role="img"
      aria-label="저축·투자 누적 그래프"
      style={{ display: 'block', maxWidth: '100%' }}
    >
      <defs>
        <linearGradient id="dashInvestFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={DS.color.success} stopOpacity={0.35} />
          <stop offset="100%" stopColor={DS.color.success} stopOpacity={0.04} />
        </linearGradient>
      </defs>
      <line
        x1={PAD_L}
        y1={baseY}
        x2={VB_W - PAD_R}
        y2={baseY}
        stroke="rgba(0,0,0,0.08)"
        strokeWidth={1}
      />
      {[
        { t: 1, label: fmt(Math.round(maxV)) },
        { t: 0.5, label: fmt(Math.round(maxV * 0.5)) },
        { t: 0, label: fmt(0) },
      ].map(({ t, label }) => {
        const y = PAD_T + innerH * (1 - t)
        return (
          <g key={t}>
            <line x1={PAD_L} y1={y} x2={VB_W - PAD_R} y2={y} stroke="rgba(0,0,0,0.04)" strokeWidth={1} />
            <text
              x={PAD_L - 8}
              y={y + 4}
              textAnchor="end"
              fontSize={10}
              fill={DS.color.text.secondary}
              style={{ ...tabularNums, fontFamily: DS.font.family }}
            >
              {label}
            </text>
          </g>
        )
      })}
      <path d={areaD} fill="url(#dashInvestFill)" />
      <polyline
        fill="none"
        stroke={DS.color.success}
        strokeWidth={2.5}
        strokeLinejoin="round"
        strokeLinecap="round"
        points={linePts}
      />
      {pts.map((p, i) => (
        <circle key={i} cx={p.x} cy={p.y} r={4} fill="#fff" stroke={DS.color.success} strokeWidth={2} />
      ))}
      {MONTH_LABELS.map((label, i) => {
        const x = PAD_L + i * stepX
        return (
          <text
            key={i}
            x={x}
            y={VB_H - 10}
            textAnchor="middle"
            fontSize={11}
            fill={DS.color.text.secondary}
            style={{ fontFamily: DS.font.family }}
          >
            {label}
          </text>
        )
      })}
      {/* hit 영역 (전체 12개월 컬럼) */}
      {MONTH_LABELS.map((_, i) => {
        if (i > visibleEnd) return null
        const cx = PAD_L + i * stepX
        return (
          <rect
            key={`hit-${i}`}
            x={cx - stepX / 2}
            y={PAD_T}
            width={stepX}
            height={innerH}
            fill="transparent"
            style={{ cursor: 'pointer' }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            onClick={(e) => {
              e.stopPropagation()
              setClick(i)
            }}
          />
        )
      })}
      {/* 툴팁 */}
      {activeIdx !== null && activeIdx <= visibleEnd && (() => {
        const i = activeIdx
        const v = cumulative[i] ?? 0
        const cx = PAD_L + i * stepX
        const cy = PAD_T + innerH - (v / maxV) * innerH
        const monthLabel = `${MONTH_LABELS[i]}월`
        const valueLabel = fmtFull(v)
        const w = Math.max(72, Math.max(valueLabel.length, monthLabel.length + 6) * 7 + 16)
        const h = 36
        let tx = cx + 8
        if (tx + w > VB_W - PAD_R) tx = cx - w - 8
        const ty = Math.max(PAD_T, cy - h - 6)
        return (
          <g pointerEvents="none">
            <rect x={tx} y={ty} width={w} height={h} rx={6} fill="#111827" opacity={0.92} />
            <text x={tx + 8} y={ty + 14} fontSize={10.5} fill="#9ca3af" style={tabularNums}>{`${monthLabel} 누적`}</text>
            <text x={tx + 8} y={ty + 28} fontSize={11} fill="#fff" style={{ ...tabularNums, fontWeight: 600 }}>{valueLabel}</text>
          </g>
        )
      })()}
    </svg>
  )
}

export function DashboardYearCharts() {
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const initialYear = useMemo(() => {
    const y = Number(String(currentYearMonth).split('-')[0])
    return Number.isFinite(y) ? y : new Date().getFullYear()
  }, [currentYearMonth])

  const [year, setYear] = useState(initialYear)
  useEffect(() => {
    setYear(initialYear)
  }, [initialYear])

  const { incomeMonthly, investCumulative, fixedCategoryBreakdown } = useDashboardYearSeries(year)

  const lastMonthIdx = useMemo(() => {
    const [yStr, mStr] = String(currentYearMonth).split('-')
    const curY = parseInt(yStr, 10)
    const curM = parseInt(mStr, 10) - 1
    if (year < curY) return 11
    if (year > curY) return -1
    return curM
  }, [currentYearMonth, year])

  const yearEndNote = useMemo(() => {
    const totalIncome = incomeMonthly.reduce((a, b) => a + b, 0)
    const endIdx = lastMonthIdx >= 0 ? lastMonthIdx : 0
    const endCum = investCumulative[endIdx] ?? 0
    const totalFixed = fixedCategoryBreakdown.reduce((a, r) => a + r.amount, 0)
    return { totalIncome, endCum, totalFixed, endIdx }
  }, [incomeMonthly, investCumulative, fixedCategoryBreakdown, lastMonthIdx])

  return (
    <div
      style={{
        gridColumn: 'span 12',
        display: 'flex',
        flexDirection: 'column',
        gap: DS.grid.gutter,
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: DS.space[3] }}>
        <div style={{ fontSize: DS.font.title2.size, fontWeight: DS.font.title2.weight, color: DS.color.text.primary }}>
          {year}년 요약
        </div>
        <YearSelectDropdown value={year} onChange={setYear} variant="light" />
      </div>

      <Card variant="data" padding={5} hoverLift={false}>
        <div style={{ fontSize: DS.font.title2.size, fontWeight: DS.font.title2.weight, marginBottom: DS.space[2] }}>월별 수입</div>
        <div style={{ fontSize: DS.font.caption.size, color: DS.color.text.secondary, marginBottom: DS.space[4], lineHeight: 1.5 }}>
          지출 계획에서 해당 월을 시작한 경우에만 집계됩니다. 급여 행·추가 수입·기본급 제외 설정을 반영합니다.
        </div>
        <MonthlyIncomeBarChart values={incomeMonthly} />
        <div
          style={{
            fontSize: DS.font.caption.size,
            color: DS.color.text.secondary,
            marginTop: DS.space[3],
            ...tabularNums,
          }}
        >
          연간 합계 {fmt(yearEndNote.totalIncome)}
        </div>
      </Card>

      <Card variant="data" padding={5} hoverLift={false}>
        <div style={{ fontSize: DS.font.title2.size, fontWeight: DS.font.title2.weight, marginBottom: DS.space[2] }}>
          연간 고정지출 · 카테고리 비중
        </div>
        <div style={{ fontSize: DS.font.caption.size, color: DS.color.text.secondary, marginBottom: DS.space[4], lineHeight: 1.5 }}>
          지출 계획에서 시작한 달만 포함합니다. 월별 고정지출(템플릿·월 금액·이번 달만 제외·고정 카드 추가 행)을 카테고리별로 더한 뒤, 연간 합계 대비 비율을 표시합니다. 정산 스냅샷이 있으면 그 고정 템플릿을 사용합니다.
        </div>
        {fixedCategoryBreakdown.length === 0 ? (
          <div
            style={{
              fontSize: DS.font.caption.size,
              color: DS.color.text.secondary,
              padding: `${DS.space[6]}px 0`,
              textAlign: 'center',
            }}
          >
            해당 연도에 집계된 고정지출이 없습니다.
          </div>
        ) : (
          <>
            <FixedCategoryBreakdownBlock breakdown={fixedCategoryBreakdown} />
            <div
              style={{
                fontSize: DS.font.caption.size,
                color: DS.color.text.secondary,
                marginTop: DS.space[4],
                textAlign: 'center',
                ...tabularNums,
              }}
            >
              연간 고정지출 합계 {fmt(yearEndNote.totalFixed)}
            </div>
          </>
        )}
      </Card>

      <Card variant="data" padding={5} hoverLift={false}>
        <div style={{ fontSize: DS.font.title2.size, fontWeight: DS.font.title2.weight, marginBottom: DS.space[2] }}>
          저축·투자 누적
        </div>
        <div style={{ fontSize: DS.font.caption.size, color: DS.color.text.secondary, marginBottom: DS.space[4], lineHeight: 1.5 }}>
          지출 계획에서 시작한 달만 월 납부액에 포함합니다. 누적은 해당 연 1월~각 월까지의 합입니다. 정산 스냅샷이 있으면 그 투자 템플릿을 사용합니다.
        </div>
        <InvestCumulativeChart cumulative={investCumulative} lastMonthIdx={lastMonthIdx} />
        <div
          style={{
            fontSize: DS.font.caption.size,
            color: DS.color.text.secondary,
            marginTop: DS.space[3],
            ...tabularNums,
          }}
        >
          {yearEndNote.endIdx + 1}월 말 기준 누적 {fmt(yearEndNote.endCum)}
        </div>
      </Card>
    </div>
  )
}
