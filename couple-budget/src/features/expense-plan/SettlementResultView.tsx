import { useState, type CSSProperties, type ReactNode } from 'react'
import { PRIMARY, allowanceValueColor, settingsSectionCardStyle } from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { SUB_CHART_COLORS, SUB_FIXED_ACCENT, SUB_INVEST_ACCENT } from '@/styles/oklchSubColors'

const CHART_COLORS = SUB_CHART_COLORS

/** 고정/투자는 서브 OKLCH, 공동생활비는 포인트(버튼) 컬러 */
// 그룹 헤더 색상은 grayscale 톤으로 통일 (블루/엑센트 제거)
const FIXED_EXPENSE_SUMMARY_COLOR = '#374151'
const INVEST_SUMMARY_COLOR = '#374151'
// 색상 변수 사용 표시 (lint 경고 방지)
void SUB_FIXED_ACCENT
void SUB_INVEST_ACCENT

function compositionSegmentColor(c: { label: string; amount: number }): string {
  if (c.label === '고정지출') return '#da5969'
  if (c.label === '별도지출') return '#e88896'
  if (c.label === '공동생활비') return '#737dea'
  if (c.label === '투자·저축') return '#3b82f6'
  if (c.label === '용돈') return '#6f6f78'
  return '#9ca3af'
}

const incomeBarOuterStyle: CSSProperties = {
  width: '100%',
  boxSizing: 'border-box',
}

const incomeBarTrackStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  height: 40,
  borderRadius: 9999,
  overflow: 'hidden',
  background: '#f3f4f6',
  border: '1px solid rgba(15, 23, 42, 0.06)',
  boxSizing: 'border-box',
}

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'

type InvestLineItem = { label: string; amount: number }

// ── 영수증 카드 스타일 ─────────────────────────────────────────────────────────
const RECEIPT_BG = '#FFFFFF'
const RECEIPT_BORDER = '#E2D5B0'
const RECEIPT_DASH = '1px dashed #D4C4A0'
const RECEIPT_TEXT = '#2A1F0E'
const RECEIPT_MUTED = '#8B7355'

const userPayTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: 13,
}

const tdLabelBase: CSSProperties = {
  padding: '9px 8px 9px 0',
  color: RECEIPT_TEXT,
  verticalAlign: 'top',
  borderBottom: RECEIPT_DASH,
}

const tdAmountBase: CSSProperties = {
  padding: '9px 0',
  textAlign: 'right',
  fontWeight: 500,
  color: RECEIPT_TEXT,
  verticalAlign: 'top',
  borderBottom: RECEIPT_DASH,
  whiteSpace: 'nowrap',
}

const tdFixedGroupHeader: CSSProperties = {
  padding: '10px 8px 6px 0',
  fontSize: 12,
  fontWeight: 700,
  color: FIXED_EXPENSE_SUMMARY_COLOR,
  borderBottom: RECEIPT_DASH,
  verticalAlign: 'bottom',
}

const tdFixedGroupHeaderAmount: CSSProperties = {
  ...tdFixedGroupHeader,
  textAlign: 'right',
  padding: '10px 0 6px 0',
  whiteSpace: 'nowrap',
}

const tdInvestGroupHeader: CSSProperties = {
  padding: '10px 8px 6px 0',
  fontSize: 12,
  fontWeight: 700,
  color: INVEST_SUMMARY_COLOR,
  borderBottom: RECEIPT_DASH,
  verticalAlign: 'bottom',
}

/** 그룹 바로 아래 자식 행 (고정·투자/저축 트리) */
const tdTreeChildLabel: CSSProperties = {
  ...tdLabelBase,
  paddingLeft: 12,
}

const tdTreeChildAmount: CSSProperties = {
  ...tdAmountBase,
}

/** 별도 지출 카드(50:50) 정산 보조 행 */
const tdSepCardLabel: CSSProperties = {
  ...tdTreeChildLabel,
  paddingLeft: 20,
  fontSize: 12,
  color: RECEIPT_MUTED,
  fontWeight: 500,
}

const tdSepCardAmount: CSSProperties = {
  ...tdTreeChildAmount,
  fontSize: 12,
  color: RECEIPT_MUTED,
}

/** 고카테고리 소계 행 (고정·별도 / 투자·저축) */
const tdCategorySubtotalLabel: CSSProperties = {
  ...tdLabelBase,
  paddingLeft: 12,
  paddingTop: 10,
  fontWeight: 700,
  fontSize: 12,
  color: RECEIPT_TEXT,
}

const tdCategorySubtotalAmount: CSSProperties = {
  ...tdAmountBase,
  paddingTop: 10,
  fontWeight: 700,
  fontSize: 13,
  color: RECEIPT_TEXT,
}

const labelWithCheckboxStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: 8,
  cursor: 'pointer',
  minWidth: 0,
}

const checkboxStyle: CSSProperties = {
  marginTop: 2,
  flexShrink: 0,
  width: 16,
  height: 16,
  cursor: 'pointer',
}

/** 정산 완료된 항목 행에 적용되는 비활성 스타일 */
const settledRowStyle: CSSProperties = {
  opacity: 0.4,
  textDecoration: 'line-through',
}

