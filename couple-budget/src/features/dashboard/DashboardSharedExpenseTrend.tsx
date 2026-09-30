import { useMemo, useState } from 'react'
import { DS } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { useSharedExpenseStore } from '@/store/useSharedExpenseStore'
import { useAppStore } from '@/store/useAppStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { PRIMARY } from '@/styles/formControls'
import { resolveCategoryColor } from '@/lib/categoryColors'
import { useChartTooltip } from './useChartTooltip'
import { Segmented, fmtAxis, useElementWidth } from './chartKit'
import type { DashboardPeriod } from './useDashboardData'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const tabularNums: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }

function ym(year: number, monthIdx: number) {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`
}

/**
 * 연도별 공동 생활비 트렌드
 * - 월별 사용액 막대 차트 + 목표 라인
 * - 카테고리별 비중 (이번 달)
 */
export function DashboardSharedExpenseTrend({ period }: { period: DashboardPeriod }) {
  const year = period.year
  const entries = useSharedExpenseStore((s) => s.entries)
  const items = useSharedExpenseStore((s) => s.items)
  const categoryColors = useSharedExpenseStore((s) => s.categoryColors)
  const sharedLivingCostTarget = useAppStore((s) => s.settings.sharedLivingCost ?? 0)
  const sharedByMonth = usePlanExtraStore((s) => s.sharedLivingCostByMonth)
  const currentYear = period.year
  const currentMonth = period.monthIdx
  const [wrapRef, W] = useElementWidth()
  const [scope, setScope] = useState<'year' | 'month'>('year')

  const { monthly, monthlyByCategory, target, maxVal, totalUsed, categoryBreakdown } = useMemo(() => {
    const itemCategoryMap = new Map(items.map((it) => [it.id, it.category]))
    const monthlyArr: number[] = Array.from({ length: 12 }, () => 0)
    // 월별 카테고리 분해 — Map 으로 누적 후 배열로 변환
    const monthlyByCatMaps: Map<string, number>[] = Array.from(
      { length: 12 },
      () => new Map<string, number>(),
    )
    for (const e of entries) {
      if (!e.yearMonth.startsWith(String(year))) continue
      if (e.excluded) continue
      const mi = parseInt(e.yearMonth.split('-')[1], 10) - 1
      if (mi < 0 || mi >= 12) continue
      monthlyArr[mi] += e.amount
      const cat = itemCategoryMap.get(e.itemId) ?? '기타'
      monthlyByCatMaps[mi].set(cat, (monthlyByCatMaps[mi].get(cat) ?? 0) + e.amount)
    }
    // 카테고리별 (해당 연도 합계)
    const catMap = new Map<string, number>()
    for (let mi = 0; mi < 12; mi++) {
      for (const [cat, amt] of monthlyByCatMaps[mi]) {
        catMap.set(cat, (catMap.get(cat) ?? 0) + amt)
      }
    }
    const catBreak = Array.from(catMap.entries())
      .map(([category, amount]) => ({ category, amount }))
      .sort((a, b) => b.amount - a.amount)
    const catOrder = catBreak.map((x) => x.category)

    // 월별 카테고리 배열 — 누적 순서 고정(연간 합계 큰 카테고리부터)
    const monthlyByCat: { category: string; amount: number }[][] = monthlyByCatMaps.map((m) => {
      const arr = Array.from(m.entries()).map(([category, amount]) => ({ category, amount }))
      arr.sort((a, b) => catOrder.indexOf(a.category) - catOrder.indexOf(b.category))
      return arr
    })

    const totalUsedVal = monthlyArr.reduce((a, b) => a + b, 0)

    // 월별 목표 (override 우선, 없으면 설정 값)
    const targetArr: number[] = Array.from({ length: 12 }, (_, mi) => {
      const o = sharedByMonth[ym(year, mi)]
      return o ?? sharedLivingCostTarget
    })
    const maxV = Math.max(...monthlyArr, ...targetArr, 1)
    return {
      monthly: monthlyArr,
      monthlyByCategory: monthlyByCat,
      target: targetArr,
      maxVal: maxV,
      totalUsed: totalUsedVal,
      categoryBreakdown: catBreak,
    }
  }, [entries, items, year, sharedByMonth, sharedLivingCostTarget])

  const allZero = monthly.every((v) => v === 0)
  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()

  // SVG 막대 + 목표 라인
  const H = 220
  const padL = 44
  const padR = 16
  const padT = 16
  const padB = 24
  const innerW = W - padL - padR
  const innerH = H - padT - padB
  const barW = innerW / 12 - 4

  const pointX = (i: number) => padL + (innerW / 12) * i + (innerW / 12) / 2
  const pointY = (v: number) => padT + innerH - (v / maxVal) * innerH

  const targetPath = target
    .map((v, i) => `${i === 0 ? 'M' : 'L'} ${pointX(i)} ${pointY(v)}`)
    .join(' ')

  return (
    <Card variant="data" padding={5} hoverLift={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
        <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, color: DS.color.text.primary }}>공동 생활비 추이</div>
        <Segmented value={scope} onChange={setScope} options={[{ value: 'year', label: '연간' }, { value: 'month', label: `${period.monthIdx + 1}월` }]} />
      </div>
      {scope === 'year' && (
        <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, marginBottom: 8 }}>
          {year}년 합계 <strong style={{ color: PRIMARY }}>{fmt(totalUsed)}원</strong>
        </div>
      )}

      {scope === 'month' ? (
        <MonthView
          label={`${year}년 ${period.monthIdx + 1}월`}
          used={monthly[period.monthIdx]}
          prevUsed={period.monthIdx > 0 ? monthly[period.monthIdx - 1] : null}
          target={target[period.monthIdx]}
          entries={entries.filter((e) => e.yearMonth === period.ym && !e.excluded)}
          items={items}
          categoryColors={categoryColors}
        />
      ) : null}

      {scope === 'month' ? null : allZero ? (
        <div
          style={{
            padding: `${DS.space[6]}px 0`,
            textAlign: 'center',
            fontSize: DS.font.caption.size,
            color: DS.color.text.secondary,
          }}
        >
          해당 연도에 입력된 공동 생활비가 없습니다.
        </div>
      ) : (
        <>
          <div ref={wrapRef} style={{ width: '100%' }}>
            <svg
              ref={svgRef}
              width={W}
              height={H}
              viewBox={`0 0 ${W} ${H}`}
              style={{ display: 'block' }}
            >
              {/* 가로 그리드 */}
              {[0, 0.5, 1].map((p, i) => {
                const yPos = padT + innerH * (1 - p)
                return (
                  <g key={i}>
                    <line x1={padL} x2={W - padR} y1={yPos} y2={yPos} stroke={DS.color.border.subtle} strokeDasharray={p === 0 ? '0' : '3 3'} />
                    <text x={padL - 6} y={yPos + 4} fontSize={DS.font.size.caption} fill={DS.color.text.muted} textAnchor="end" style={tabularNums}>
                      {p === 0 ? 0 : fmtAxis(maxVal * p)}
                    </text>
                  </g>
                )
              })}
              {/* 막대 — 카테고리별로 스택 (아래 = 연간 합계 큰 카테고리) */}
              {monthly.map((v, i) => {
                const overTarget = target[i] > 0 && v > target[i]
                const isCurrent = year === currentYear && i === currentMonth
                const baseX = pointX(i) - barW / 2
                const baseY = padT + innerH
                const cats = monthlyByCategory[i]
                let yTop = baseY
                return (
                  <g key={i}>
                    {cats.map((seg, si) => {
                      const segH = (seg.amount / maxVal) * innerH
                      if (segH <= 0) return null
                      yTop -= segH
                      const { fg } = resolveCategoryColor(seg.category, categoryColors)
                      return (
                        <rect
                          key={si}
                          x={baseX}
                          y={yTop}
                          width={barW}
                          height={segH}
                          fill={fg}
                          opacity={isCurrent ? 0.95 : 0.75}
                        />
                      )
                    })}
                    {/* 초과 시 빨간 외곽선 */}
                    {overTarget && (
                      <rect
                        x={baseX}
                        y={padT + innerH - (v / maxVal) * innerH}
                        width={barW}
                        height={(v / maxVal) * innerH}
                        fill="none"
                        stroke={DS.color.negative.main}
                        strokeWidth={1.5}
                        rx={2}
                      />
                    )}
                  </g>
                )
              })}
              {/* 목표 라인 */}
              {sharedLivingCostTarget > 0 && (
                <path d={targetPath} fill="none" stroke={DS.color.text.muted} strokeWidth={1.5} strokeDasharray="4 3" />
              )}
              {/* x축 라벨 */}
              {Array.from({ length: 12 }, (_, i) => (
                <text key={i} x={pointX(i)} y={H - 6} fontSize={DS.font.size.caption} fill={DS.color.text.muted} textAnchor="middle">
                  {W >= 440 ? `${i + 1}월` : i + 1}
                </text>
              ))}
              {/* 투명 hit 영역 */}
              {monthly.map((_, i) => {
                const colW = innerW / 12
                return (
                  <rect
                    key={`hit-${i}`}
                    x={pointX(i) - colW / 2}
                    y={padT}
                    width={colW}
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
              {/* 툴팁 — 월별 사용/목표 + 상위 카테고리(최대 4개) */}
              {activeIdx !== null && (() => {
                const i = activeIdx
                const used = monthly[i] ?? 0
                const tgt = target[i] ?? 0
                const cats = monthlyByCategory[i]
                  .slice()
                  .sort((a, b) => b.amount - a.amount)
                  .slice(0, 4)
                const catLines = cats.map((c) => `· ${c.category} ${fmt(c.amount)}원`)
                const lines = [
                  `${i + 1}월`,
                  `사용 ${fmt(used)}원`,
                  ...(tgt > 0 ? [`목표 ${fmt(tgt)}원`] : []),
                  ...catLines,
                ]
                const lineH = 16
                const padX = 8
                const padY = 6
                const maxLineLen = Math.max(...lines.map((l) => l.length))
                const boxW = Math.max(110, maxLineLen * 11 + padX * 2)
                const boxH = lines.length * lineH + padY * 2
                let tx = pointX(i) + 8
                if (tx + boxW > W - padR) tx = pointX(i) - boxW - 8
                if (tx < padL) tx = padL
                const ty = Math.max(padT, pointY(Math.max(used, tgt)) - boxH - 6)
                return (
                  <g pointerEvents="none">
                    <rect x={tx} y={ty} width={boxW} height={boxH} rx={6} fill={DS.color.text.primary} opacity={0.92} />
                    {lines.map((l, li) => {
                      const isHeader = li === 0
                      const isCat = li >= (tgt > 0 ? 3 : 2)
                      return (
                        <text
                          key={li}
                          x={tx + padX}
                          y={ty + padY + (li + 1) * lineH - 3}
                          fontSize={DS.font.size.caption}
                          fill={isHeader ? DS.color.text.muted : isCat ? DS.color.border.default : DS.color.bg.secondary}
                          style={tabularNums}
                        >
                          {l}
                        </text>
                      )
                    })}
                  </g>
                )
              })()}
            </svg>
          </div>
          {/* 카테고리 범례 — 막대 색상 매핑 */}
          {categoryBreakdown.length > 0 && (
            <div
              style={{
                display: 'flex',
                gap: 12,
                marginTop: 8,
                fontSize: DS.font.size.caption,
                color: DS.color.text.secondary,
                flexWrap: 'wrap',
                alignItems: 'center',
              }}
            >
              {categoryBreakdown.map(({ category }) => {
                const { fg } = resolveCategoryColor(category, categoryColors)
                return (
                  <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                    <span
                      style={{
                        display: 'inline-block',
                        width: 12,
                        height: 8,
                        background: fg,
                        borderRadius: 2,
                      }}
                    />
                    {category}
                  </div>
                )
              })}
              <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <span
                  style={{
                    display: 'inline-block',
                    width: 12,
                    height: 8,
                    border: `1.5px solid ${DS.color.negative.main}`,
                    boxSizing: 'border-box',
                  }}
                />
                목표 초과
              </div>
              {sharedLivingCostTarget > 0 && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <span style={{ display: 'inline-block', width: 12, height: 2, borderTop: `2px dashed ${DS.color.text.muted}` }} />
                  목표 라인
                </div>
              )}
            </div>
          )}

          {/* 카테고리별 비중 (이번 연도) */}
          {categoryBreakdown.length > 0 && (
            <div style={{ marginTop: 16 }}>
              <div style={{ fontSize: DS.font.size.caption, fontWeight: 600, marginBottom: 8, color: DS.color.text.primary }}>
                카테고리별 비중
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {categoryBreakdown.slice(0, 5).map(({ category, amount }) => {
                  const pct = totalUsed > 0 ? (amount / totalUsed) * 100 : 0
                  const { bg, fg } = resolveCategoryColor(category, categoryColors)
                  return (
                    <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <span
                        style={{
                          flexShrink: 0,
                          fontSize: DS.font.size.caption,
                          fontWeight: 600,
                          color: fg,
                          background: bg,
                          padding: '2px 8px',
                          borderRadius: 999,
                          minWidth: 60,
                          textAlign: 'center',
                        }}
                      >
                        {category}
                      </span>
                      <div style={{ flex: 1, height: 6, background: DS.color.bg.muted, borderRadius: 999, overflow: 'hidden' }}>
                        <div
                          style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: fg,
                            borderRadius: 999,
                          }}
                        />
                      </div>
                      <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, minWidth: 90, textAlign: 'right', ...tabularNums }}>
                        {fmt(amount)}원 ({pct.toFixed(0)}%)
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </Card>
  )
}

/** 선택한 달 공동 생활비 — 사용/목표, 카테고리·항목별 사용처 */
function MonthView({
  label,
  used,
  prevUsed,
  target,
  entries,
  items,
  categoryColors,
}: {
  label: string
  used: number
  prevUsed: number | null
  target: number
  entries: { itemId: string; amount: number }[]
  items: { id: string; name: string; category: string }[]
  categoryColors: Record<string, string>
}) {
  const [showAll, setShowAll] = useState(false)
  const { byCat, byItem } = useMemo(() => {
    const info = new Map(items.map((it) => [it.id, it]))
    const cat = new Map<string, number>()
    const item = new Map<string, { name: string; category: string; amount: number }>()
    for (const e of entries) {
      const it = info.get(e.itemId)
      const c = it?.category ?? '기타'
      cat.set(c, (cat.get(c) ?? 0) + e.amount)
      const prev = item.get(e.itemId) ?? { name: it?.name ?? '기타', category: c, amount: 0 }
      prev.amount += e.amount
      item.set(e.itemId, prev)
    }
    return {
      byCat: [...cat.entries()].map(([category, amount]) => ({ category, amount })).sort((a, b) => b.amount - a.amount),
      byItem: [...item.values()].sort((a, b) => b.amount - a.amount),
    }
  }, [entries, items])

  if (used === 0) {
    return <div style={{ padding: `${DS.space[6]}px 0`, textAlign: 'center', fontSize: DS.font.size.body, color: DS.color.text.muted }}>{label}에 입력된 공동 생활비가 없어요</div>
  }
  const over = target > 0 && used > target
  const pct = target > 0 ? Math.min(used / target, 1) : 0
  const diff = prevUsed !== null && prevUsed > 0 ? used - prevUsed : null
  const shown = showAll ? byItem : byItem.slice(0, 8)
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
        <span style={{ fontSize: DS.font.size.headline, fontWeight: 700, color: over ? DS.color.negative.main : DS.color.text.primary, ...tabularNums }}>{fmt(used)}원</span>
        {target > 0 && <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, ...tabularNums }}>/ 목표 {fmt(target)}원</span>}
      </div>
      {target > 0 && (
        <>
          <div style={{ height: 8, borderRadius: 999, background: DS.color.bg.muted, overflow: 'hidden', margin: '8px 0 4px' }}>
            <div style={{ width: `${pct * 100}%`, height: '100%', borderRadius: 999, background: over ? DS.color.negative.main : DS.color.primary }} />
          </div>
          <div style={{ fontSize: DS.font.size.caption, color: over ? DS.color.negative.main : DS.color.text.secondary, fontWeight: over ? 600 : 400, ...tabularNums }}>
            {over ? `${fmt(used - target)}원 초과` : `${fmt(target - used)}원 남음`}
            {diff !== null && <span style={{ color: DS.color.text.muted, fontWeight: 400 }}> · 전월보다 {diff > 0 ? '+' : diff < 0 ? '-' : ''}{fmt(Math.abs(diff))}원</span>}
          </div>
        </>
      )}

      <div style={{ fontSize: DS.font.size.caption, fontWeight: 600, color: DS.color.text.primary, margin: '16px 0 8px' }}>카테고리별</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {byCat.map(({ category, amount }) => {
          const p = (amount / used) * 100
          const { bg, fg } = resolveCategoryColor(category, categoryColors)
          return (
            <div key={category} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ flexShrink: 0, fontSize: DS.font.size.caption, fontWeight: 600, color: fg, background: bg, padding: '2px 8px', borderRadius: 999, minWidth: 60, textAlign: 'center' }}>{category}</span>
              <div style={{ flex: 1, height: 6, background: DS.color.bg.muted, borderRadius: 999, overflow: 'hidden' }}>
                <div style={{ width: `${p}%`, height: '100%', background: fg, borderRadius: 999 }} />
              </div>
              <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, minWidth: 96, textAlign: 'right', ...tabularNums }}>{fmt(amount)}원 ({p.toFixed(0)}%)</span>
            </div>
          )
        })}
      </div>

      <div style={{ fontSize: DS.font.size.caption, fontWeight: 600, color: DS.color.text.primary, margin: '16px 0 8px' }}>항목별</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {shown.map((r, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: DS.font.size.body, ...tabularNums }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: DS.color.text.body }}>
              {r.name} <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted }}>{r.category}</span>
            </span>
            <span style={{ fontWeight: 600, color: DS.color.text.primary, flexShrink: 0 }}>{fmt(r.amount)}원</span>
          </div>
        ))}
        {byItem.length > 8 && (
          <button type="button" data-compact onClick={() => setShowAll((v) => !v)} style={{ alignSelf: 'center', height: 32, minHeight: 32, padding: '0 14px', borderRadius: DS.radius.chip, border: `1px solid ${DS.color.border.subtle}`, background: DS.color.bg.secondary, color: DS.color.text.secondary, fontSize: DS.font.size.caption, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showAll ? '접기' : `전체 ${byItem.length}개 보기`}
          </button>
        )}
      </div>
    </div>
  )
}
