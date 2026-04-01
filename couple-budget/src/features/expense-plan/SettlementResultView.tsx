import { useState, type CSSProperties, type ReactNode } from 'react'
import { PRIMARY, allowanceValueColor, settingsSectionCardStyle } from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { SUB_CHART_COLORS, SUB_FIXED_ACCENT, SUB_INVEST_ACCENT } from '@/styles/oklchSubColors'

const CHART_COLORS = SUB_CHART_COLORS

/** 고정/투자는 서브 OKLCH, 공동생활비는 포인트(버튼) 컬러 */
const FIXED_EXPENSE_SUMMARY_COLOR = SUB_FIXED_ACCENT
const INVEST_SUMMARY_COLOR = SUB_INVEST_ACCENT

function compositionSegmentColor(c: { label: string; amount: number }): string {
  if (c.label === '고정지출') return SUB_FIXED_ACCENT
  if (c.label === '공동생활비') return PRIMARY
  if (c.label === '투자·저축') return SUB_INVEST_ACCENT
  if (c.label === '용돈') return allowanceValueColor(c.amount)
  return 'oklch(0.75 0.04 250 / 1)'
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

const userPayTableStyle: CSSProperties = {
  width: '100%',
  borderCollapse: 'collapse',
  tableLayout: 'fixed',
  fontSize: 13,
}

const tdLabelBase: CSSProperties = {
  padding: '10px 8px 10px 0',
  color: JELLY.text,
  verticalAlign: 'top',
  borderBottom: '1px solid rgba(255,255,255,0.35)',
}

const tdAmountBase: CSSProperties = {
  padding: '10px 0',
  textAlign: 'right',
  fontWeight: 500,
  color: JELLY.text,
  verticalAlign: 'top',
  borderBottom: '1px solid #f3f4f6',
  whiteSpace: 'nowrap',
}

const tdFixedGroupHeader: CSSProperties = {
  padding: '10px 8px 6px 0',
  fontSize: 12,
  fontWeight: 700,
  color: FIXED_EXPENSE_SUMMARY_COLOR,
  borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
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
  borderBottom: '1px solid rgba(148, 163, 184, 0.25)',
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
  color: JELLY.textMuted,
  fontWeight: 500,
}

const tdSepCardAmount: CSSProperties = {
  ...tdTreeChildAmount,
  fontSize: 12,
}

/** 고카테고리 소계 행 (고정·별도 / 투자·저축) */
const tdCategorySubtotalLabel: CSSProperties = {
  ...tdLabelBase,
  paddingLeft: 12,
  paddingTop: 10,
  fontWeight: 700,
  fontSize: 12,
  color: JELLY.text,
}

const tdCategorySubtotalAmount: CSSProperties = {
  ...tdAmountBase,
  paddingTop: 10,
  fontWeight: 700,
  fontSize: 13,
  color: JELLY.text,
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

type PersonKey = 'A' | 'B'

/** 투자/저축 그룹: 헤더 + (세부 라인 | 투자·저축 구분 | 단일 합계) */
function UserInvestTreeRows(props: {
  investDetail?: { 투자: number; 저축: number }
  investLineItems?: { 투자: InvestLineItem[]; 저축: InvestLineItem[] }
  totalInvest: number
  checks: Record<string, boolean>
  onToggle: (key: string, checked: boolean) => void
}) {
  const { investDetail, investLineItems, totalInvest, checks, onToggle } = props
  const inv = investLineItems?.투자 ?? []
  const sav = investLineItems?.저축 ?? []
  const hasLines = inv.length > 0 || sav.length > 0

  const lineRow = (key: string, label: string, amount: number) => (
    <tr key={key}>
      <td style={tdTreeChildLabel}>
        <label style={labelWithCheckboxStyle}>
          <input
            type="checkbox"
            checked={checks[key] ?? false}
            onChange={(e) => onToggle(key, e.target.checked)}
            style={checkboxStyle}
          />
          <span style={{ display: 'block', overflow: 'hidden', textOverflow: 'ellipsis', minWidth: 0, lineHeight: 1.4 }}>
            {label}
          </span>
        </label>
      </td>
      <td style={tdTreeChildAmount}>{fmt(amount)}</td>
    </tr>
  )

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

  return (
    <>
      <tr>
        <td colSpan={2} style={tdInvestGroupHeader}>
          투자/저축
        </td>
      </tr>
      {body}
      <tr style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
        <td style={{ ...tdCategorySubtotalLabel, color: INVEST_SUMMARY_COLOR }}>투자/저축 소계</td>
        <td style={{ ...tdCategorySubtotalAmount, color: INVEST_SUMMARY_COLOR }}>{fmt(totalInvest)}</td>
      </tr>
    </>
  )
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
  /** 정산 화면에서만 쓰는 납부 확인용 체크(저장·계산 미반영) */
  const [userPayChecked, setUserPayChecked] = useState<{
    A: {
      deposit: boolean
      sharedLiving: boolean
      /** 별도 지출 카드 50:50 송금액 — 보내는 쪽만 체크 UI 표시 */
      transfer5090Send: boolean
      /** 투자/저축 트리: inv-0, sav-0 | cat-inv, cat-sav | combined */
      investChecks: Record<string, boolean>
    }
    B: {
      deposit: boolean
      sharedLiving: boolean
      transfer5090Send: boolean
      investChecks: Record<string, boolean>
    }
  }>({
    A: {
      deposit: false,
      sharedLiving: false,
      transfer5090Send: false,
      investChecks: {},
    },
    B: {
      deposit: false,
      sharedLiving: false,
      transfer5090Send: false,
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
            <div>
              · 이번 달 적용 고정지출 합계는 <strong style={{ color: '#374151' }}>{fmt(fixedDepositBreakdown.totalFixed)}</strong>
              입니다.
            </div>
            <div>
              · 공동 통장에는 절반씩 부담하므로 1인당 기준액은{' '}
              <strong style={{ color: '#374151' }}>{fmt(fixedDepositBreakdown.halfEach)}</strong>
              (합계 ÷ 2, 반올림)입니다.
            </div>
            <div>
              · <strong style={{ color: '#374151' }}>{personAName}</strong>: 고정지출 중 「별도·개별 부담」으로 본인이 직접 낸 항목{' '}
              <strong style={{ color: '#374151' }}>{fmt(fixedDepositBreakdown.separateByUser.A)}</strong>을 빼면 통장 입금액은{' '}
              <strong style={{ color: PRIMARY }}>{fmt(fixedDepositByUser.A)}</strong>입니다.{' '}
              <span style={{ color: '#9ca3af' }}>(기준액 − 별도 부담)</span>
            </div>
            <div>
              · <strong style={{ color: '#374151' }}>{personBName}</strong>: 고정지출 중 「별도·개별 부담」으로 본인이 직접 낸 항목{' '}
              <strong style={{ color: '#374151' }}>{fmt(fixedDepositBreakdown.separateByUser.B)}</strong>을 빼면 통장 입금액은{' '}
              <strong style={{ color: PRIMARY }}>{fmt(fixedDepositByUser.B)}</strong>입니다.{' '}
              <span style={{ color: '#9ca3af' }}>(기준액 − 별도 부담)</span>
            </div>
          </div>
        ) : null}
      </div>

      {summary.separateExpenseCard5090 && summary.separateExpenseCard5090.total > 0 ? (
        <div style={{ marginBottom: 20, ...settingsSectionCardStyle }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: JELLY.text, marginBottom: 10 }}>별도 지출 (50:50 정산)</div>
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
          return (
            <div
              key={p}
              style={{
                minWidth: 0,
                ...settingsSectionCardStyle,
                borderTop: `4px solid ${CHART_COLORS[idx % CHART_COLORS.length]}`,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: JELLY.text, marginBottom: 12 }}>
                {name} 최종 낼 돈
              </div>
              <table style={userPayTableStyle}>
                <colgroup>
                  <col style={{ width: '58%' }} />
                  <col style={{ width: '42%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td style={tdFixedGroupHeader}>고정지출 + 별도 지출</td>
                    <td style={tdFixedGroupHeaderAmount}>
                      {fmt(u.fixedDeposit + fixedDepositBreakdown.separateByUser[p])}
                    </td>
                  </tr>
                  <tr>
                    <td style={tdTreeChildLabel}>
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
                        <span style={{ minWidth: 0, lineHeight: 1.4 }}>고정지출 통장 입금</span>
                      </label>
                    </td>
                    <td style={tdTreeChildAmount}>{fmt(u.fixedDeposit)}</td>
                  </tr>
                  <tr>
                    <td style={tdTreeChildLabel}>
                      <span style={{ display: 'block', minWidth: 0, lineHeight: 1.4 }}>별도/개별 부담</span>
                    </td>
                    <td style={tdTreeChildAmount}>{fmt(fixedDepositBreakdown.separateByUser[p])}</td>
                  </tr>
                  <tr>
                    <td style={tdSepCardLabel}>
                      <span style={{ lineHeight: 1.45 }}>별도 지출 카드 · 1인 부담(50%)</span>
                    </td>
                    <td style={tdSepCardAmount}>{fmt(fairEach)}</td>
                  </tr>
                  <tr>
                    <td style={tdSepCardLabel}>
                      <span style={{ lineHeight: 1.45 }}>별도 지출 카드 · 실제 낸 금액</span>
                    </td>
                    <td style={tdSepCardAmount}>{fmt(paidOnSeparateCard)}</td>
                  </tr>
                  <tr>
                    <td style={tdSepCardLabel}>
                      {sendSeparate > 0 ? (
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
                            style={{ ...checkboxStyle, marginTop: 1 }}
                          />
                          <span style={{ lineHeight: 1.45 }}>별도 지출 · 송금할 돈</span>
                        </label>
                      ) : (
                        <span style={{ lineHeight: 1.45 }}>별도 지출 · 송금할 돈</span>
                      )}
                    </td>
                    <td style={tdSepCardAmount}>{fmt(sendSeparate)}</td>
                  </tr>
                  <tr>
                    <td style={tdSepCardLabel}>
                      <span style={{ lineHeight: 1.45 }}>별도 지출 · 받을 돈</span>
                    </td>
                    <td style={tdSepCardAmount}>{fmt(recvSeparate)}</td>
                  </tr>
                  <tr style={{ borderTop: '1px solid #f3f4f6' }}>
                    <td style={{ ...tdLabelBase, paddingLeft: 4 }}>
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
                        <span style={{ minWidth: 0, lineHeight: 1.4 }}>공동 생활비</span>
                      </label>
                    </td>
                    <td style={tdAmountBase}>{fmt(u.sharedLiving)}</td>
                  </tr>
                  <UserInvestTreeRows
                    investDetail={u.investDetail}
                    investLineItems={u.investLineItems}
                    totalInvest={u.invest}
                    checks={payChk.investChecks}
                    onToggle={(key, checked) =>
                      setUserPayChecked((prev) => ({
                        ...prev,
                        [p]: {
                          ...prev[p as PersonKey],
                          investChecks: { ...prev[p as PersonKey].investChecks, [key]: checked },
                        },
                      }))
                    }
                  />
                  <tr style={{ borderTop: '2px solid rgba(148, 163, 184, 0.2)', background: 'rgba(255,255,255,0.35)' }}>
                    <td
                      style={{
                        ...tdLabelBase,
                        borderBottom: 'none',
                        paddingTop: 12,
                        paddingBottom: 12,
                        fontWeight: 700,
                        fontSize: 15,
                        color: JELLY.text,
                      }}
                    >
                      총 납부/배분 결과
                    </td>
                    <td
                      style={{
                        ...tdAmountBase,
                        borderBottom: 'none',
                        paddingTop: 12,
                        paddingBottom: 12,
                        fontWeight: 700,
                        fontSize: 15,
                        color: PRIMARY,
                      }}
                    >
                      {fmt(u.total)}
                    </td>
                  </tr>
                  <tr style={{ borderTop: '1px solid rgba(148, 163, 184, 0.2)' }}>
                    <td
                      style={{
                        ...tdLabelBase,
                        borderBottom: 'none',
                        paddingTop: 12,
                        paddingBottom: 12,
                      }}
                    >
                      최종 용돈
                    </td>
                    <td
                      style={{
                        ...tdAmountBase,
                        borderBottom: 'none',
                        paddingTop: 12,
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
            </div>
          )
        })}
        </div>
      </div>
    </div>
  )
}