type PersonKey = 'A' | 'B'

/** 투자/저축 그룹: 헤더 + (세부 라인 | 투자·저축 구분 | 단일 합계) */
function UserInvestTreeRows(props: {
  investDetail?: { 투자: number; 저축: number }
  investLineItems?: { 투자: InvestLineItem[]; 저축: InvestLineItem[] }
  totalInvest: number
  checks: Record<string, boolean>
  onToggle: (key: string, checked: boolean) => void
  /**
   * 'actions': 체크 가능한 항목 행만 (기본)
   * 'info': 헤더 + 소계 행만
   */
  mode?: 'actions' | 'info'
  /** 사용자 컬러 기반 스타일 */
  userTdInvestGroupHeader?: CSSProperties
  userTdTreeChildLabel?: CSSProperties
  userTdTreeChildAmount?: CSSProperties
  userTdCategorySubtotalLabel?: CSSProperties
  userTdCategorySubtotalAmount?: CSSProperties
}) {
  const {
    investDetail,
    investLineItems,
    totalInvest,
    checks,
    onToggle,
    mode = 'actions',
    userTdInvestGroupHeader: uTdInvestGroupHeader,
    userTdTreeChildLabel: uTdTreeChildLabel,
    userTdTreeChildAmount: uTdTreeChildAmount,
    userTdCategorySubtotalLabel: uTdCategorySubtotalLabel,
    userTdCategorySubtotalAmount: uTdCategorySubtotalAmount,
  } = props
  const inv = investLineItems?.투자 ?? []
  const sav = investLineItems?.저축 ?? []
  const hasLines = inv.length > 0 || sav.length > 0

  // 사용자 컬러 스타일이 제공되지 않으면 기본값 사용
  const finalTdTreeChildLabel = uTdTreeChildLabel ?? tdTreeChildLabel
  const finalTdTreeChildAmount = uTdTreeChildAmount ?? tdTreeChildAmount
  const finalTdInvestGroupHeader = uTdInvestGroupHeader ?? tdInvestGroupHeader
  const finalTdCategorySubtotalLabel = uTdCategorySubtotalLabel ?? tdCategorySubtotalLabel
  const finalTdCategorySubtotalAmount = uTdCategorySubtotalAmount ?? tdCategorySubtotalAmount

  const lineRow = (key: string, label: string, amount: number) => {
    const checked = checks[key] ?? false
    return (
      <tr key={key}>
        <td style={finalTdTreeChildLabel}>
          <label style={labelWithCheckboxStyle}>
            <input
              type="checkbox"
              checked={checked}
              onChange={(e) => onToggle(key, e.target.checked)}
              style={checkboxStyle}
            />
            <span
              style={{
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                minWidth: 0,
                lineHeight: 1.4,
                ...(checked && settledRowStyle),
              }}
            >
              {label}
            </span>
          </label>
        </td>
        <td style={{ ...finalTdTreeChildAmount, ...(checked && settledRowStyle) }}>{fmt(amount)}</td>
      </tr>
    )
  }

  let body: ReactNode = null
  if (hasLines) {
    body = (
      <>
        {inv.map((line, i) => lineRow(`inv-${i}`, line.label, line.amount))}
        {sav.map((line, i) => lineRow(`sav-${i}`, line.label, line.amount))}
      </>
    )
  } else if (investDetail) {
    body = (
      <>
        {lineRow('cat-inv', '투자', investDetail.투자)}
        {lineRow('cat-sav', '저축', investDetail.저축)}
      </>
    )
  } else {
    body = lineRow('combined', '투자·저축', totalInvest)
  }

  if (mode === 'info') {
    // 정보 행만: 헤더 + 소계
    return (
      <>
        <tr>
          <td colSpan={2} style={finalTdInvestGroupHeader}>
            투자/저축
          </td>
        </tr>
        <tr style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
          <td style={{ ...finalTdCategorySubtotalLabel, color: INVEST_SUMMARY_COLOR }}>투자/저축 소계</td>
          <td style={{ ...finalTdCategorySubtotalAmount, color: INVEST_SUMMARY_COLOR }}>{fmt(totalInvest)}</td>
        </tr>
      </>
    )
  }
  // 액션 행만: 체크 가능한 lineRow
  return <>{body}</>
}

function deriveFixedDepositBreakdown(summary: {
  totalFixed: number
  fixedDepositByUser: { A: number; B: number }
}): { totalFixed: number; halfEach: number; separateByUser: { A: number; B: number } } {
  const halfEach = Math.round(summary.totalFixed / 2)
  return {
    totalFixed: summary.totalFixed,
    halfEach,
    separateByUser: {
      A: halfEach - summary.fixedDepositByUser.A,
      B: halfEach - summary.fixedDepositByUser.B,
    },
  }
}

