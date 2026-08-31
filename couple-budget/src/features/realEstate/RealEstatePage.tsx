import { useState } from 'react'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { pageTitleH1Style, PRIMARY, PRIMARY_LIGHT, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE } from '@/styles/formControls'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'

type Tab = 'before' | 'after'

// ── 세금·수수료 계산 ──────────────────────────────────────────

/** 취득세 (지방교육세 포함 실효세율 기준) */
function calcAcquisitionTax(price: number, homeCount: number): number {
  if (homeCount >= 3) return price * 0.12
  if (homeCount === 2) return price * 0.08
  // 1주택
  if (price <= 600_000_000) return price * 0.01
  if (price <= 900_000_000) {
    // 6~9억 구간: 1→3% 선형 증가
    const rate = (price / 1_000_000 * 2 / 3 - 3) / 100
    return price * Math.max(0.01, Math.min(0.03, rate))
  }
  return price * 0.03
}

/** 중개수수료 상한 (2021년 이후 법정 요율) */
function calcAgentFee(price: number): number {
  if (price < 50_000_000)       return Math.min(price * 0.006, 250_000)
  if (price < 200_000_000)      return Math.min(price * 0.005, 800_000)
  if (price < 900_000_000)      return price * 0.004
  if (price < 1_200_000_000)    return price * 0.005
  if (price < 1_500_000_000)    return price * 0.006
  return price * 0.007
}

// ── 포맷 헬퍼 ────────────────────────────────────────────────

function fmtWon(n: number) {
  return Math.round(n).toLocaleString('ko-KR') + '원'
}

function fmtUnit(n: number) {
  if (n === 0) return '0원'
  const eok = Math.floor(n / 100_000_000)
  const man = Math.floor((n % 100_000_000) / 10_000)
  const rest = Math.round(n % 10_000)
  const parts: string[] = []
  if (eok > 0) parts.push(`${eok}억`)
  if (man > 0) parts.push(`${man}만`)
  if (rest > 0) parts.push(`${rest.toLocaleString('ko-KR')}`)
  return parts.join(' ') + '원'
}

// ── 공통 입력 스타일 ──────────────────────────────────────────

const inputStyle: React.CSSProperties = {
  width: '100%',
  height: 44,
  padding: '0 14px',
  borderRadius: INPUT_BORDER_RADIUS,
  border: '1.5px solid #E5E7EB',
  background: '#FFFFFF',
  fontSize: INPUT_FONT_SIZE,
  fontFamily: 'inherit',
  outline: 'none',
  boxSizing: 'border-box',
  color: '#1A1D1F',
}

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: '#6B7280',
  marginBottom: 6,
}

// ── 결과 행 컴포넌트 ──────────────────────────────────────────

function ResultRow({
  label,
  value,
  sub,
  highlight,
  large,
  dividerTop,
}: {
  label: string
  value: string
  sub?: string
  highlight?: boolean
  large?: boolean
  dividerTop?: boolean
}) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        padding: large ? '14px 0' : '10px 0',
        borderTop: dividerTop ? '1.5px solid #E5E7EB' : '1px solid #F3F4F6',
        gap: 12,
      }}
    >
      <span style={{ fontSize: large ? 15 : 13, fontWeight: large ? 700 : 500, color: highlight ? PRIMARY : '#374151' }}>
        {label}
      </span>
      <div style={{ textAlign: 'right' }}>
        <div style={{ fontSize: large ? 18 : 14, fontWeight: large ? 700 : 600, color: highlight ? PRIMARY : '#1A1D1F' }}>
          {value}
        </div>
        {sub && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 2 }}>{sub}</div>}
      </div>
    </div>
  )
}

// ── 탭 버튼 ──────────────────────────────────────────────────

