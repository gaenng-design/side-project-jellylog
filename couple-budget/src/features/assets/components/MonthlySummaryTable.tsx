import { useState } from 'react'
import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { jellyCardStyle } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { addMonths, monthDiff, parseYM } from '@/lib/assetCalc'
import { fmtMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { DS } from '@/design-system/tokens'
import { DeltaText } from '@/design-system/components'

/** 표시할 최대 개월 수 (가장 이른 입력 월부터 현재까지, 최소 12개월) */
const MAX_MONTHS = 60
const MIN_MONTHS = 12

const th: React.CSSProperties = { padding: '6px 12px', textAlign: 'right', color: DS.color.text.secondary, fontWeight: 500, whiteSpace: 'nowrap' }
const td: React.CSSProperties = { padding: '6px 12px', textAlign: 'right', whiteSpace: 'nowrap' }

/** 금액 증감 표기 (만원 단위, 0이면 '—') */
function Delta({ value, bold }: { value: number | null; bold?: boolean }) {
  if (value === null || Math.round(value / 10000) === 0) return <DeltaText value={0}>—</DeltaText>
  return (
    <DeltaText value={value} style={{ fontWeight: bold ? 600 : 500 }}>
      {value > 0 ? '+' : '-'}{fmtMan(Math.round(Math.abs(value) / 10000))}원
    </DeltaText>
  )
}

/** 전체 탭: 월별 자산 현황 표 — 연도별로 접었다 펼 수 있음 */
export function MonthlySummaryTable({ model }: { model: AssetModel }) {
  const narrow = useNarrowLayout()
  const { currentYear, currentMonth, sortedItems, firstEntryYM, getProjectedValue, getPnl, getSavingsCumulativeInterest } = model

  // 모바일: 셀 여백을 줄이고 '월' 열을 왼쪽에 고정해 가로로 밀어도 어느 달인지 보이게 한다
  const cellPad = narrow ? '8px 8px' : '6px 12px'
  const thS: React.CSSProperties = { ...th, padding: cellPad }
  const tdS: React.CSSProperties = { ...td, padding: cellPad }
  const stickyMonth = (bg: string): React.CSSProperties =>
    narrow ? { position: 'sticky', left: 0, zIndex: 1, background: bg } : {}

  // 가장 이른 입력 월 ~ 현재 (최소 12개월)
  const earliest = Object.values(firstEntryYM).sort()[0]
  const spanned = earliest
    ? monthDiff(parseYM(earliest).year, parseYM(earliest).monthIdx, currentYear, currentMonth) + 1
    : MIN_MONTHS
  const count = Math.min(MAX_MONTHS, Math.max(MIN_MONTHS, spanned))

  const catTotal = (cat: string | null, yr: number, mi: number) =>
    sortedItems
      .filter((item) => (cat ? item.category === cat : ASSET_CATEGORIES.includes(item.category)))
      .reduce((sum, item) => sum + getProjectedValue(yr, item, mi), 0)

  // 첫 행의 전월 대비 계산을 위해 한 달 앞(offset = count)까지 계산
  const rows = Array.from({ length: count + 1 }, (_, k) => {
    const { year, monthIdx } = addMonths(currentYear, currentMonth, -(count - k))
    const gain =
      sortedItems.filter((i) => i.category === '투자').reduce((s, i) => s + getPnl(i, year, monthIdx), 0) +
      sortedItems.filter((i) => i.category === '저축').reduce((s, i) => s + getSavingsCumulativeInterest(i, year, monthIdx), 0)
    return {
      year,
      monthIdx,
      total: catTotal(null, year, monthIdx),
      savings: catTotal('저축', year, monthIdx),
      invest: catTotal('투자', year, monthIdx),
      gain,
    }
  })
  // 입력이 시작되기 전 달(총 자산 0)과는 비교하지 않음 → 첫 달 증감은 '—'
  const months = rows.slice(1).map((r, i) => {
    const prev = rows[i]
    return { ...r, prev: prev.total === 0 ? null : prev }
  })
  const diff = (cur: number, prev: number | undefined) => (prev === undefined ? null : cur - prev)

  // 연도별 그룹 (오래된 → 최신). 기본: 현재 연도만 펼침
  const years = [...new Set(months.map((m) => m.year))]
  const [expanded, setExpanded] = useState<Set<number>>(new Set([currentYear]))
  const toggle = (yr: number) =>
    setExpanded((prev) => {
      const next = new Set(prev)
      if (next.has(yr)) next.delete(yr)
      else next.add(yr)
      return next
    })

  return (
    <div style={{ marginBottom: 16, ...jellyCardStyle, padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '10px 14px', fontWeight: 700, fontSize: DS.font.size.body, color: DS.color.text.primary, borderBottom: `1px solid ${DS.color.border.subtle}`, background: DS.color.bg.secondary }}>
        월별 자산 현황
      </div>
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: DS.font.size.caption }}>
          <thead>
            <tr style={{ background: DS.color.bg.muted }}>
              <th style={{ ...thS, textAlign: 'left', minWidth: narrow ? 52 : 80, ...stickyMonth(DS.color.bg.muted) }}>월</th>
              <th style={thS}>총 자산</th>
              <th style={thS}>전월 대비</th>
              <th style={thS}>{narrow ? '저축 증감' : '전월 대비 저축'}</th>
              <th style={thS}>{narrow ? '투자 증감' : '전월 대비 투자'}</th>
              <th style={thS}>{narrow ? '수익' : '원금 대비 수익'}</th>
            </tr>
          </thead>
          <tbody>
            {years.map((yr) => {
              const isOpen = expanded.has(yr)
              const yearMonths = months.filter((m) => m.year === yr)
              const last = yearMonths[yearMonths.length - 1]
              return [
                <tr
                  key={`y-${yr}`}
                  onClick={() => toggle(yr)}
                  style={{ borderTop: `1px solid ${DS.color.border.subtle}`, background: yr === currentYear ? 'rgba(79, 140, 255, 0.10)' : DS.color.bg.subtle, cursor: 'pointer', userSelect: 'none' }}
                >
                  <td colSpan={isOpen ? 6 : 1} style={{ padding: narrow ? '9px 8px' : '7px 12px', fontWeight: 700, color: yr === currentYear ? PRIMARY : DS.color.text.body, whiteSpace: 'nowrap', ...stickyMonth(yr === currentYear ? DS.color.primarySoft : DS.color.bg.subtle) }}>
                    <span style={{ fontSize: DS.font.size.caption, marginRight: 6 }}>{isOpen ? '▼' : '▶'}</span>
                    {yr}년
                  </td>
                  {/* 접힌 연도: 연말(또는 최근 달) 총 자산과 연간 증감을 한 줄로 요약 */}
                  {!isOpen && (
                    <>
                      <td style={{ ...tdS, fontWeight: 600, color: DS.color.text.primary }}>{fmtMan(Math.round(last.total / 10000))}원</td>
                      <td style={tdS}><Delta value={diff(last.total, yearMonths[0].prev?.total)} /></td>
                      <td style={tdS}><Delta value={diff(last.savings, yearMonths[0].prev?.savings)} /></td>
                      <td style={tdS}><Delta value={diff(last.invest, yearMonths[0].prev?.invest)} /></td>
                      <td style={tdS}><Delta value={last.gain} bold /></td>
                    </>
                  )}
                </tr>,
                ...(isOpen
                  ? yearMonths.map((m) => {
                      const isCurrent = m.year === currentYear && m.monthIdx === currentMonth
                      return (
                        <tr key={`${m.year}-${m.monthIdx}`} style={{ borderTop: `1px solid ${DS.color.border.subtle}`, background: isCurrent ? DS.color.primarySoft : undefined }}>
                          <td style={{ ...tdS, textAlign: 'left', color: isCurrent ? DS.color.primaryDark : DS.color.text.body, fontWeight: isCurrent ? 600 : 400, ...stickyMonth(isCurrent ? DS.color.primarySoft : DS.color.bg.secondary) }}>
                            {narrow ? `${m.monthIdx + 1}월` : `${m.year}년 ${m.monthIdx + 1}월`}
                          </td>
                          <td style={{ ...tdS, fontWeight: 600, color: DS.color.text.primary }}>{fmtMan(Math.round(m.total / 10000))}원</td>
                          <td style={tdS}><Delta value={diff(m.total, m.prev?.total)} /></td>
                          <td style={tdS}><Delta value={diff(m.savings, m.prev?.savings)} /></td>
                          <td style={tdS}><Delta value={diff(m.invest, m.prev?.invest)} /></td>
                          <td style={tdS}><Delta value={m.gain} bold /></td>
                        </tr>
                      )
                    })
                  : []),
              ]
            })}
          </tbody>
        </table>
      </div>
      <div style={{ padding: '6px 14px 8px', fontSize: DS.font.size.caption, color: DS.color.text.muted, borderTop: `1px solid ${DS.color.border.subtle}` }}>
        연도를 누르면 접고 펼 수 있어요. 접힌 연도의 증감은 연초 대비 연말(현재 연도는 최근 달) 변화예요.
      </div>
    </div>
  )
}
