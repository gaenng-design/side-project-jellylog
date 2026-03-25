import { useState, type CSSProperties, type ReactNode } from 'react'
import { PRIMARY, allowanceValueColor } from '@/styles/formControls'

const CHART_COLORS = ['#0ea5e9', '#6366f1', '#8b5cf6', '#ec4899']

/** 지출 계획 상단 요약 카드와 동일 (ExpensePlanPage 수입/고정/투자·저축/용돈; 용돈은 금액 부호에 따라 틸/붉은색) */
const FIXED_EXPENSE_SUMMARY_COLOR = '#0ea5e9'
const INVEST_SUMMARY_COLOR = '#6366f1'

function compositionSegmentColor(c: { label: string; amount: number }): string {
  if (c.label === '고정지출') return FIXED_EXPENSE_SUMMARY_COLOR
  if (c.label === '공동생활비') return PRIMARY
  if (c.label === '투자·저축') return INVEST_SUMMARY_COLOR
  if (c.label === '용돈') return allowanceValueColor(c.amount)
  return '#9ca3af'
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
  color: '#374151',
  verticalAlign: 'top',
  borderBottom: '1px solid #f3f4f6',
}

const tdAmountBase: CSSProperties = {
  padding: '10px 0',
  textAlign: 'right',
  fontWeight: 500,
  color: '#111827',
  verticalAlign: 'top',
  borderBottom: '1px solid #f3f4f6',
  whiteSpace: 'nowrap',
}

const tdFixedGroupHeader: CSSProperties = {
  padding: '10px 8px 6px 0',
  fontSize: 12,
  fontWeight: 700,
  color: FIXED_EXPENSE_SUMMARY_COLOR,
  borderBottom: '1px solid #e5e7eb',
  verticalAlign: 'bottom',
}

const tdInvestGroupHeader: CSSProperties = {
  padding: '10px 8px 6px 0',
  fontSize: 12,
  fontWeight: 700,
  color: INVEST_SUMMARY_COLOR,
  borderBottom: '1px solid #e5e7eb',
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
  }
  personAName: string
  personBName: string
}

function IncomeStackedBar(props: { chartData: { label: string; amount: number; pct: number }[]; totalIncome: number }) {
  const { chartData, totalIncome } = props
  if (totalIncome <= 0 || chartData.length === 0) {
    return (
      <div style={{ fontSize: 13, color: '#9ca3af', padding: '12px 0' }}>수입이 없어 그래프를 표시할 수 없습니다.</div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        width: '100%',
        height: 36,
        borderRadius: 10,
        overflow: 'hidden',
        boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)',
      }}
    >
      {chartData.map((c) => {
        const w = Math.max(0, Math.min(100, (c.amount / totalIncome) * 100))
        const showPct = w >= 6
        const bg = compositionSegmentColor(c)
        return (
          <div
            key={c.label}
            title={`${c.label} · ${fmt(c.amount)} (${c.pct.toFixed(1)}%)`}
            style={{
              width: `${w}%`,
              minWidth: w > 0 && w < 0.5 ? 2 : 0,
              flexShrink: 0,
              background: bg,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxSizing: 'border-box',
            }}
          >
            {showPct ? (
              <span
                style={{
                  fontSize: 12,
                  fontWeight: 700,
                  color: '#fff',
                  whiteSpace: 'nowrap',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  padding: '0 4px',
                }}
              >
                {Math.round(c.pct)}%
              </span>
            ) : null}
          </div>
        )
      })}
    </div>
  )
}