function TabBar({ active, onChange }: { active: Tab; onChange: (t: Tab) => void }) {
  const tabs: { key: Tab; label: string }[] = [
    { key: 'before', label: '매매 전' },
    { key: 'after', label: '매매 후' },
  ]
  return (
    <div
      style={{
        display: 'inline-flex',
        background: '#F0F2F5',
        borderRadius: 14,
        padding: 4,
        gap: 2,
        marginBottom: 20,
      }}
    >
      {tabs.map(({ key, label }) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          style={{
            padding: '8px 24px',
            borderRadius: 10,
            border: 'none',
            fontSize: 14,
            fontWeight: active === key ? 700 : 500,
            color: active === key ? PRIMARY : '#6B7280',
            background: active === key ? '#FFFFFF' : 'transparent',
            boxShadow: active === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.15s',
          }}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

// ── 선택 버튼 그룹 ────────────────────────────────────────────

function OptionGroup<T extends string | number>({
  options,
  value,
  onChange,
  format,
}: {
  options: T[]
  value: T
  onChange: (v: T) => void
  format?: (v: T) => string
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = opt === value
        return (
          <button
            key={String(opt)}
            type="button"
            onClick={() => onChange(opt)}
            style={{
              padding: '7px 14px',
              borderRadius: 8,
              border: `1.5px solid ${active ? PRIMARY : '#E5E7EB'}`,
              background: active ? PRIMARY_LIGHT : '#FFFFFF',
              color: active ? PRIMARY : '#6B7280',
              fontSize: 13,
              fontWeight: active ? 700 : 500,
              cursor: 'pointer',
              fontFamily: 'inherit',
              transition: 'all 0.12s',
            }}
          >
            {format ? format(opt) : String(opt)}
          </button>
        )
      })}
    </div>
  )
}

// ── 금액 입력 (만원 단위) ─────────────────────────────────────

function ManInput({
  value,
  onChange,
  placeholder,
}: {
  value: string
  onChange: (v: string) => void
  placeholder?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text"
        inputMode="numeric"
        value={value}
        onChange={(e) => {
          const raw = e.target.value.replace(/[^0-9]/g, '')
          onChange(raw)
        }}
        placeholder={placeholder ?? '0'}
        style={inputStyle}
      />
      <span
        style={{
          position: 'absolute',
          right: 14,
          top: '50%',
          transform: 'translateY(-50%)',
          fontSize: 12,
          color: '#9CA3AF',
          pointerEvents: 'none',
        }}
      >
        만원
      </span>
    </div>
  )
}

// ── 대출 계산기 로직 ──────────────────────────────────────────

type RepayType = 'equal-installment' | 'equal-principal' | 'bullet'

interface LoanResult {
  firstMonthPayment: number   // 첫 달 납입액
  lastMonthPayment: number    // 마지막 달 납입액
  totalPayment: number        // 총 납부액
  totalInterest: number       // 총 이자
  monthlyInterestOnly: number // 만기일시 월 이자
}

function calcLoan(principal: number, annualRate: number, termYears: number, type: RepayType): LoanResult | null {
  if (principal <= 0 || annualRate <= 0 || termYears <= 0) return null
  const r = annualRate / 100 / 12
  const n = termYears * 12

  if (type === 'bullet') {
    const monthlyInterest = principal * r
    return {
      firstMonthPayment: monthlyInterest,
      lastMonthPayment: principal + monthlyInterest,
      totalPayment: principal + monthlyInterest * n,
      totalInterest: monthlyInterest * n,
      monthlyInterestOnly: monthlyInterest,
    }
  }

  if (type === 'equal-installment') {
    // 원리금균등: PMT = P * r(1+r)^n / ((1+r)^n - 1)
    const factor = Math.pow(1 + r, n)
    const pmt = principal * r * factor / (factor - 1)
    return {
      firstMonthPayment: pmt,
      lastMonthPayment: pmt,
      totalPayment: pmt * n,
      totalInterest: pmt * n - principal,
      monthlyInterestOnly: 0,
    }
  }

  // 원금균등: 매월 원금 = P/n, 이자 체감
  const principalPerMonth = principal / n
  const firstInterest = principal * r
  const lastInterest  = principalPerMonth * r
  const totalInterest = (firstInterest + lastInterest) * n / 2
  return {
    firstMonthPayment: principalPerMonth + firstInterest,
    lastMonthPayment:  principalPerMonth + lastInterest,
    totalPayment: principal + totalInterest,
    totalInterest,
    monthlyInterestOnly: 0,
  }
}

// ── 대출 계산기 컴포넌트 ───────────────────────────────────────

function LoanCalcSection({ narrow }: { narrow: boolean }) {
  const [loanMan, setLoanMan]     = useState('')
  const [rateStr, setRateStr]     = useState('')
  const [termStr, setTermStr]     = useState('')
  const [repayType, setRepayType] = useState<RepayType>('equal-installment')

  const principal = (parseInt(loanMan || '0', 10) || 0) * 10_000
  const annualRate = parseFloat(rateStr || '0') || 0
  const termYears  = parseInt(termStr || '0', 10) || 0

  const result = calcLoan(principal, annualRate, termYears, repayType)

  const repayOptions: { key: RepayType; label: string; desc: string }[] = [
    { key: 'equal-installment', label: '원리금균등', desc: '매월 동일 금액 납부' },
    { key: 'equal-principal',   label: '원금균등',   desc: '원금 일정, 초기 부담 큼' },
    { key: 'bullet',            label: '만기일시',   desc: '이자만 납부 후 만기 일시상환' },
  ]

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 12 }}>
        🏦 대출 계산기
      </div>
      <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', gap: 20, alignItems: 'flex-start' }}>

        {/* 입력 패널 */}
        <div style={{ ...jellyCardStyle, padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            {/* 대출 금액 */}
            <div>
              <div style={labelStyle}>대출 금액</div>
              <ManInput value={loanMan} onChange={setLoanMan} placeholder="예) 30000 (3억)" />
              {principal > 0 && (
                <div style={{ fontSize: 11, color: PRIMARY, marginTop: 5 }}>= {fmtUnit(principal)}</div>
              )}
            </div>

            {/* 연 이자율 */}
            <div>
              <div style={labelStyle}>연 이자율 (%)</div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text"
                  inputMode="decimal"
                  value={rateStr}
                  onChange={(e) => {
                    const v = e.target.value.replace(/[^0-9.]/g, '')
                    setRateStr(v)
                  }}
                  placeholder="예) 3.5"
                  style={inputStyle}
                />
                <span
                  style={{
                    position: 'absolute', right: 14, top: '50%',
                    transform: 'translateY(-50%)',
                    fontSize: 12, color: '#9CA3AF', pointerEvents: 'none',
                  }}
                >
                  %
                </span>
              </div>
            </div>

            {/* 대출 기간 */}
            <div>
              <div style={labelStyle}>대출 기간</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[10, 15, 20, 30].map((yr) => {
                  const active = parseInt(termStr || '0', 10) === yr
                  return (
                    <button
                      key={yr}
                      type="button"
                      onClick={() => setTermStr(String(yr))}
                      style={{
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: `1.5px solid ${active ? PRIMARY : '#E5E7EB'}`,
                        background: active ? PRIMARY_LIGHT : '#FFFFFF',
                        color: active ? PRIMARY : '#6B7280',
                        fontSize: 13,
                        fontWeight: active ? 700 : 500,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {yr}년
                    </button>
                  )
                })}
                <div style={{ position: 'relative', flex: '0 0 80px' }}>
                  <input
                    type="text"
                    inputMode="numeric"
                    value={termStr}
                    onChange={(e) => setTermStr(e.target.value.replace(/[^0-9]/g, ''))}
                    placeholder="직접"
                    style={{ ...inputStyle, height: 38, paddingRight: 28 }}
                  />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9CA3AF', pointerEvents: 'none' }}>년</span>
                </div>
              </div>
            </div>

            {/* 상환 방식 */}
            <div>
              <div style={labelStyle}>상환 방식</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {repayOptions.map(({ key, label, desc }) => {
                  const active = repayType === key
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setRepayType(key)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '10px 14px',
                        borderRadius: 10,
                        border: `1.5px solid ${active ? PRIMARY : '#E5E7EB'}`,
                        background: active ? PRIMARY_LIGHT : '#FFFFFF',
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                        textAlign: 'left',
                      }}
                    >
                      <span style={{
                        width: 16, height: 16, borderRadius: '50%',
                        border: `2px solid ${active ? PRIMARY : '#D1D5DB'}`,
                        background: active ? PRIMARY : '#FFFFFF',
                        flexShrink: 0,
                        display: 'inline-block',
                      }} />
                      <span>
                        <span style={{ fontSize: 13, fontWeight: active ? 700 : 500, color: active ? PRIMARY : '#374151' }}>{label}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div style={{ ...jellyCardStyle, padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1D1F', marginBottom: 4 }}>📊 상환 분석</div>
          {!result ? (
            <div style={{ marginTop: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '32px 0' }}>
              대출 금액·이자율·기간을 입력하면<br />결과가 표시됩니다.
            </div>
          ) : (
            <>
              {/* 월 납입금 */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>월 납입금</div>
              {repayType === 'bullet' ? (
                <>
                  <ResultRow label="월 이자" value={fmtWon(result.monthlyInterestOnly)} />
                  <ResultRow label="만기 상환" value={fmtWon(principal + result.monthlyInterestOnly)} sub="원금 + 마지막 이자" />
                </>
              ) : repayType === 'equal-installment' ? (
                <ResultRow
                  label="월 납입금 (고정)"
                  value={fmtWon(result.firstMonthPayment)}
                  highlight
                  large
                />
              ) : (
                <>
                  <ResultRow label="첫 달 납입금" value={fmtWon(result.firstMonthPayment)} highlight />
                  <ResultRow label="마지막 달 납입금" value={fmtWon(result.lastMonthPayment)} />
                </>
              )}

              {/* 총계 */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>총계</div>
              <ResultRow label="총 납부액" value={fmtWon(result.totalPayment)} sub={fmtUnit(result.totalPayment)} dividerTop />
              <ResultRow label="원금" value={fmtWon(principal)} />
              <ResultRow
                label="총 이자"
                value={fmtWon(result.totalInterest)}
                sub={`이자율 ${((result.totalInterest / principal) * 100).toFixed(1)}%`}
              />

              {/* 요약 배너 */}
              <div style={{
                marginTop: 16,
                padding: '12px 14px',
                background: PRIMARY_LIGHT,
                borderRadius: 10,
                fontSize: 12,
                color: '#374151',
                lineHeight: 1.8,
              }}>
                <span style={{ fontWeight: 700, color: PRIMARY }}>
                  {repayType === 'bullet' ? '만기일시상환' : repayType === 'equal-installment' ? '원리금균등' : '원금균등'}
                </span>
                {'  '}
                {termYears}년 ({termYears * 12}회) · 연 {annualRate}%
                <br />
                월 부담 {fmtUnit(result.firstMonthPayment)} ~ {fmtUnit(result.lastMonthPayment === result.firstMonthPayment ? result.firstMonthPayment : result.lastMonthPayment)}
              </div>

              <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
                * 원금균등 첫 달 ~ 마지막 달 납입금 범위를 표시합니다.<br />
                * 중도상환수수료 등 부대비용은 포함되지 않습니다.<br />
                * 금리는 변동될 수 있으며 실제 조건과 다를 수 있습니다.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 매매 전 계산기 ─────────────────────────────────────────────

function BeforeTab({ narrow }: { narrow: boolean }) {
  const [priceMan, setPriceMan] = useState('')          // 매매가 (만원)
  const [depositPct, setDepositPct] = useState(10)      // 계약금 %
  const [loanMan, setLoanMan] = useState('')             // 대출 (만원)
  const [homeCount, setHomeCount] = useState(1)         // 주택 수

  const price = (parseInt(priceMan || '0', 10) || 0) * 10_000
  const loan  = (parseInt(loanMan  || '0', 10) || 0) * 10_000

  const deposit    = price * depositPct / 100           // 계약금
  const balance    = price - deposit                    // 잔금(중도금+잔금)
  const acqTax     = calcAcquisitionTax(price, homeCount)
  const agentFee   = calcAgentFee(price)
  const otherCosts = acqTax + agentFee                  // 기타 비용 합
  const totalNeed  = price + otherCosts                 // 총 취득 비용
  const ownCapital = Math.max(0, totalNeed - loan)      // 필요 자기자본

  const hasPrice = price > 0

  return (
    <div>
      <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', gap: 20, alignItems: 'flex-start' }}>
        {/* 입력 패널 */}
        <div style={{ ...jellyCardStyle, padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 20 }}>
            📝 매매 조건 입력
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            {/* 매매가 */}
            <div>
              <div style={labelStyle}>매매가</div>
              <ManInput value={priceMan} onChange={setPriceMan} placeholder="예) 50000 (5억)" />
              {hasPrice && (
                <div style={{ fontSize: 11, color: PRIMARY, marginTop: 5 }}>
                  = {fmtUnit(price)}
                </div>
              )}
            </div>

            {/* 계약금 비율 */}
            <div>
              <div style={labelStyle}>계약금 비율</div>
              <OptionGroup
                options={[5, 10, 20]}
                value={depositPct}
                onChange={setDepositPct}
                format={(v) => `${v}%`}
              />
            </div>

            {/* 대출 금액 */}
            <div>
              <div style={labelStyle}>예상 대출 금액</div>
              <ManInput value={loanMan} onChange={setLoanMan} placeholder="예) 30000 (3억)" />
              {loan > 0 && (
                <div style={{ fontSize: 11, color: '#6B7280', marginTop: 5 }}>
                  = {fmtUnit(loan)}
                </div>
              )}
            </div>

            {/* 주택 수 */}
            <div>
              <div style={labelStyle}>취득 후 보유 주택 수</div>
              <OptionGroup
                options={[1, 2, 3]}
                value={homeCount}
                onChange={setHomeCount}
                format={(v) => `${v}주택`}
              />
              {homeCount === 2 && (
                <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 6 }}>
                  조정대상지역 기준 8% 적용
                </div>
              )}
              {homeCount >= 3 && (
                <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>
                  3주택 이상 12% 적용
                </div>
              )}
            </div>
          </div>
        </div>

        {/* 결과 패널 */}
        <div style={{ ...jellyCardStyle, padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 4 }}>
            🧮 예상 비용 분석
          </div>
          {!hasPrice ? (
            <div
              style={{
                marginTop: 24,
                textAlign: 'center',
                color: '#9CA3AF',
                fontSize: 14,
                padding: '32px 0',
              }}
            >
              매매가를 입력하면 결과가 표시됩니다.
            </div>
          ) : (
            <>
              {/* 매매 대금 분할 */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>
                매매 대금
              </div>
              <ResultRow label="계약금" value={fmtWon(deposit)} sub={`매매가의 ${depositPct}%`} />
              <ResultRow label="중도금 + 잔금" value={fmtWon(balance)} sub={`매매가의 ${100 - depositPct}%`} />

              {/* 기타 비용 */}
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>
                추가 비용
              </div>
              <ResultRow
                label="취득세"
                value={fmtWon(acqTax)}
                sub={`${((acqTax / price) * 100).toFixed(2)}%`}
              />
              <ResultRow
                label="중개수수료 (상한)"
                value={fmtWon(agentFee)}
                sub={`${((agentFee / price) * 100).toFixed(2)}%`}
              />

              {/* 합계 */}
              <div style={{ marginTop: 8 }}>
                <ResultRow
                  label="총 취득 비용"
                  value={fmtWon(totalNeed)}
                  sub={fmtUnit(totalNeed)}
                  dividerTop
                />
                {loan > 0 && (
                  <ResultRow label="대출" value={`– ${fmtWon(loan)}`} />
                )}
                <ResultRow
                  label="필요 자기자본"
                  value={fmtWon(ownCapital)}
                  sub={fmtUnit(ownCapital)}
                  highlight
                  large
                  dividerTop
                />
              </div>

              {/* LTV 참고 */}
              {loan > 0 && price > 0 && (
                <div
                  style={{
                    marginTop: 16,
                    padding: '12px 14px',
                    background: PRIMARY_LIGHT,
                    borderRadius: 10,
                    fontSize: 12,
                    color: '#374151',
                    lineHeight: 1.6,
                  }}
                >
                  <span style={{ fontWeight: 600, color: PRIMARY }}>참고</span>
                  {'  '}LTV {((loan / price) * 100).toFixed(1)}%
                  {'  ·  '}
                  계약금 {fmtUnit(deposit)} + 기타비용 {fmtUnit(otherCosts)} ={' '}
                  <span style={{ fontWeight: 700 }}>초기 {fmtUnit(deposit + otherCosts)}</span> 필요
                </div>
              )}

              <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
                * 취득세는 주택 수·지역에 따라 달라질 수 있습니다.<br />
                * 중개수수료는 법정 상한액 기준이며 협의 가능합니다.<br />
                * 등기비용(법무사 수수료 등)은 포함되지 않았습니다.
              </div>
            </>
          )}
        </div>
      </div>

      {/* 대출 계산기 섹션 */}
      <LoanCalcSection narrow={narrow} />
    </div>
  )
}

// ── 매매 후 (플레이스홀더) ────────────────────────────────────

function AfterTab() {
  return (
    <div
      style={{
        ...jellyCardStyle,
        padding: '48px 32px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 12,
        textAlign: 'center',
        minHeight: 240,
      }}
    >
      <span style={{ fontSize: 48 }}>🔑</span>
      <p style={{ fontSize: 16, fontWeight: 600, color: '#1A1D1F', margin: 0 }}>
        매매 후 관리
      </p>
      <p style={{ fontSize: 14, color: JELLY.textMuted, margin: 0 }}>
        대출 상환 현황 · 실거주 비용 분석 기능을 준비 중입니다.
      </p>
    </div>
  )
}

// ── 메인 페이지 ────────────────────────────────────────────────

export function RealEstatePage() {
  const narrow = useNarrowLayout()
  const [tab, setTab] = useState<Tab>('before')

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 20 }}>부동산</h1>
      <TabBar active={tab} onChange={setTab} />
      {tab === 'before' ? <BeforeTab narrow={narrow} /> : <AfterTab />}
    </div>
  )
}
