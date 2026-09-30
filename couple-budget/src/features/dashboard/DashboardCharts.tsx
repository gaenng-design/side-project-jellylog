import { DS, tabularNums } from '@/design-system/tokens'
import type { MonthlyFlow } from '@/lib/dashboardYearStats'
import { useChartTooltip } from './useChartTooltip'
import { fmtAxis, fmtWon, niceStep, niceTicks, SvgTooltip, useElementWidth } from './chartKit'

const PAD_R = 12
const PAD_T = 14
const PAD_B = 28

/** 차트 계열 색 — 토큰 팔레트에서 고른다 */
export const FLOW_SERIES = [
  { key: 'fixed', label: '고정지출', color: DS.color.chart[0] },
  { key: 'separate', label: '별도지출', color: DS.color.chart[4] },
  { key: 'living', label: '공동 생활비', color: DS.color.chart[3] },
  { key: 'invest', label: '저축·투자', color: DS.color.positive.main },
] as const

function monthLabel(i: number, W: number) {
  return W >= 440 ? `${i + 1}월` : `${i + 1}`
}

function Grid({ ticks, y, padL, W }: { ticks: number[]; y: (v: number) => number; padL: number; W: number }) {
  return (
    <>
      {ticks.map((t, i) => (
        <g key={t}>
          <line x1={padL} x2={W - PAD_R} y1={y(t)} y2={y(t)} stroke={DS.color.border.subtle} strokeDasharray={i === 0 ? undefined : '3 3'} />
          <text x={padL - 8} y={y(t) + 4} fontSize={DS.font.size.caption} fill={DS.color.text.muted} textAnchor="end" style={tabularNums}>
            {fmtAxis(t)}
          </text>
        </g>
      ))}
    </>
  )
}

/** 월별 수입 대비 지출·저축 — 막대는 (고정+별도+생활비+저축), 점선은 수입. 점선 위로 막대가 넘으면 적자 */
export function FlowChart({ flow, selectedIdx }: { flow: MonthlyFlow[]; selectedIdx: number | null }) {
  const [wrapRef, W] = useElementWidth()
  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()
  const H = 240
  const padL = 52
  const innerW = W - padL - PAD_R
  const innerH = H - PAD_T - PAD_B
  const max = Math.max(1, ...flow.map((f) => Math.max(f.income, f.spending + f.invest)))
  const { ticks, top } = niceTicks(max, 4)
  const y = (v: number) => PAD_T + innerH - (v / top) * innerH
  const colW = innerW / 12
  const barW = Math.min(colW * 0.62, 28)
  const cx = (i: number) => padL + colW * i + colW / 2

  const incomePts = flow.map((f, i) => (f.empty ? null : `${cx(i)},${y(f.income)}`))
  const incomePath = incomePts.reduce<string>((d, p) => (p ? `${d}${d ? ' L' : 'M'} ${p}` : d), '')

  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label="월별 수입 대비 지출·저축 그래프">
        <Grid ticks={ticks} y={y} padL={padL} W={W} />
        {flow.map((f, i) => {
          if (f.empty) return null
          const parts = [f.fixed, f.separate, f.living, f.invest]
          let acc = 0
          const selected = selectedIdx === i
          return (
            <g key={i} opacity={activeIdx === null || activeIdx === i ? 1 : 0.55}>
              {selected && <rect x={cx(i) - colW / 2} y={PAD_T} width={colW} height={innerH} fill={DS.color.primarySoft} opacity={0.7} />}
              {parts.map((v, si) => {
                if (v <= 0) return null
                const h = (v / top) * innerH
                const yy = y(acc + v)
                acc += v
                return <rect key={si} x={cx(i) - barW / 2} y={yy} width={barW} height={h} fill={FLOW_SERIES[si].color} />
              })}
            </g>
          )
        })}
        {incomePath && <path d={incomePath} fill="none" stroke={DS.color.text.primary} strokeWidth={1.6} strokeDasharray="4 3" strokeLinejoin="round" />}
        {flow.map((f, i) => (f.empty ? null : <circle key={i} cx={cx(i)} cy={y(f.income)} r={3} fill={DS.color.bg.secondary} stroke={DS.color.text.primary} strokeWidth={1.6} />))}
        {flow.map((_, i) => (
          <text key={i} x={cx(i)} y={H - 8} fontSize={DS.font.size.caption} fill={selectedIdx === i ? DS.color.primaryDark : DS.color.text.muted} fontWeight={selectedIdx === i ? 700 : 500} textAnchor="middle">
            {monthLabel(i, W)}
          </text>
        ))}
        {flow.map((_, i) => (
          <rect key={`hit-${i}`} x={cx(i) - colW / 2} y={PAD_T} width={colW} height={innerH} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={(e) => { e.stopPropagation(); setClick(i) }} />
        ))}
        {activeIdx !== null && !flow[activeIdx].empty && (() => {
          const f = flow[activeIdx]
          return (
            <SvgTooltip
              anchorX={cx(activeIdx)}
              anchorY={y(Math.max(f.income, f.spending + f.invest))}
              width={W}
              top={PAD_T}
              lines={[
                { text: `${activeIdx + 1}월`, muted: true },
                { text: `수입 ${fmtWon(f.income)}`, strong: true },
                { text: `고정 ${fmtWon(f.fixed)}` },
                { text: `별도 ${fmtWon(f.separate)}` },
                { text: `생활비 ${fmtWon(f.living)}` },
                { text: `저축·투자 ${fmtWon(f.invest)}` },
                { text: `남는 돈 ${f.leftover < 0 ? '-' : ''}${fmtWon(Math.abs(f.leftover))}`, strong: true },
                ...(f.savingRate !== null ? [{ text: `저축률 ${f.savingRate.toFixed(1)}%` }] : []),
              ]}
            />
          )
        })()}
      </svg>
    </div>
  )
}