export function SettlementResultView({
  summary,
  personAName,
  personBName,
}: SettlementResultViewProps) {
  const { userSummary, chartData, fixedDepositByUser, totalIncome } = summary
  const fixedDepositBreakdown = summary.fixedDepositBreakdown ?? deriveFixedDepositBreakdown(summary)
  const [fixedDepositMoreOpen, setFixedDepositMoreOpen] = useState(false)
  /** 정산 화면에서만 쓰는 납부 확인용 체크(저장·계산 미반영) */
  const [userPayChecked, setUserPayChecked] = useState<{
    A: {
      deposit: boolean
      separate: boolean
      sharedLiving: boolean
      /** 투자/저축 트리: inv-0, sav-0 | cat-inv, cat-sav | combined */
      investChecks: Record<string, boolean>
    }
    B: {
      deposit: boolean
      separate: boolean
      sharedLiving: boolean
      investChecks: Record<string, boolean>
    }
  }>({
    A: {
      deposit: false,
      separate: false,
      sharedLiving: false,
      investChecks: {},
    },
    B: {
      deposit: false,
      separate: false,
      sharedLiving: false,
      investChecks: {},
    },
  })

  return (
    <div style={{ paddingBottom: 40 }}>
      <h2 style={{ fontSize: 18, fontWeight: 700, color: '#111827', margin: '0 0 20px' }}>정산 결과</h2>

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 8 }}>이번 달 수입 구성</div>
        <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 14 }}>
          수입 <span style={{ fontWeight: 700, color: '#111827' }}>{fmt(totalIncome)}</span>
        </div>
        <IncomeStackedBar chartData={chartData} totalIncome={totalIncome} />
        <div
          style={{
            display: 'flex',
            flexWrap: 'wrap',
            gap: '10px 16px',
            marginTop: 14,
            fontSize: 12,
            color: '#374151',
          }}
        >
          {chartData.map((c) => (
            <div key={c.label} style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 2,
                  background: compositionSegmentColor(c),
                  flexShrink: 0,
                }}
              />
              <span style={{ color: c.label === '용돈' ? allowanceValueColor(c.amount) : '#374151' }}>
                {c.label} {c.pct.toFixed(1)}% · {fmt(c.amount)}
              </span>
            </div>
          ))}
        </div>
      </div>

      <div
        style={{
          marginBottom: 20,
          padding: 16,
          background: '#fff',
          borderRadius: 14,
          boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
        }}
      >
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
          <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>고정 지출 통장에 입금할 돈</div>
          <button
            type="button"
            onClick={() => setFixedDepositMoreOpen((o) => !o)}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: 8,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#374151',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            {fixedDepositMoreOpen ? '접기' : '더보기'}
          </button>
        </div>
        <div style={{ display: 'flex', gap: 16, flexWrap: 'wrap' }}>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{personAName}</div>
            <div style={{ fontSize: 16, fontWeight: 700, color: PRIMARY }}>
              {fmt(fixedDepositByUser.A)}
            </div>
          </div>
          <div style={{ flex: 1, minWidth: 140 }}>
            <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{personBName}</div>
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
              borderTop: '1px solid #e5e7eb',
              fontSize: 12,
              color: '#6b7280',
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

      <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>유저별 각자 낼 돈</div>
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(2, minmax(0, 1fr))',
            gap: 14,
            alignItems: 'start',
          }}
        >
        {(['A', 'B'] as const).map((p, idx) => {
          const u = userSummary[p]
          const name = p === 'A' ? personAName : personBName
          const payChk = userPayChecked[p as PersonKey]
          return (
            <div
              key={p}
              style={{
                minWidth: 0,
                padding: 16,
                background: '#fff',
                borderRadius: 14,
                boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
                borderLeft: `4px solid ${CHART_COLORS[idx % CHART_COLORS.length]}`,
              }}
            >
              <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 12 }}>
                {name} 최종 낼 돈
              </div>
              <table style={userPayTableStyle}>
                <colgroup>
                  <col style={{ width: '58%' }} />
                  <col style={{ width: '42%' }} />
                </colgroup>
                <tbody>
                  <tr>
                    <td colSpan={2} style={tdFixedGroupHeader}>
                      고정지출 + 별도 지출
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
                      <label style={labelWithCheckboxStyle}>
                        <input
                          type="checkbox"
                          checked={payChk.separate}
                          onChange={(e) =>
                            setUserPayChecked((prev) => ({
                              ...prev,
                              [p]: { ...prev[p as PersonKey], separate: e.target.checked },
                            }))
                          }
                          style={checkboxStyle}
                        />
                        <span style={{ minWidth: 0, lineHeight: 1.4 }}>별도/개별 부담</span>
                      </label>
                    </td>
                    <td style={tdTreeChildAmount}>{fmt(fixedDepositBreakdown.separateByUser[p])}</td>
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
                  <tr style={{ borderTop: '2px solid #e5e7eb', background: '#f9fafb' }}>
                    <td
                      style={{
                        ...tdLabelBase,
                        borderBottom: 'none',
                        paddingTop: 12,
                        paddingBottom: 12,
                        fontWeight: 700,
                        fontSize: 15,
                        color: '#111827',
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
                  <tr style={{ borderTop: '1px solid #e5e7eb' }}>
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
