import { useEffect, useRef, useState, type ReactNode } from 'react'
import { DS, tabularNums } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { InfoTip } from '@/design-system/components/InfoTip'

export const fmtWon = (n: number) => `${n.toLocaleString('ko-KR')}원`

/** 큰 금액 짧은 표기 — 2억 2,145만원 / 550만원 / 3,200원 (좁은 카드용) */
export function fmtWonShort(n: number): string {
  const sign = n < 0 ? '-' : ''
  const v = Math.abs(n)
  if (v >= 100_000_000) {
    const eok = Math.floor(v / 100_000_000)
    const man = Math.round((v % 100_000_000) / 10_000)
    return man > 0 ? `${sign}${eok}억 ${man.toLocaleString('ko-KR')}만원` : `${sign}${eok}억원`
  }
  if (v >= 10_000) return `${sign}${Math.round(v / 10_000).toLocaleString('ko-KR')}만원`
  return `${sign}${v.toLocaleString('ko-KR')}원`
}

/** 화면 폭 조건 (SSR 없음 — 브라우저 전용) */
export function useMediaQuery(query: string): boolean {
  const [match, setMatch] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setMatch(mq.matches)
    on()
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [query])
  return match
}

/** 축 눈금용 짧은 금액 표기 (1억 / 1,250만 …) */
export function fmtAxis(n: number): string {
  const sign = n < 0 ? '-' : ''
  const v = Math.abs(n)
  if (v === 0) return '0'
  if (v >= 100_000_000) {
    const eok = v / 100_000_000
    return `${sign}${Number.isInteger(eok) ? eok : eok.toFixed(1)}억`
  }
  if (v >= 10_000) return `${sign}${Math.round(v / 10_000).toLocaleString('ko-KR')}만`
  return `${sign}${v.toLocaleString('ko-KR')}`
}

/** 1·2·5 단위 눈금 간격 */
export function niceStep(range: number, count: number): number {
  const raw = Math.max(range, 1) / count
  const pow = Math.pow(10, Math.floor(Math.log10(raw)))
  const n = raw / pow
  return (n <= 1 ? 1 : n <= 2 ? 2 : n <= 5 ? 5 : 10) * pow
}

/** 0부터 max까지 보기 좋은 눈금 */
export function niceTicks(max: number, count = 4): { ticks: number[]; top: number } {
  const step = niceStep(max, count)
  const top = Math.max(Math.ceil(max / step) * step, step)
  const ticks: number[] = []
  for (let v = 0; v <= top + step / 2; v += step) ticks.push(v)
  return { ticks, top }
}

/** 컨테이너 너비를 따라 다시 그리는 차트용 (가로 스크롤·글자 축소 방지) */
export function useElementWidth(min = 260, initial = 640): [React.RefObject<HTMLDivElement | null>, number] {
  const ref = useRef<HTMLDivElement | null>(null)
  const [w, setW] = useState(initial)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    setW(Math.max(min, Math.round(el.getBoundingClientRect().width)))
    const ro = new ResizeObserver(([entry]) => setW(Math.max(min, Math.round(entry.contentRect.width))))
    ro.observe(el)
    return () => ro.disconnect()
  }, [min])
  return [ref, w]
}

export function LegendDot({ color, label, dashed, line }: { color: string; label: string; dashed?: boolean; line?: boolean }) {
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>
      <span
        style={{
          display: 'inline-block',
          width: 12,
          height: line ? 0 : 8,
          borderRadius: 2,
          background: line ? 'transparent' : color,
          borderTop: line ? `2px ${dashed ? 'dashed' : 'solid'} ${color}` : undefined,
        }}
      />
      {label}
    </span>
  )
}

