import { useMemo, useState } from 'react'
import { DS, tabularNums } from '@/design-system/tokens'
import type { FixedItemRow } from '@/lib/dashboardYearStats'
import { ChartCard, DataTable, fmtWon } from './chartKit'

const PALETTE = DS.color.chart

/** 도넛 — 조각에 마우스를 올리면 가운데에 카테고리·비율·금액 */
function Donut({
  items,
  hoverIdx,
  onHover,
  size = 176,
  thickness = 22,
}: {
  items: { name: string; amount: number; pct: number; color: string }[]
  hoverIdx: number | null
  onHover: (i: number | null) => void
  size?: number
  thickness?: number
}) {
  const total = items.reduce((s, it) => s + it.amount, 0) || 1
  const c = size / 2
  const outerR = size / 2 - 4
  const innerR = outerR - thickness
  let acc = 0
  const segs = items.map((it, i) => {
    const a0 = (acc / total) * Math.PI * 2 - Math.PI / 2
    acc += it.amount
    const a1 = (acc / total) * Math.PI * 2 - Math.PI / 2
    const large = a1 - a0 > Math.PI ? 1 : 0
    const p = (r: number, a: number) => `${c + r * Math.cos(a)} ${c + r * Math.sin(a)}`
    const d = `M ${p(outerR, a0)} A ${outerR} ${outerR} 0 ${large} 1 ${p(outerR, a1)} L ${p(innerR, a1)} A ${innerR} ${innerR} 0 ${large} 0 ${p(innerR, a0)} Z`
    return { d, color: it.color, i }
  })
  const hovered = hoverIdx !== null ? items[hoverIdx] : null
  return (
    <div style={{ position: 'relative', width: size, height: size, flexShrink: 0 }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="고정지출 카테고리 비중 도넛 그래프">
        {segs.map((s) => (
          <path key={s.i} d={s.d} fill={s.color} stroke={DS.color.bg.secondary} strokeWidth={1} opacity={hoverIdx === null || hoverIdx === s.i ? 1 : 0.32} style={{ cursor: 'pointer', transition: 'opacity 0.15s' }} onMouseEnter={() => onHover(s.i)} onMouseLeave={() => onHover(null)} onClick={() => onHover(hoverIdx === s.i ? null : s.i)} />
        ))}
      </svg>
      <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', textAlign: 'center', pointerEvents: 'none', padding: '0 12px' }}>
        {hovered ? (
          <>
            <div style={{ fontSize: DS.font.size.caption, fontWeight: 600, color: hovered.color, maxWidth: innerR * 1.5, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{hovered.name}</div>
            <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, color: DS.color.text.primary, ...tabularNums }}>{hovered.pct < 10 ? hovered.pct.toFixed(1) : Math.round(hovered.pct)}%</div>
            <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, ...tabularNums }}>{fmtWon(hovered.amount)}</div>
          </>
        ) : (
          <>
            <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>합계</div>
            <div style={{ fontSize: DS.font.size.body, fontWeight: 700, color: DS.color.text.primary, ...tabularNums }}>{fmtWon(total)}</div>
          </>
        )}
      </div>
    </div>
  )
}

function Segmented<T extends string>({ value, onChange, options }: { value: T; onChange: (v: T) => void; options: { value: T; label: string }[] }) {
  return (
    <div role="tablist" style={{ display: 'inline-flex', padding: 2, borderRadius: DS.radius.chip, background: DS.color.bg.muted }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="tab"
            aria-selected={on}
            data-compact
            onClick={() => onChange(o.value)}
            style={{ height: 28, minHeight: 28, padding: '0 12px', borderRadius: DS.radius.chip, border: 'none', background: on ? DS.color.bg.secondary : 'transparent', color: on ? DS.color.text.primary : DS.color.text.secondary, fontWeight: on ? 700 : 500, fontSize: DS.font.size.caption, boxShadow: on ? DS.shadow[1] : 'none', cursor: 'pointer', fontFamily: 'inherit' }}
          >
            {o.label}
          </button>
        )
      })}
    </div>
  )
}

const ITEM_LIMIT = 10

/**
 * 고정지출 — 어디에 많이 쓰는지 카테고리별 / 항목별로 본다.
 * 연간 합계 또는 선택한 달 기준. 항목별은 순위 막대, 카테고리별은 도넛.
 */