/** 단색 막대 (월별 수입) */
export function BarChart({ values, color = DS.color.primary, label }: { values: number[]; color?: string; label: string }) {
  const [wrapRef, W] = useElementWidth()
  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()
  const H = 220
  const padL = 52
  const innerW = W - padL - PAD_R
  const innerH = H - PAD_T - PAD_B
  const { ticks, top } = niceTicks(Math.max(1, ...values), 4)
  const y = (v: number) => PAD_T + innerH - (v / top) * innerH
  const colW = innerW / 12
  const barW = Math.min(colW * 0.62, 28)
  const cx = (i: number) => padL + colW * i + colW / 2
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label={label}>
        <Grid ticks={ticks} y={y} padL={padL} W={W} />
        {values.map((v, i) => v > 0 && (
          <rect key={i} x={cx(i) - barW / 2} y={y(v)} width={barW} height={Math.max((v / top) * innerH, 2)} rx={4} fill={color} opacity={activeIdx === null || activeIdx === i ? 0.95 : 0.5} />
        ))}
        {values.map((_, i) => (
          <text key={i} x={cx(i)} y={H - 8} fontSize={DS.font.size.caption} fill={DS.color.text.muted} textAnchor="middle">{monthLabel(i, W)}</text>
        ))}
        {values.map((_, i) => (
          <rect key={`hit-${i}`} x={cx(i) - colW / 2} y={PAD_T} width={colW} height={innerH} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={(e) => { e.stopPropagation(); setClick(i) }} />
        ))}
        {activeIdx !== null && (
          <SvgTooltip anchorX={cx(activeIdx)} anchorY={y(values[activeIdx])} width={W} top={PAD_T} lines={[{ text: `${activeIdx + 1}월`, muted: true }, { text: fmtWon(values[activeIdx]), strong: true }]} />
        )}
      </svg>
    </div>
  )
}

/** 누적 라인 (저축·투자 누적) — lastIdx 까지만 그린다 */
export function CumulativeChart({ values, lastIdx, color = DS.color.positive.main, label }: { values: number[]; lastIdx: number; color?: string; label: string }) {
  const [wrapRef, W] = useElementWidth()
  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()
  const H = 220
  const padL = 52
  const innerW = W - padL - PAD_R
  const innerH = H - PAD_T - PAD_B
  const { ticks, top } = niceTicks(Math.max(1, ...values), 4)
  const y = (v: number) => PAD_T + innerH - (v / top) * innerH
  const colW = innerW / 12
  const cx = (i: number) => padL + colW * i + colW / 2
  const end = Math.min(11, lastIdx)
  const pts = values.slice(0, end + 1).map((v, i) => ({ x: cx(i), y: y(v) }))
  const line = pts.map((p) => `${p.x},${p.y}`).join(' ')
  const area = pts.length ? `M ${pts[0].x},${y(0)} ${pts.map((p) => `L ${p.x},${p.y}`).join(' ')} L ${pts[pts.length - 1].x},${y(0)} Z` : ''
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label={label}>
        <Grid ticks={ticks} y={y} padL={padL} W={W} />
        <path d={area} fill={color} opacity={0.12} />
        <polyline points={line} fill="none" stroke={color} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {pts.map((p, i) => <circle key={i} cx={p.x} cy={p.y} r={3.5} fill={DS.color.bg.secondary} stroke={color} strokeWidth={2} />)}
        {values.map((_, i) => (
          <text key={i} x={cx(i)} y={H - 8} fontSize={DS.font.size.caption} fill={DS.color.text.muted} textAnchor="middle">{monthLabel(i, W)}</text>
        ))}
        {values.map((_, i) => i <= end && (
          <rect key={`hit-${i}`} x={cx(i) - colW / 2} y={PAD_T} width={colW} height={innerH} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={(e) => { e.stopPropagation(); setClick(i) }} />
        ))}
        {activeIdx !== null && activeIdx <= end && (
          <SvgTooltip anchorX={cx(activeIdx)} anchorY={y(values[activeIdx])} width={W} top={PAD_T} lines={[{ text: `${activeIdx + 1}월 말 누적`, muted: true }, { text: fmtWon(values[activeIdx]), strong: true }]} />
        )}
      </svg>
    </div>
  )
}

