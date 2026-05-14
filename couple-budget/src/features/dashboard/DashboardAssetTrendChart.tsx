import { useMemo } from 'react'
import { DS } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { useAssetStore } from '@/store/useAssetStore'
import { useAppStore } from '@/store/useAppStore'
import { PRIMARY } from '@/styles/formControls'

const fmt = (n: number) => n.toLocaleString('ko-KR')
const tabularNums: React.CSSProperties = { fontVariantNumeric: 'tabular-nums' }
const MONTHS_LABEL = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10', '11', '12']

function ym(year: number, monthIdx: number) {
  return `${year}-${String(monthIdx + 1).padStart(2, '0')}`
}

/**
 * 연도별 자산 변화 추이 (라인 + 영역 차트)
 * - 총 자산 라인
 * - 가용 자산 영역 (배경)
 */
export function DashboardAssetTrendChart({ year }: { year: number }) {
  const items = useAssetStore((s) => s.items)
  const entries = useAssetStore((s) => s.entries)
  const getEntry = useAssetStore((s) => s.getEntry)
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const [curYStr, curMStr] = currentYearMonth.split('-')
  const currentYear = parseInt(curYStr, 10)
  const currentMonth = parseInt(curMStr, 10) - 1
  void entries

  const { totalSeries, availableSeries, max, lastIdx } = useMemo(() => {
    const total: (number | null)[] = []
    const avail: (number | null)[] = []
    let last = 11
    if (year > currentYear) last = -1
    else if (year === currentYear) last = currentMonth
    for (let mi = 0; mi < 12; mi++) {
      if (mi > last) {
        total.push(null)
        avail.push(null)
        continue
      }
      const monthYM = ym(year, mi)
      const t = items.reduce((sum, item) => sum + getEntry(item.id, monthYM), 0)
      const a = items
        .filter((item) => !item.locked)
        .reduce((sum, item) => sum + getEntry(item.id, monthYM), 0)
      total.push(t)
      avail.push(a)
    }
    const maxVal = Math.max(...total.map((v) => v ?? 0), 1)
    return { totalSeries: total, availableSeries: avail, max: maxVal, lastIdx: last }
  }, [items, getEntry, year, currentYear, currentMonth])

  const allZero = totalSeries.every((v) => v === null || v === 0)

  // SVG 차트
  const W = 720
  const H = 200
  const padL = 40
  const padR = 16
  const padT = 16
  const padB = 24
  const innerW = W - padL - padR
  const innerH = H - padT - padB

  const pointX = (i: number) => padL + (innerW / 11) * i
  const pointY = (v: number) => padT + innerH - (v / max) * innerH

  const totalPath = totalSeries
    .map((v, i) => (v === null ? '' : `${i === 0 ? 'M' : 'L'} ${pointX(i)} ${pointY(v)}`))
    .filter(Boolean)
    .join(' ')
    .replace(/^L/, 'M')
  const availArea =
    lastIdx >= 0
      ? `M ${pointX(0)} ${padT + innerH} ${availableSeries
          .slice(0, lastIdx + 1)
          .map((v, i) => `L ${pointX(i)} ${pointY(v ?? 0)}`)
          .join(' ')} L ${pointX(lastIdx)} ${padT + innerH} Z`
      : ''

  // y축 라벨 (4단)
  const yTicks = [0, 0.25, 0.5, 0.75, 1].map((p) => ({
    y: padT + innerH * (1 - p),
    value: Math.round(max * p),
  }))

  return (
    <Card variant="data" padding={5} hoverLift={false}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <div style={{ fontSize: DS.font.title2.size, fontWeight: DS.font.title2.weight }}>
          📈 자산 변화 추이
        </div>
        <div style={{ fontSize: 11, color: DS.color.text.secondary }}>
          {year}년 · 월별 총 자산 / 가용 자산
        </div>
      </div>

      {allZero ? (
        <div
          style={{
            padding: `${DS.space[6]}px 0`,
            textAlign: 'center',
            fontSize: DS.font.caption.size,
            color: DS.color.text.secondary,
          }}
        >
          해당 연도에 입력된 자산 데이터가 없습니다.
        </div>
      ) : (
        <>
          <div style={{ overflowX: 'auto' }}>
            <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ display: 'block', minWidth: 480 }}>
              {/* 가로 그리드 */}
              {yTicks.map((t, i) => (
                <g key={i}>
                  <line x1={padL} x2={W - padR} y1={t.y} y2={t.y} stroke="#e5e7eb" strokeDasharray={i === 0 ? '0' : '3 3'} />
                  <text x={padL - 6} y={t.y + 4} fontSize="10" fill="#9ca3af" textAnchor="end" style={tabularNums}>
                    {t.value >= 10000 ? `${Math.round(t.value / 10000)}만` : fmt(t.value)}
                  </text>
                </g>
              ))}
              {/* 가용 자산 영역 */}
              <path d={availArea} fill="rgba(79, 140, 255, 0.12)" stroke="none" />
              {/* 총 자산 라인 */}
              <path d={totalPath} fill="none" stroke={PRIMARY} strokeWidth={2.4} strokeLinejoin="round" strokeLinecap="round" />
              {/* 데이터 포인트 */}
              {totalSeries.map((v, i) => {
                if (v === null || v === 0) return null
                const isCurrent = year === currentYear && i === currentMonth
                return (
                  <g key={i}>
                    <circle
                      cx={pointX(i)}
                      cy={pointY(v)}
                      r={isCurrent ? 5 : 3}
                      fill="#fff"
                      stroke={PRIMARY}
                      strokeWidth={isCurrent ? 2.5 : 1.8}
                    />
                  </g>
                )
              })}
              {/* x축 라벨 */}
              {MONTHS_LABEL.map((m, i) => (
                <text key={i} x={pointX(i)} y={H - 6} fontSize="10" fill="#9ca3af" textAnchor="middle">
                  {m}월
                </text>
              ))}
            </svg>
          </div>
          <div style={{ display: 'flex', gap: 16, marginTop: 8, fontSize: 11, color: DS.color.text.secondary }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 12, height: 2, background: PRIMARY }} />
              총 자산
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span style={{ display: 'inline-block', width: 12, height: 8, background: 'rgba(79, 140, 255, 0.2)' }} />
              가용 자산
            </div>
          </div>
        </>
      )}
    </Card>
  )
}
