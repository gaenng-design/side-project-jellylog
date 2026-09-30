import { useEffect, useRef, useState } from 'react'
import { jellyCardStyle } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { addMonths } from '@/lib/assetCalc'
import { useChartTooltip } from '@/features/dashboard/useChartTooltip'
import { fmtWonAsMan, fmtSignedMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { DS } from '@/design-system/tokens'

/** 과거 몇 개월 · 미래 몇 개월을 보여줄지 */
const PAST_MONTHS = 11
const FUTURE_MONTHS = 6

const tabularNums: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }

/** 축 눈금용 1·2·5 단위 간격 */
function niceStep(range: number, count: number): number {
  const raw = range / count
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

/**
 * 전체 탭: 자산 추이 차트
 * - 최근 12개월 총 자산 (실선) + 앞으로 6개월 예상 (점선)
 * - 마우스를 올리거나 탭하면 해당 월 금액·전월 대비 표시
 */
export function AssetTrendChart({ model }: { model: AssetModel }) {
  const { currentYear, currentMonth, calcMonthTotal } = model

  const { activeIdx, svgRef, setHover, setClick } = useChartTooltip()

  const points = Array.from({ length: PAST_MONTHS + 1 + FUTURE_MONTHS }, (_, i) => {
    const { year, monthIdx } = addMonths(currentYear, currentMonth, i - PAST_MONTHS)
    return { year, monthIdx, total: calcMonthTotal(year, monthIdx), projected: i > PAST_MONTHS }
  })
  const hasData = points.some((p) => p.total !== 0)

  // 컨테이너 너비에 맞춰 다시 그림 (가로 스크롤 없이 모바일 대응)
  const wrapRef = useRef<HTMLDivElement>(null)
  const [W, setW] = useState(640)
  useEffect(() => {
    const el = wrapRef.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setW(Math.max(280, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [hasData])

  if (!hasData) return null

  const H = 200
  const padL = 64
  const padR = 12
  const padT = 16
  const padB = 28
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  // Y 범위: 데이터 최소~최대를 보기 좋은 간격으로 확장 (월 변화가 잘 보이도록 0부터 시작하지 않음)
  const values = points.map((p) => p.total)
  const vMin = Math.min(...values)
  const vMax = Math.max(...values)
  const step = niceStep(Math.max(vMax - vMin, vMax * 0.02, 10000), 4)
  const yMin = Math.max(0, Math.floor(vMin / step) * step)
  const yMax = Math.max(Math.ceil(vMax / step) * step, yMin + step)
  const ticks: number[] = []
  for (let v = yMin; v <= yMax + step / 2; v += step) ticks.push(v)

  const x = (i: number) => padL + (innerW / (points.length - 1)) * i
  const y = (v: number) => padT + innerH - ((v - yMin) / (yMax - yMin)) * innerH

  const pathOf = (from: number, to: number) =>
    points
      .slice(from, to + 1)
      .map((p, k) => `${k === 0 ? 'M' : 'L'} ${x(from + k)} ${y(p.total)}`)
      .join(' ')
  const actualPath = pathOf(0, PAST_MONTHS)
  const projectedPath = pathOf(PAST_MONTHS, points.length - 1)

  // X 라벨: 너비가 좁으면 2~3개월 간격으로 표시, 1월은 연도 포함
  const perPoint = innerW / points.length
  const labelEvery = perPoint < 22 ? 3 : perPoint < 34 ? 2 : 1
  const colW = innerW / (points.length - 1)

  return (
    <div style={{ ...jellyCardStyle, padding: '14px 16px', marginBottom: 16 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8, flexWrap: 'wrap', marginBottom: 8 }}>
        <div style={{ fontWeight: 700, fontSize: DS.font.size.body, color: DS.color.text.primary }}>자산 추이</div>
        <div style={{ display: 'flex', gap: 12, fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="4" aria-hidden><line x1="0" x2="16" y1="2" y2="2" stroke={PRIMARY} strokeWidth="2" /></svg>
            총 자산
          </span>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <svg width="16" height="4" aria-hidden><line x1="0" x2="16" y1="2" y2="2" stroke={PRIMARY} strokeWidth="2" strokeDasharray="3 3" /></svg>
            예상
          </span>
        </div>
      </div>

      <div ref={wrapRef} style={{ width: '100%' }}>
        <svg
          ref={svgRef}
          width={W}
          height={H}
          viewBox={`0 0 ${W} ${H}`}
          style={{ display: 'block' }}
          role="img"
          aria-label={`최근 12개월 총 자산 추이와 ${FUTURE_MONTHS}개월 예상`}
        >
          {/* 가로 그리드 + Y축 라벨 */}
          {ticks.map((t, i) => (
            <g key={t}>
              <line x1={padL} x2={W - padR} y1={y(t)} y2={y(t)} stroke={DS.color.border.subtle} strokeDasharray={i === 0 ? undefined : '3 3'} />
              <text x={padL - 8} y={y(t) + 4} fontSize={DS.font.size.caption} fill={DS.color.text.muted} textAnchor="end" style={tabularNums}>
                {fmtWonAsMan(t)}
              </text>
            </g>
          ))}

          {/* 예상 구간 배경 */}
          <rect x={x(PAST_MONTHS)} y={padT} width={x(points.length - 1) - x(PAST_MONTHS)} height={innerH} fill="rgba(243,244,246,0.6)" />

          {/* 라인 */}
          <path d={actualPath} fill="none" stroke={PRIMARY} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
          <path d={projectedPath} fill="none" stroke={PRIMARY} strokeWidth={2} strokeDasharray="4 4" strokeLinecap="round" />

          {/* 현재 달 포인트 */}
          <circle cx={x(PAST_MONTHS)} cy={y(points[PAST_MONTHS].total)} r={5} fill={DS.color.bg.secondary} stroke={PRIMARY} strokeWidth={2.5} />

          {/* X축 라벨 */}
          {points.map((p, i) => {
            const isCurrent = i === PAST_MONTHS
            if (!isCurrent && (i - PAST_MONTHS) % labelEvery !== 0) return null
            return (
              <text
                key={i}
                x={x(i)}
                y={H - 8}
                fontSize={DS.font.size.caption}
                fill={isCurrent ? PRIMARY : DS.color.text.muted}
                fontWeight={isCurrent ? 700 : 400}
                textAnchor="middle"
              >
                {p.monthIdx === 0 ? `${String(p.year).slice(2)}.1월` : `${p.monthIdx + 1}월`}
              </text>
            )
          })}

          {/* 크로스헤어 + 포인트 */}
          {activeIdx !== null && (
            <g pointerEvents="none">
              <line x1={x(activeIdx)} x2={x(activeIdx)} y1={padT} y2={padT + innerH} stroke={DS.color.text.muted} strokeWidth={1} />
              <circle cx={x(activeIdx)} cy={y(points[activeIdx].total)} r={4.5} fill={PRIMARY} stroke={DS.color.bg.secondary} strokeWidth={2} />
            </g>
          )}

          {/* 투명 hit 영역 — 마크보다 넓게 */}
          {points.map((_, i) => (
            <rect
              key={`hit-${i}`}
              x={x(i) - colW / 2}
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
          ))}

          {/* 툴팁 */}
          {activeIdx !== null && (() => {
            const p = points[activeIdx]
            const prev = activeIdx > 0 ? points[activeIdx - 1].total : null
            const lines = [
              `${p.year}년 ${p.monthIdx + 1}월${p.projected ? ' (예상)' : ''}`,
              `총 자산 ${fmtWonAsMan(p.total)}`,
              ...(prev !== null ? [`전월 대비 ${fmtSignedMan(p.total - prev)}`] : []),
            ]
            const lineH = 15
            const boxW = Math.max(...lines.map((l) => l.length)) * 7.5 + 20
            const boxH = lines.length * lineH + 12
            let tx = x(activeIdx) + 10
            if (tx + boxW > W - padR) tx = x(activeIdx) - boxW - 10
            const ty = Math.min(Math.max(padT, y(p.total) - boxH - 8), padT + innerH - boxH)
            return (
              <g pointerEvents="none">
                <rect x={tx} y={ty} width={boxW} height={boxH} rx={6} fill={DS.color.text.primary} opacity={0.92} />
                {lines.map((l, li) => (
                  <text key={li} x={tx + 10} y={ty + 6 + (li + 1) * lineH - 3} fontSize={DS.font.size.caption} fill={li === 0 ? DS.color.text.muted : DS.color.bg.secondary} style={tabularNums}>
                    {l}
                  </text>
                ))}
              </g>
            )
          })()}
        </svg>
      </div>
    </div>
  )
}