/** 표 (차트의 "표로 보기") — 첫 열 왼쪽 고정, 좁으면 가로 스크롤 */
export function DataTable({ head, rows }: { head: string[]; rows: ReactNode[][] }) {
  const cell = { padding: '8px 10px', borderBottom: `1px solid ${DS.color.border.subtle}`, fontSize: DS.font.size.caption, whiteSpace: 'nowrap' as const }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'collapse', ...tabularNums }}>
        <thead>
          <tr>
            {head.map((h, i) => (
              <th key={i} style={{ ...cell, textAlign: i === 0 ? 'left' : 'right', color: DS.color.text.secondary, fontWeight: 600, background: DS.color.bg.subtle }}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, ri) => (
            <tr key={ri}>
              {r.map((c, ci) => (
                <td key={ci} style={{ ...cell, textAlign: ci === 0 ? 'left' : 'right', color: ci === 0 ? DS.color.text.body : DS.color.text.primary, fontWeight: ci === 0 ? 600 : 500 }}>{c}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

/**
 * 대시보드 차트 카드 — 제목 / ⓘ 설명 / 범례 / "표로 보기" 전환.
 * 긴 설명은 info 로 접어두고, 표 보기는 스크린리더·정확한 수치 확인용 대안이다.
 */
export function ChartCard({
  title,
  info,
  sub,
  legend,
  chart,
  table,
  footer,
  empty,
}: {
  title: ReactNode
  info?: ReactNode
  sub?: ReactNode
  legend?: ReactNode
  chart: ReactNode
  table?: ReactNode
  footer?: ReactNode
  /** 주면 차트 대신 이 안내를 보여준다 */
  empty?: ReactNode
}) {
  const [asTable, setAsTable] = useState(false)
  return (
    <Card variant="data" padding={5} hoverLift={false}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: DS.space[3] }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
          <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, color: DS.color.text.primary }}>{title}</div>
          {info && <InfoTip>{info}</InfoTip>}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          {sub && <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, ...tabularNums }}>{sub}</div>}
          {table && !empty && (
            <button
              type="button"
              data-compact
              onClick={() => setAsTable((v) => !v)}
              aria-pressed={asTable}
              style={{
                height: 28,
                minHeight: 28,
                padding: '0 10px',
                borderRadius: DS.radius.chip,
                border: `1px solid ${asTable ? DS.color.primary : DS.color.border.subtle}`,
                background: asTable ? DS.color.primarySoft : DS.color.bg.secondary,
                color: asTable ? DS.color.primaryDark : DS.color.text.secondary,
                fontSize: DS.font.size.caption,
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {asTable ? '차트로 보기' : '표로 보기'}
            </button>
          )}
        </div>
      </div>
      {empty ? (
        <div style={{ padding: `${DS.space[6]}px 0`, textAlign: 'center', fontSize: DS.font.size.body, color: DS.color.text.muted }}>{empty}</div>
      ) : asTable && table ? (
        table
      ) : (
        <>
          {legend && <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: DS.space[2] }}>{legend}</div>}
          {chart}
        </>
      )}
      {footer && !empty && <div style={{ marginTop: DS.space[3], fontSize: DS.font.size.caption, color: DS.color.text.secondary, ...tabularNums }}>{footer}</div>}
    </Card>
  )
}

/** SVG 툴팁 상자 — 한글은 넓게 계산해 글자가 박스를 넘지 않게 한다 */
export function SvgTooltip({
  anchorX,
  anchorY,
  width,
  top,
  lines,
}: {
  anchorX: number
  anchorY: number
  /** 차트 전체 너비 (오른쪽 넘침 방지) */
  width: number
  top: number
  lines: { text: string; strong?: boolean; muted?: boolean }[]
}) {
  const lineH = 17
  const textW = (s: string) => [...s].reduce((w, ch) => w + (ch.charCodeAt(0) > 255 ? 12.5 : 7), 0)
  const boxW = Math.max(...lines.map((l) => textW(l.text))) + 20
  const boxH = lines.length * lineH + 12
  let tx = anchorX + 10
  if (tx + boxW > width - 4) tx = anchorX - boxW - 10
  if (tx < 4) tx = 4
  const ty = Math.max(top, anchorY - boxH - 8)
  return (
    <g pointerEvents="none">
      <rect x={tx} y={ty} width={boxW} height={boxH} rx={8} fill={DS.color.text.primary} opacity={0.94} />
      {lines.map((l, i) => (
        <text
          key={i}
          x={tx + 10}
          y={ty + 6 + (i + 1) * lineH - 5}
          fontSize={DS.font.size.caption}
          fontWeight={l.strong ? 700 : 500}
          fill={l.muted ? DS.color.text.muted : DS.color.bg.secondary}
          style={tabularNums}
        >
          {l.text}
        </text>
      ))}
    </g>
  )
}