export function FixedExpenseWidget({ items, year, monthIdx }: { items: FixedItemRow[]; year: number; monthIdx: number }) {
  const [by, setBy] = useState<'category' | 'item'>('item')
  const [scope, setScope] = useState<'year' | 'month'>('year')
  const [hoverIdx, setHoverIdx] = useState<number | null>(null)
  const [showAll, setShowAll] = useState(false)

  const valueOf = (r: FixedItemRow) => (scope === 'year' ? r.amount : r.monthly[monthIdx])

  const catColor = useMemo(() => {
    const order = [...new Set(items.map((r) => r.category))]
    return (cat: string) => PALETTE[order.indexOf(cat) % PALETTE.length]
  }, [items])

  const { rows, total } = useMemo(() => {
    const list = items.map((r) => ({ ...r, value: valueOf(r) })).filter((r) => r.value > 0)
    const sum = list.reduce((s, r) => s + r.value, 0)
    if (by === 'item') {
      return { total: sum, rows: list.sort((a, b) => b.value - a.value).map((r) => ({ key: r.key, name: r.name, category: r.category, amount: r.value, pct: sum > 0 ? (r.value / sum) * 100 : 0, monthsUsed: r.monthly.filter((v) => v > 0).length })) }
    }
    const byCat = new Map<string, number>()
    for (const r of list) byCat.set(r.category, (byCat.get(r.category) ?? 0) + r.value)
    return {
      total: sum,
      rows: [...byCat.entries()].sort((a, b) => b[1] - a[1]).map(([cat, v]) => ({ key: cat, name: cat, category: cat, amount: v, pct: sum > 0 ? (v / sum) * 100 : 0, monthsUsed: 0 })),
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [items, by, scope, monthIdx])

  const scopeLabel = scope === 'year' ? `${year}년 합계` : `${year}년 ${monthIdx + 1}월`
  const shown = by === 'item' && !showAll ? rows.slice(0, ITEM_LIMIT) : rows
  const maxAmount = Math.max(1, ...rows.map((r) => r.amount))

  const controls = (
    <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: DS.space[3] }}>
      <Segmented value={by} onChange={(v) => { setBy(v); setHoverIdx(null) }} options={[{ value: 'item', label: '항목별' }, { value: 'category', label: '카테고리별' }]} />
      <Segmented value={scope} onChange={setScope} options={[{ value: 'year', label: '연간' }, { value: 'month', label: `${monthIdx + 1}월` }]} />
    </div>
  )

  const chart =
    by === 'category' ? (
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'center', gap: DS.space[6] }}>
        <Donut items={rows.map((r, i) => ({ name: r.name, amount: r.amount, pct: r.pct, color: PALETTE[i % PALETTE.length] }))} hoverIdx={hoverIdx} onHover={setHoverIdx} />
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flex: '1 1 240px', maxWidth: 380, minWidth: 0 }}>
          {rows.map((r, i) => (
            <div key={r.key} onMouseEnter={() => setHoverIdx(i)} onMouseLeave={() => setHoverIdx(null)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, padding: '6px 8px', borderRadius: 8, background: hoverIdx === i ? DS.color.primarySoft : 'transparent', opacity: hoverIdx !== null && hoverIdx !== i ? 0.5 : 1, transition: 'opacity 0.15s' }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, minWidth: 0 }}>
                <span style={{ width: 10, height: 10, borderRadius: 4, flexShrink: 0, background: PALETTE[i % PALETTE.length] }} />
                <span style={{ fontSize: DS.font.size.body, color: DS.color.text.body, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
              </span>
              <span style={{ fontSize: DS.font.size.body, fontWeight: 600, color: DS.color.text.primary, flexShrink: 0, ...tabularNums }}>
                {r.pct < 10 ? r.pct.toFixed(1) : Math.round(r.pct)}% · {fmtWon(r.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {shown.map((r, i) => (
          <div key={r.key}>
            <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 12 }}>
              <span style={{ display: 'inline-flex', alignItems: 'baseline', gap: 8, minWidth: 0 }}>
                <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, width: 18, flexShrink: 0, ...tabularNums }}>{i + 1}</span>
                <span style={{ fontSize: DS.font.size.body, fontWeight: 600, color: DS.color.text.primary, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.name}</span>
                <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, flexShrink: 0 }}>{r.category}</span>
              </span>
              <span style={{ fontSize: DS.font.size.body, fontWeight: 600, color: DS.color.text.primary, flexShrink: 0, ...tabularNums }}>
                {fmtWon(r.amount)} <span style={{ fontSize: DS.font.size.caption, fontWeight: 500, color: DS.color.text.secondary }}>{r.pct < 10 ? r.pct.toFixed(1) : Math.round(r.pct)}%</span>
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4, paddingLeft: 26 }}>
              <div style={{ flex: 1, height: 6, borderRadius: 999, background: DS.color.bg.muted, overflow: 'hidden' }}>
                <div style={{ width: `${(r.amount / maxAmount) * 100}%`, height: '100%', borderRadius: 999, background: catColor(r.category) }} />
              </div>
              {scope === 'year' && r.monthsUsed > 1 && (
                <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, flexShrink: 0, minWidth: 128, textAlign: 'right', ...tabularNums }}>월 평균 {fmtWon(Math.round(r.amount / r.monthsUsed))}</span>
              )}
            </div>
          </div>
        ))}
        {rows.length > ITEM_LIMIT && (
          <button type="button" data-compact onClick={() => setShowAll((v) => !v)} style={{ alignSelf: 'center', height: 32, minHeight: 32, padding: '0 14px', borderRadius: DS.radius.chip, border: `1px solid ${DS.color.border.subtle}`, background: DS.color.bg.secondary, color: DS.color.text.secondary, fontSize: DS.font.size.caption, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}>
            {showAll ? '접기' : `전체 ${rows.length}개 보기`}
          </button>
        )}
      </div>
    )

  return (
    <ChartCard
      title="고정지출 어디에 쓰나"
      info="지출 계획의 고정지출 카드(템플릿·월별 금액·추가 행)만 집계해요. 지출 계획에서 시작한 달만 포함하고, 이번 달만 제외한 항목은 빼요. 별도지출·공동 생활비는 포함되지 않아요."
      sub={scopeLabel}
      empty={items.length === 0 ? '해당 연도에 집계된 고정지출이 없어요' : undefined}
      chart={
        <>
          {controls}
          {total === 0 ? (
            <div style={{ padding: `${DS.space[5]}px 0`, textAlign: 'center', fontSize: DS.font.size.body, color: DS.color.text.muted }}>{monthIdx + 1}월 고정지출이 없어요</div>
          ) : (
            chart
          )}
        </>
      }
      table={
        <>
          {controls}
          <DataTable head={[by === 'item' ? '항목' : '카테고리', ...(by === 'item' ? ['카테고리'] : []), '금액', '비중']} rows={rows.map((r) => [r.name, ...(by === 'item' ? [r.category] : []), fmtWon(r.amount), `${r.pct.toFixed(1)}%`])} />
        </>
      }
      footer={<>{scopeLabel} 고정지출 합계 {fmtWon(total)}</>}
    />
  )
}