interface SettlementResultViewProps {
  summary: {
    totalIncome: number
    totalFixed: number
    userSummary: {
      A: {
        fixedDeposit: number
        sharedLiving: number
        invest: number
        investDetail?: { 투자: number; 저축: number }
        investLineItems?: { 투자: InvestLineItem[]; 저축: InvestLineItem[] }
        allowance: number
        total: number
      }
      B: {
        fixedDeposit: number
        sharedLiving: number
        invest: number
        investDetail?: { 투자: number; 저축: number }
        investLineItems?: { 투자: InvestLineItem[]; 저축: InvestLineItem[] }
        allowance: number
        total: number
      }
    }
    chartData: { label: string; amount: number; pct: number }[]
    fixedDepositByUser: { A: number; B: number }
    /** 구버전 정산 요약·HMR 직후 등에서 누락될 수 있음 → 아래 derive로 보완 */
    fixedDepositBreakdown?: {
      totalFixed: number
      halfEach: number
      separateByUser: { A: number; B: number }
      totalIncludingSeparate?: number
      templateSeparateByUser?: { A: number; B: number }
      templateSeparateItemsByUser?: {
        A: { description: string; amount: number }[]
        B: { description: string; amount: number }[]
      }
    }
    separateExpenseCard5090?: {
      total: number
      paidA: number
      paidB: number
      fairShareEach: number
      transferAmount: number
      transferFrom: 'A' | 'B' | null
      transferTo: 'A' | 'B' | null
    } | null
    sharedFundExpense?: { total: number; halfEach: number } | null
  }
  personAName: string
  personBName: string
}

function IncomeStackedBar(props: { chartData: { label: string; amount: number; pct: number }[]; totalIncome: number }) {
  const { chartData, totalIncome } = props
  if (totalIncome <= 0 || chartData.length === 0) {
    return (
      <div style={{ fontSize: 13, color: JELLY.textMuted, padding: '12px 0' }}>수입이 없어 그래프를 표시할 수 없습니다.</div>
    )
  }

  return (
    <div style={incomeBarOuterStyle}>
      <div style={incomeBarTrackStyle}>
        {chartData.map((c) => {
          const w = Math.max(0, Math.min(100, (c.amount / totalIncome) * 100))
          const showPct = w >= 6
          const base = compositionSegmentColor(c)
          return (
            <div
              key={c.label}
              title={`${c.label} · ${fmt(c.amount)} (${c.pct.toFixed(1)}%)`}
              style={{
                width: `${w}%`,
                minWidth: w > 0 && w < 0.5 ? 2 : 0,
                flexShrink: 0,
                backgroundColor: base,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxSizing: 'border-box',
                position: 'relative',
              }}
            >
              {showPct ? (
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: '#fff',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    padding: '0 6px',
                  }}
                >
                  {Math.round(c.pct)}%
                </span>
              ) : null}
            </div>
          )
        })}
      </div>
    </div>
  )
}