/** 자산 추이 — 총 자산 라인 + 가용 자산 영역. 값 범위에 맞춰 축을 잡고 너비를 따라 다시 그린다 */
export function AssetLineChart({
  total,
  available,
  currentIdx,
  showAvailable,
}: {
  total: (number | null)[]
  available: (number | null)[]
  /** 가용 자산이 총 자산과 너무 멀면(축이 늘어져 변화가 안 보임) 영역을 그리지 않는다 */
  showAvailable: boolean
  /** 강조할 달 (없으면 -1) */
  currentIdx: number
}) {
  const [wrapRef, W] = useElementWidth()
  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()
  const H = 240
  const padL = 60
  const innerW = W - padL - PAD_R
  const innerH = H - PAD_T - PAD_B
  const vals = [...total, ...(showAvailable ? available : [])].filter((v): v is number => v !== null && v > 0)
  const vMin = Math.min(...vals)
  const vMax = Math.max(...vals)
  const step = niceStep(Math.max(vMax - vMin, vMax * 0.05), 4)
  const yMin = Math.max(0, Math.floor(vMin / step) * step)
  const yMax = Math.max(Math.ceil(vMax / step) * step, yMin + step)
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v)
  const y = (v: number) => PAD_T + innerH - ((v - yMin) / (yMax - yMin)) * innerH
  const colW = innerW / 12
  const cx = (i: number) => padL + colW * i + colW / 2
  const totalPts = total.map((v, i) => (v === null || v <= 0 ? null : { x: cx(i), y: y(v), i }))
  const path = totalPts.reduce<string>((d, p) => (p ? `${d}${d ? ' L' : 'M'} ${p.x} ${p.y}` : d), '')
  const availPts = available.map((v, i) => (v === null || v <= 0 ? null : { x: cx(i), y: y(v) })).filter((p): p is { x: number; y: number } => !!p)
  const area = showAvailable && availPts.length > 1 ? `M ${availPts[0].x} ${y(yMin)} ${availPts.map((p) => `L ${p.x} ${p.y}`).join(' ')} L ${availPts[availPts.length - 1].x} ${y(yMin)} Z` : ''
  return (
    <div ref={wrapRef} style={{ width: '100%' }}>
      <svg ref={svgRef} width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block' }} role="img" aria-label="월별 총 자산과 가용 자산 추이">
        <Grid ticks={ticks} y={y} padL={padL} W={W} />
        <path d={area} fill={DS.color.primary} opacity={0.12} />
        <path d={path} fill="none" stroke={DS.color.primary} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
        {totalPts.map((p) => p && (
          <circle key={p.i} cx={p.x} cy={p.y} r={p.i === currentIdx ? 5 : 3} fill={DS.color.bg.secondary} stroke={DS.color.primary} strokeWidth={p.i === currentIdx ? 2.5 : 1.8} />
        ))}
        {total.map((_, i) => (
          <text key={i} x={cx(i)} y={H - 8} fontSize={DS.font.size.caption} fill={i === currentIdx ? DS.color.primaryDark : DS.color.text.muted} fontWeight={i === currentIdx ? 700 : 500} textAnchor="middle">{monthLabel(i, W)}</text>
        ))}
        {total.map((v, i) => v !== null && (
          <rect key={`hit-${i}`} x={cx(i) - colW / 2} y={PAD_T} width={colW} height={innerH} fill="transparent" style={{ cursor: 'pointer' }} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)} onClick={(e) => { e.stopPropagation(); setClick(i) }} />
        ))}
        {activeIdx !== null && total[activeIdx] !== null && (
          <SvgTooltip
            anchorX={cx(activeIdx)}
            anchorY={y(total[activeIdx] ?? yMin)}
            width={W}
            top={PAD_T}
            lines={[
              { text: `${activeIdx + 1}월`, muted: true },
              { text: `총 자산 ${fmtWon(total[activeIdx] ?? 0)}`, strong: true },
              { text: `가용 ${fmtWon(available[activeIdx] ?? 0)}` },
            ]}
          />
        )}
      </svg>
    </div>
  )
}