export function SettlementResultView({
  summary,
  personAName,
  personBName,
}: SettlementResultViewProps) {
  const narrow = useNarrowLayout()
  const { userSummary, chartData, fixedDepositByUser, totalIncome } = summary
  const fixedDepositBreakdown = summary.fixedDepositBreakdown ?? deriveFixedDepositBreakdown(summary)
  const sep5090 = summary.separateExpenseCard5090
  const sepCardActive = sep5090 != null && sep5090.total > 0
  const [fixedDepositMoreOpen, setFixedDepositMoreOpen] = useState(false)
  /** 카드별 「상세 정보」 더보기 토글 */
  const [detailsOpen, setDetailsOpen] = useState<{ A: boolean; B: boolean }>({ A: false, B: false })
  /** 정산 화면에서만 쓰는 납부 확인용 체크(저장·계산 미반영) */
  const [userPayChecked, setUserPayChecked] = useState<{
    A: {
      deposit: boolean
      sharedLiving: boolean
      /** 별도 지출 카드 50:50 송금액 — 보내는 쪽만 체크 UI 표시 */
      transfer5090Send: boolean
      /** 별도지출 반반 정산 (공금 결제 항목 절반 부담) */
      sharedFundExpense: boolean
      /** 고정지출 별도 정산 항목별 체크 (index 기반) */
      separateItemChecks: Record<number, boolean>
      /** 투자/저축 트리: inv-0, sav-0 | cat-inv, cat-sav | combined */
      investChecks: Record<string, boolean>
    }
    B: {
      deposit: boolean
      sharedLiving: boolean
      transfer5090Send: boolean
      sharedFundExpense: boolean
      separateItemChecks: Record<number, boolean>
      investChecks: Record<string, boolean>
    }
  }>({
    A: {
      deposit: false,
      sharedLiving: false,
      transfer5090Send: false,
      sharedFundExpense: false,
      separateItemChecks: {},
      investChecks: {},
    },
    B: {
      deposit: false,
      sharedLiving: false,
      transfer5090Send: false,
      sharedFundExpense: false,
      separateItemChecks: {},
      investChecks: {},
    },
  })

  return (
    <div style={{ paddingBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: JELLY.text, margin: '0 0 20px' }}>정산 결과</h2>

      <div style={{ marginBottom: 20, ...settingsSectionCardStyle }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: JELLY.text, marginBottom: 8 }}>이번 달 수입 구성</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
          수입 <span style={{ fontWeight: 700, color: JELLY.text }}>{fmt(totalIncome)}</span>
        </div>
        <IncomeStackedBar chartData={chartData} totalIncome={totalIncome} />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 16px',
            marginTop: 14,
            fontSize: 12,
            color: JELLY.textMuted,
          }}
        >
          {chartData.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: '50%',
                  backgroundColor: compositionSegmentColor(c),
                  flexShrink: 0,
                }}
              />
              <span style={{ color: c.label === '용돈' ? allowanceValueColor(c.amount) : JELLY.text }}>
                {c.label} {c.pct.toFixed(1)}% · {fmt(c.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 20, ...settingsSectionCardStyle }}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            marginBottom: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 14, fontWeight: 700, color: JELLY.text }}>고정 지출 통장에 입금할 돈</div>
          <button
            type="button"
            onClick={() => setFixedDepositMoreOpen((o) => !o)}
            style={{
              fontSize: 12,
              padding: '8px 16px',
              borderRadius: JELLY.radiusControl,
              border: JELLY.innerBorderSoft,
              background: 'rgba(255,255,255,0.35)',
              backdropFilter: JELLY.blur,
              WebkitBackdropFilter: JELLY.blur,
              color: JELLY.text,
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {fixedDepositMoreOpen ? '접기' : '더보기'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: JELLY.textMuted, marginBottom: 4 }}>{personAName}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: PRIMARY }}>
              {fmt(fixedDepositByUser.A)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: JELLY.textMuted, marginBottom: 4 }}>{personBName}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: PRIMARY }}>
              {fmt(fixedDepositByUser.B)}
            </div>
          </div>
        </div>
        {fixedDepositMoreOpen ? (
          <div
            style={{
              marginTop: 14,
              paddingTop: 14,
              borderTop: '1px solid rgba(148, 163, 184, 0.22)',
              fontSize: 12,
              color: JELLY.textMuted,
              lineHeight: 1.65,
              display: 'flex',
              flexDirection: 'column',
              gap: 8,
            }}
          >
            {(() => {
              const total = fixedDepositBreakdown.totalIncludingSeparate ?? fixedDepositBreakdown.totalFixed
              const halfEach = fixedDepositBreakdown.halfEach
              const sepA = fixedDepositBreakdown.templateSeparateByUser?.A ?? 0
              const sepB = fixedDepositBreakdown.templateSeparateByUser?.B ?? 0
              const itemsA = fixedDepositBreakdown.templateSeparateItemsByUser?.A ?? []
              const itemsB = fixedDepositBreakdown.templateSeparateItemsByUser?.B ?? []
              const depositA = fixedDepositByUser.A
              const depositB = fixedDepositByUser.B
              const renderItems = (items: { description: string; amount: number }[]) => {
                if (items.length === 0) return '없음'
                return items.map((it) => `${it.description}(${fmt(it.amount)})`).join(', ')
              }
              return (
                <>
                  <div>
                    · 고정지출 합계는 <strong style={{ color: '#374151' }}>{fmt(total)}</strong>이며 절반씩 부담하므로, 1인당{' '}
                    <strong style={{ color: '#374151' }}>{fmt(halfEach)}</strong>을 부담합니다.
                  </div>
                  <div>
                    · <strong style={{ color: '#374151' }}>{personAName}</strong>이{' '}
                    <strong style={{ color: '#374151' }}>{fmt(sepA)}</strong>을 별도 정산하여 공동 통장에는{' '}
                    <strong style={{ color: PRIMARY }}>{fmt(depositA)}</strong>을{' '}
                    {depositA > 0 ? '입금하면 됩니다.' : '입금하지 않아도 됩니다.'}
                  </div>
                  <div style={{ paddingLeft: 12, fontSize: 11, color: '#9ca3af' }}>
                    * 별도 정산한 항목: {renderItems(itemsA)}
                  </div>
                  <div>
                    · <strong style={{ color: '#374151' }}>{personBName}</strong>가{' '}
                    <strong style={{ color: '#374151' }}>{fmt(sepB)}</strong>을 별도 정산하여 공동 통장에는{' '}
                    <strong style={{ color: PRIMARY }}>{fmt(depositB)}</strong>을{' '}
                    {depositB > 0 ? '부담합니다.' : '부담하지 않아도 됩니다.'}
                  </div>
                  <div style={{ paddingLeft: 12, fontSize: 11, color: '#9ca3af' }}>
                    * 별도 정산한 항목: {renderItems(itemsB)}
                  </div>
                </>
              )
            })()}
          </div>
        ) : null}
      </div>

      {summary.separateExpenseCard5090 && summary.separateExpenseCard5090.total > 0 ? (
        <div style={{ marginBottom: 20, ...settingsSectionCardStyle }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: JELLY.text, marginBottom: 10 }}>별도지출 - 송금 정산</div>
          <div style={{ fontSize: 12, color: JELLY.textMuted, lineHeight: 1.65, marginBottom: 8 }}>
            별도 지출 카드 합계 <strong style={{ color: '#374151' }}>{fmt(summary.separateExpenseCard5090.total)}</strong>
            은 두 사람이 동일하게{' '}
            <strong style={{ color: '#374151' }}>{fmt(summary.separateExpenseCard5090.fairShareEach)}</strong>씩 부담합니다.
            실제 낸 금액은 <strong style={{ color: '#374151' }}>{personAName}</strong>{' '}
            {fmt(summary.separateExpenseCard5090.paidA)} · <strong style={{ color: '#374151' }}>{personBName}</strong>{' '}
            {fmt(summary.separateExpenseCard5090.paidB)}입니다.
          </div>
          {summary.separateExpenseCard5090.transferAmount > 0 &&
          summary.separateExpenseCard5090.transferFrom &&
          summary.separateExpenseCard5090.transferTo ? (
            <div
              style={{
                padding: '12px 14px',
                borderRadius: JELLY.radiusControl,
                background: 'rgba(14, 165, 233, 0.1)',
                border: '1px solid rgba(14, 165, 233, 0.28)',
                fontSize: 13,
                fontWeight: 700,
                color: JELLY.text,
                lineHeight: 1.5,
              }}
            >
              {summary.separateExpenseCard5090.transferFrom === 'A' ? personAName : personBName} →{' '}
              {summary.separateExpenseCard5090.transferTo === 'A' ? personAName : personBName} 송금{' '}
              <span style={{ color: PRIMARY }}>{fmt(summary.separateExpenseCard5090.transferAmount)}</span>
              <span style={{ display: 'block', marginTop: 6, fontSize: 11, fontWeight: 500, color: JELLY.textMuted }}>
                적게 지출한 쪽이 차액의 절반을 내면 실부담이 같아집니다.
              </span>
              {summary.separateExpenseCard5090.transferFrom ? (
                <label
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                    marginTop: 12,
                    fontSize: 12,
                    fontWeight: 600,
                    color: JELLY.text,
                    cursor: 'pointer',
                  }}
                >
                  <input
                    type="checkbox"
                    checked={userPayChecked[summary.separateExpenseCard5090.transferFrom].transfer5090Send}
                    onChange={(e) => {
                      const from = summary.separateExpenseCard5090!.transferFrom!
                      setUserPayChecked((prev) => ({
                        ...prev,
                        [from]: { ...prev[from], transfer5090Send: e.target.checked },
                      }))
                    }}
                    style={{ ...checkboxStyle, marginTop: 0, width: 17, height: 17 }}
                  />
                  <span>송금 완료(납부 확인)</span>
                </label>
              ) : null}
            </div>
          ) : (
            <div style={{ fontSize: 12, color: JELLY.textMuted }}>실지출이 같아 추가 송금이 없습니다.</div>
          )}
        </div>
      ) : null}

      {summary.sharedFundExpense && summary.sharedFundExpense.total > 0 ? (
        <div style={{ marginBottom: 20, ...settingsSectionCardStyle }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: JELLY.text, marginBottom: 10 }}>
            별도지출 - 반반 정산
          </div>
          <div style={{ fontSize: 12, color: JELLY.textMuted, lineHeight: 1.65 }}>
            공금으로 결제한 별도 지출 합계 <strong style={{ color: '#374151' }}>{fmt(summary.sharedFundExpense.total)}</strong>은
            공동 통장에서 빠지므로 두 사람이 자동으로{' '}
            <strong style={{ color: PRIMARY }}>{fmt(summary.sharedFundExpense.halfEach)}</strong>씩 부담합니다.
            <span style={{ display: 'block', marginTop: 4, color: '#9ca3af' }}>(개별 송금 없음)</span>
          </div>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: JELLY.text }}>유저별 각자 낼 돈</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: narrow ? 'minmax(0, 1fr)' : 'repeat(2, minmax(0, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}
        >
        {(['A', 'B'] as const).map((p, idx) => {
          const u = userSummary[p]
          const name = p === 'A' ? personAName : personBName
          const payChk = userPayChecked[p as PersonKey]
          const fairEach = sepCardActive ? sep5090!.fairShareEach : 0
          const paidOnSeparateCard = sepCardActive ? (p === 'A' ? sep5090!.paidA : sep5090!.paidB) : 0
          const sendSeparate = sepCardActive && sep5090!.transferFrom === p ? sep5090!.transferAmount : 0
          const recvSeparate = sepCardActive && sep5090!.transferTo === p ? sep5090!.transferAmount : 0

          // 사용자 컬러를 헤더와 동일하게 사용
          const userColor = CHART_COLORS[idx % CHART_COLORS.length]
          const userBorderStyle = `1px solid ${userColor}`
          const userDashStyle = `1px dashed ${userColor}`

          // 사용자 컬러 기반 스타일 객체들
          const userTdLabelBase: CSSProperties = { ...tdLabelBase, borderBottom: userDashStyle }
          const userTdAmountBase: CSSProperties = { ...tdAmountBase, borderBottom: userDashStyle }
          const userTdFixedGroupHeader: CSSProperties = { ...tdFixedGroupHeader, borderBottom: userDashStyle }
          const userTdFixedGroupHeaderAmount: CSSProperties = { ...tdFixedGroupHeaderAmount, borderBottom: userDashStyle }
          const userTdInvestGroupHeader: CSSProperties = { ...tdInvestGroupHeader, borderBottom: userDashStyle }
          const userTdTreeChildLabel: CSSProperties = { ...tdTreeChildLabel, borderBottom: userDashStyle }
          const userTdTreeChildAmount: CSSProperties = { ...tdTreeChildAmount, borderBottom: userDashStyle }
          const userTdSepCardLabel: CSSProperties = { ...tdSepCardLabel, borderBottom: userDashStyle }
          const userTdSepCardAmount: CSSProperties = { ...tdSepCardAmount, borderBottom: userDashStyle }
          const userTdCategorySubtotalLabel: CSSProperties = { ...tdCategorySubtotalLabel, borderBottom: userDashStyle }
          const userTdCategorySubtotalAmount: CSSProperties = { ...tdCategorySubtotalAmount, borderBottom: userDashStyle }

          /** 모든 행의 라벨/금액 통일 스타일 (글자 크기 통일) */
          const userRowLabelStyle: CSSProperties = {
            ...userTdLabelBase,
            paddingLeft: 4,
            fontSize: 13,
            fontWeight: 500,
          }
          const userRowAmountStyle: CSSProperties = {
            ...userTdAmountBase,
            fontSize: 13,
            fontWeight: 500,
          }

          return (
            <div
              key={p}
              style={{
                minWidth: 0,
                background: RECEIPT_BG,
                border: userBorderStyle,
                borderRadius: 10,
                boxShadow: '0 2px 14px rgba(0,0,0,0.07)',
                overflow: 'hidden',
              }}
            >
              {/* 영수증 헤더 */}
              <div
                style={{
                  background: CHART_COLORS[idx % CHART_COLORS.length],
                  padding: '16px 20px 14px',
                  textAlign: 'center',
                  borderBottom: '2px dashed rgba(255,255,255,0.45)',
                }}
              >
                <div style={{ fontSize: 17, fontWeight: 700, color: '#fff' }}>{name}</div>
                <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.72)', marginTop: 4 }}>이번 달 각자 낼 돈</div>
              </div>
              {/* 영수증 바디 */}
              <div style={{ padding: '4px 18px 16px' }}>
              <table style={userPayTableStyle}>
                <colgroup>
                  <col style={{ width: '58%' }} />
                  <col style={{ width: '42%' }} />
                </colgroup>
                <tbody>
                  {/* ─── 액션 행 (항상 표시) ─── */}
                  <tr>
                    <td style={userRowLabelStyle}>
                      <label style={labelWithCheckboxStyle}>
                        <input
                          type="checkbox"
                          checked={payChk.deposit}
                          onChange={(e) =>
                            setUserPayChecked((prev) => ({
                              ...prev,
                              [p]: { ...prev[p as PersonKey], deposit: e.target.checked },
                            }))
                          }
                          style={checkboxStyle}
                        />
                        <span style={{ minWidth: 0, lineHeight: 1.4, ...(payChk.deposit && settledRowStyle) }}>
                          고정지출 통장 입금
                        </span>
                      </label>
                    </td>
                    <td style={{ ...userRowAmountStyle, ...(payChk.deposit && settledRowStyle) }}>
                      {fmt(u.fixedDeposit)}
                    </td>
                  </tr>
                  {sendSeparate > 0 && (
                    <tr>
                      <td style={userRowLabelStyle}>
                        <label style={labelWithCheckboxStyle}>
                          <input
                            type="checkbox"
                            checked={payChk.transfer5090Send}
                            onChange={(e) =>
                              setUserPayChecked((prev) => ({
                                ...prev,
                                [p]: { ...prev[p as PersonKey], transfer5090Send: e.target.checked },
                              }))
                            }
                            style={checkboxStyle}
                          />
                          <span style={{ minWidth: 0, lineHeight: 1.4, ...(payChk.transfer5090Send && settledRowStyle) }}>
                            별도 지출 · 송금할 돈
                          </span>
                        </label>
                      </td>
                      <td style={{ ...userRowAmountStyle, ...(payChk.transfer5090Send && settledRowStyle) }}>
                        {fmt(sendSeparate)}
                      </td>
                    </tr>
                  )}
                  <tr>
                    <td style={userRowLabelStyle}>
                      <label style={labelWithCheckboxStyle}>
                        <input
                          type="checkbox"
                          checked={payChk.sharedLiving}
                          onChange={(e) =>
                            setUserPayChecked((prev) => ({
                              ...prev,
                              [p]: { ...prev[p as PersonKey], sharedLiving: e.target.checked },
                            }))
                          }
                          style={checkboxStyle}
                        />
                        <span style={{ minWidth: 0, lineHeight: 1.4, ...(payChk.sharedLiving && settledRowStyle) }}>
                          공동 생활비
                        </span>
                      </label>
                    </td>
                    <td style={{ ...userRowAmountStyle, ...(payChk.sharedLiving && settledRowStyle) }}>
                      {fmt(u.sharedLiving)}
                    </td>
                  </tr>
                  {/* 고정지출 「별도 정산」 항목: 본인이 직접 부담한 항목 표시 */}
                  {(fixedDepositBreakdown.templateSeparateItemsByUser?.[p] ?? []).map((item, itemIdx) => {
                    const checked = payChk.separateItemChecks[itemIdx] ?? false
                    return (
                      <tr key={`sep-item-${itemIdx}`}>
                        <td style={userRowLabelStyle}>
                          <label style={labelWithCheckboxStyle}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                setUserPayChecked((prev) => ({
                                  ...prev,
                                  [p]: {
                                    ...prev[p as PersonKey],
                                    separateItemChecks: {
                                      ...prev[p as PersonKey].separateItemChecks,
                                      [itemIdx]: e.target.checked,
                                    },
                                  },
                                }))
                              }
                              style={checkboxStyle}
                            />
                            <span style={{ minWidth: 0, lineHeight: 1.4, ...(checked && settledRowStyle) }}>
                              {item.description}{' '}
                              <span style={{ fontSize: 10, color: '#9ca3af' }}>(별도 정산)</span>
                            </span>
                          </label>
                        </td>
                        <td style={{ ...userRowAmountStyle, ...(checked && settledRowStyle) }}>
                          {fmt(item.amount)}
                        </td>
                      </tr>
                    )
                  })}
                  {summary.sharedFundExpense && summary.sharedFundExpense.halfEach > 0 && (
                    <tr>
                      <td style={userRowLabelStyle}>
                        <label style={labelWithCheckboxStyle}>
                          <input
                            type="checkbox"
                            checked={payChk.sharedFundExpense}
                            onChange={(e) =>
                              setUserPayChecked((prev) => ({
                                ...prev,
                                [p]: { ...prev[p as PersonKey], sharedFundExpense: e.target.checked },
                              }))
                            }
                            style={checkboxStyle}
                          />
                          <span style={{ minWidth: 0, lineHeight: 1.4, ...(payChk.sharedFundExpense && settledRowStyle) }}>
                            별도지출 반반 정산
                          </span>
                        </label>
                      </td>
                      <td style={{ ...userRowAmountStyle, ...(payChk.sharedFundExpense && settledRowStyle) }}>
                        {fmt(summary.sharedFundExpense.halfEach)}
                      </td>
                    </tr>
                  )}
                  <UserInvestTreeRows
                    investDetail={u.investDetail}
                    investLineItems={u.investLineItems}
                    totalInvest={u.invest}
                    checks={payChk.investChecks}
                    mode="actions"
                    onToggle={(key, checked) =>
                      setUserPayChecked((prev) => ({
                        ...prev,
                        [p]: {
                          ...prev[p as PersonKey],
                          investChecks: { ...prev[p as PersonKey].investChecks, [key]: checked },
                        },
                      }))
                    }
                    userTdInvestGroupHeader={userTdInvestGroupHeader}
                    userTdTreeChildLabel={userTdTreeChildLabel}
                    userTdTreeChildAmount={userTdTreeChildAmount}
                    userTdCategorySubtotalLabel={userTdCategorySubtotalLabel}
                    userTdCategorySubtotalAmount={userTdCategorySubtotalAmount}
                  />

                  {/* ─── 합계 영역 ─── */}
                  <tr style={{ borderTop: `2px solid ${userColor}` }}>
                    <td
                      style={{
                        ...userRowLabelStyle,
                        borderBottom: 'none',
                        paddingTop: 12,
                        paddingBottom: 8,
                        fontWeight: 700,
                        color: RECEIPT_TEXT,
                      }}
                    >
                      총 내야할 돈
                    </td>
                    <td
                      style={{
                        ...userRowAmountStyle,
                        borderBottom: 'none',
                        paddingTop: 12,
                        paddingBottom: 8,
                        fontWeight: 700,
                        color: RECEIPT_TEXT,
                      }}
                    >
                      {fmt(u.total)}
                    </td>
                  </tr>
                  <tr>
                    <td
                      style={{
                        ...userRowLabelStyle,
                        borderBottom: 'none',
                        paddingTop: 4,
                        paddingBottom: 12,
                        color: RECEIPT_MUTED,
                      }}
                    >
                      최종 용돈
                    </td>
                    <td
                      style={{
                        ...userRowAmountStyle,
                        borderBottom: 'none',
                        paddingTop: 4,
                        paddingBottom: 12,
                        fontWeight: 600,
                        color: allowanceValueColor(u.allowance),
                      }}
                    >
                      {fmt(u.allowance)}
                    </td>
                  </tr>
                </tbody>
              </table>
              {/* 더보기 / 접기 토글 */}
              <button
                type="button"
                onClick={() =>
                  setDetailsOpen((prev) => ({ ...prev, [p]: !prev[p] }))
                }
                style={{
                  marginTop: 10,
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #e5e7eb',
                  background: '#fafafa',
                  borderRadius: 8,
                  cursor: 'pointer',
                  fontSize: 12,
                  fontWeight: 500,
                  color: '#6b7280',
                  fontFamily: 'inherit',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                }}
              >
                <span>{detailsOpen[p] ? '상세 접기' : '상세 보기'}</span>
                {detailsOpen[p] ? (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M20.2959 15.7957C20.1914 15.9006 20.0672 15.9838 19.9304 16.0406C19.7937 16.0974 19.6471 16.1266 19.499 16.1266C19.351 16.1266 19.2043 16.0974 19.0676 16.0406C18.9309 15.9838 18.8067 15.9006 18.7021 15.7957L12 9.09354L5.2959 15.7957C5.08455 16.0071 4.79791 16.1258 4.49902 16.1258C4.20014 16.1258 3.91349 16.0071 3.70215 15.7957C3.4908 15.5844 3.37207 15.2977 3.37207 14.9989C3.37207 14.7 3.4908 14.4133 3.70215 14.202L11.2021 6.70198C11.3067 6.5971 11.4309 6.51388 11.5676 6.4571C11.7043 6.40032 11.851 6.37109 11.999 6.37109C12.1471 6.37109 12.2937 6.40032 12.4304 6.4571C12.5672 6.51388 12.6914 6.5971 12.7959 6.70198L20.2959 14.202C20.4008 14.3065 20.484 14.4307 20.5408 14.5674C20.5976 14.7042 20.6268 14.8508 20.6268 14.9989C20.6268 15.1469 20.5976 15.2935 20.5408 15.4303C20.484 15.567 20.4008 15.6912 20.2959 15.7957Z"
                      fill="currentColor"
                    />
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" aria-hidden>
                    <path
                      d="M20.2959 9.79586L12.7959 17.2959C12.6914 17.4007 12.5672 17.484 12.4304 17.5407C12.2937 17.5975 12.1471 17.6267 11.999 17.6267C11.851 17.6267 11.7043 17.5975 11.5676 17.5407C11.4309 17.484 11.3067 17.4007 11.2021 17.2959L3.70215 9.79586C3.4908 9.58451 3.37207 9.29787 3.37207 8.99898C3.37207 8.7001 3.4908 8.41345 3.70215 8.20211C3.91349 7.99076 4.20014 7.87203 4.49902 7.87203C4.79791 7.87203 5.08455 7.99076 5.2959 8.20211L12 14.9062L18.704 8.20117C18.9154 7.98983 19.202 7.87109 19.5009 7.87109C19.7998 7.87109 20.0864 7.98983 20.2978 8.20117C20.5091 8.41252 20.6278 8.69916 20.6278 8.99805C20.6278 9.29693 20.5091 9.58358 20.2978 9.79492L20.2959 9.79586Z"
                      fill="currentColor"
                    />
                  </svg>
                )}
              </button>
              {/* 상세 박스 (글 형태 서술) */}
              {detailsOpen[p] && (() => {
                const totalFixed =
                  fixedDepositBreakdown.totalIncludingSeparate ?? fixedDepositBreakdown.totalFixed
                const halfFixed = fixedDepositBreakdown.halfEach
                const ownSep = fixedDepositBreakdown.separateByUser[p]
                const deposit = u.fixedDeposit
                const sepCardTotal = sep5090?.total ?? 0
                const sepDiff = paidOnSeparateCard - fairEach
                return (
                  <div
                    style={{
                      marginTop: 12,
                      padding: '14px 16px',
                      background: '#f9fafb',
                      border: '1px solid #e5e7eb',
                      borderRadius: 10,
                      fontSize: 12,
                      lineHeight: 1.7,
                      color: '#374151',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: 10,
                    }}
                  >
                    <div>
                      이번 달 고정 지출은 <strong>{fmt(totalFixed)}</strong>이고 1인당{' '}
                      <strong>{fmt(halfFixed)}</strong>을 부담해야합니다.{' '}
                      {ownSep > 0 ? (
                        <>
                          개별 부담한 금액이 <strong>{fmt(ownSep)}</strong>이기 때문에{' '}
                          <strong style={{ color: PRIMARY }}>{fmt(deposit)}</strong>을 공동 지출 통장에 입금하면 됩니다.
                        </>
                      ) : (
                        <>
                          <strong style={{ color: PRIMARY }}>{fmt(deposit)}</strong>을 공동 지출 통장에 입금하면 됩니다.
                        </>
                      )}
                    </div>
                    {sepCardTotal > 0 && (
                      <div>
                        이번 달 별도 지출한 금액은 <strong>{fmt(sepCardTotal)}</strong>이고 1인당{' '}
                        <strong>{fmt(fairEach)}</strong>을 부담해야합니다. 실제 낸 금액이{' '}
                        <strong>{fmt(paidOnSeparateCard)}</strong>이기 때문에{' '}
                        {sepDiff > 0 ? (
                          <>
                            상대방에게 <strong style={{ color: PRIMARY }}>{fmt(sepDiff)}</strong>을 받아야합니다.
                          </>
                        ) : sepDiff < 0 ? (
                          <>
                            상대방에게 <strong style={{ color: PRIMARY }}>{fmt(-sepDiff)}</strong>을 송금해야합니다.
                          </>
                        ) : (
                          <>주고받을 금액이 없습니다.</>
                        )}
                      </div>
                    )}
                    {u.invest > 0 && (
                      <div>
                        이번 달 투자/저축은 총 <strong>{fmt(u.invest)}</strong>입니다.
                      </div>
                    )}
                    <div style={{ paddingTop: 8, borderTop: '1px dashed #d1d5db' }}>
                      이번 달 고정지출, 별도 지출, 공동 생활비, 투자/저축에 내는 돈은 총{' '}
                      <strong>{fmt(u.total)}</strong>이므로 최종 용돈은{' '}
                      <strong style={{ color: allowanceValueColor(u.allowance) }}>{fmt(u.allowance)}</strong>입니다.
                    </div>
                  </div>
                )
              })()}
              </div>
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
