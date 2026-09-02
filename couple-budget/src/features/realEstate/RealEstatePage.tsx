import { useState } from 'react'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { pageTitleH1Style, PRIMARY, PRIMARY_LIGHT, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE } from '@/styles/formControls'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { useRealEstatePlanStore } from '@/store/useRealEstatePlanStore'
import type { RepayType, PlanLineItem, RealEstatePlan } from '@/store/useRealEstatePlanStore'

type Tab = 'before' | 'after'

// ── 세금·수수료 계산 ──────────────────────────────────────────

function calcAcquisitionTax(price: number, homeCount: number): number {
  if (homeCount >= 3) return price * 0.12
  if (homeCount === 2) return price * 0.08
  if (price <= 600_000_000) return price * 0.01
  if (price <= 900_000_000) {
    const rate = (price / 1_000_000 * 2 / 3 - 3) / 100
    return price * Math.max(0.01, Math.min(0.03, rate))
  }
  return price * 0.03
}

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
  label, value, sub, highlight, large, dividerTop,
}: {
  label: string; value: string; sub?: string
  highlight?: boolean; large?: boolean; dividerTop?: boolean
}) {
  return (
    <div style={{
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      padding: large ? '14px 0' : '10px 0',
      borderTop: dividerTop ? '1.5px solid #E5E7EB' : '1px solid #F3F4F6',
      gap: 12,
    }}>
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
    <div style={{
      display: 'inline-flex', background: '#F0F2F5',
      borderRadius: 14, padding: 4, gap: 2, marginBottom: 20,
    }}>
      {tabs.map(({ key, label }) => (
        <button key={key} type="button" onClick={() => onChange(key)} style={{
          padding: '8px 24px', borderRadius: 10, border: 'none',
          fontSize: 14, fontWeight: active === key ? 700 : 500,
          color: active === key ? PRIMARY : '#6B7280',
          background: active === key ? '#FFFFFF' : 'transparent',
          boxShadow: active === key ? '0 2px 8px rgba(0,0,0,0.08)' : 'none',
          cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.15s',
        }}>
          {label}
        </button>
      ))}
    </div>
  )
}

// ── 선택 버튼 그룹 ────────────────────────────────────────────

function OptionGroup<T extends string | number>({
  options, value, onChange, format,
}: {
  options: T[]; value: T; onChange: (v: T) => void; format?: (v: T) => string
}) {
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
      {options.map((opt) => {
        const active = opt === value
        return (
          <button key={String(opt)} type="button" onClick={() => onChange(opt)} style={{
            padding: '7px 14px', borderRadius: 8,
            border: `1.5px solid ${active ? PRIMARY : '#E5E7EB'}`,
            background: active ? PRIMARY_LIGHT : '#FFFFFF',
            color: active ? PRIMARY : '#6B7280',
            fontSize: 13, fontWeight: active ? 700 : 500,
            cursor: 'pointer', fontFamily: 'inherit', transition: 'all 0.12s',
          }}>
            {format ? format(opt) : String(opt)}
          </button>
        )
      })}
    </div>
  )
}

function eokToWon(s: string): number { return (parseFloat(s || '0') || 0) * 100_000_000 }

// ── 금액 입력 (만원 단위) ─────────────────────────────────────

function ManInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  // uncontrolled — onBlur로 store 반영, 입력 도중 리렌더 없음 → 모바일 키보드 유지
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text" inputMode="numeric" defaultValue={value} key={value}
        onBlur={(e) => onChange(e.target.value.replace(/[^0-9]/g, ''))}
        onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
        placeholder={placeholder ?? '0'} style={inputStyle}
      />
      <span style={{
        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: 12, color: '#9CA3AF', pointerEvents: 'none',
      }}>만원</span>
    </div>
  )
}

// ── 금액 입력 (억 단위, 소수 지원) ───────────────────────────

function EokInput({ value, onChange, placeholder }: {
  value: string; onChange: (v: string) => void; placeholder?: string
}) {
  return (
    <div style={{ position: 'relative' }}>
      <input
        type="text" inputMode="decimal" defaultValue={value} key={value}
        onBlur={(e) => {
          let v = e.target.value.replace(/[^0-9.]/g, '')
          const dots = v.split('.'); if (dots.length > 2) v = dots[0] + '.' + dots.slice(1).join('')
          onChange(v)
        }}
        onChange={(e) => {
          let v = e.target.value.replace(/[^0-9.]/g, '')
          const dots = v.split('.'); if (dots.length > 2) v = dots[0] + '.' + dots.slice(1).join('')
          e.target.value = v
        }}
        placeholder={placeholder ?? '0'} style={inputStyle}
      />
      <span style={{
        position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)',
        fontSize: 12, color: '#9CA3AF', pointerEvents: 'none',
      }}>억</span>
    </div>
  )
}

// ── 영수증 구분선 ─────────────────────────────────────────────

const RECEIPT_BG = '#F5F7FA'

function ReceiptDividerV() {
  const notchBase = {
    position: 'absolute' as const,
    left: '50%' as const,
    transform: 'translateX(-50%)' as const,
    width: 20, height: 20, borderRadius: '50%' as const,
    background: RECEIPT_BG,
  }
  return (
    <div style={{ position: 'relative', flexShrink: 0, width: 0, alignSelf: 'stretch', borderLeft: '1.5px dashed #D1D5DB' }}>
      <div style={{ ...notchBase, top: -10 }} />
      <div style={{ ...notchBase, bottom: -10 }} />
    </div>
  )
}

function ReceiptDividerH() {
  const notchBase = {
    position: 'absolute' as const,
    top: '50%' as const,
    transform: 'translateY(-50%)' as const,
    width: 20, height: 20, borderRadius: '50%' as const,
    background: RECEIPT_BG,
  }
  return (
    <div style={{ position: 'relative', flexShrink: 0, height: 0, borderTop: '1.5px dashed #D1D5DB' }}>
      <div style={{ ...notchBase, left: -10 }} />
      <div style={{ ...notchBase, right: -10 }} />
    </div>
  )
}

// ── 대출 계산 로직 ────────────────────────────────────────────

interface LoanResult {
  firstMonthPayment: number
  lastMonthPayment: number
  totalPayment: number
  totalInterest: number
  monthlyInterestOnly: number
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
    const factor = Math.pow(1 + r, n)
    const pmt = principal * r * factor / (factor - 1)
    return { firstMonthPayment: pmt, lastMonthPayment: pmt, totalPayment: pmt * n, totalInterest: pmt * n - principal, monthlyInterestOnly: 0 }
  }
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

// ── 대출 계산기 (controlled) ──────────────────────────────────

function LoanCalcSection({
  narrow,
  loanMan, onLoanMan,
  rateStr, onRateStr,
  termStr, onTermStr,
  repayType, onRepayType,
  onSendToSheet,
}: {
  narrow: boolean
  loanMan: string; onLoanMan: (v: string) => void
  rateStr: string; onRateStr: (v: string) => void
  termStr: string; onTermStr: (v: string) => void
  repayType: RepayType; onRepayType: (v: RepayType) => void
  onSendToSheet: (loanMan: string) => void
}) {
  const [sentFlash, setSentFlash] = useState(false)

  const principal = eokToWon(loanMan)
  const annualRate = parseFloat(rateStr || '0') || 0
  const termYears  = parseInt(termStr || '0', 10) || 0
  const result = calcLoan(principal, annualRate, termYears, repayType)

  const repayOptions: { key: RepayType; label: string; desc: string }[] = [
    { key: 'equal-installment', label: '원리금균등', desc: '매월 동일 금액 납부' },
    { key: 'equal-principal',   label: '원금균등',   desc: '원금 일정, 초기 부담 큼' },
    { key: 'bullet',            label: '만기일시',   desc: '이자만 납부 후 만기 일시상환' },
  ]

  const handleSend = () => {
    onSendToSheet(loanMan)
    setSentFlash(true)
    setTimeout(() => setSentFlash(false), 1600)
  }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 12 }}>
        🏦 대출 계산기
      </div>
      <div style={{
        display: 'flex', flexDirection: narrow ? 'column' : 'row',
        background: (jellyCardStyle.background ?? '#FFFFFF') as string,
        borderRadius: JELLY.radiusLg, boxShadow: JELLY.shadowFloat,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 입력 패널 */}
        <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

            <div>
              <div style={labelStyle}>대출 금액</div>
              <EokInput value={loanMan} onChange={onLoanMan} placeholder="예) 3 (3억)" />
              {principal > 0 && <div style={{ fontSize: 11, color: PRIMARY, marginTop: 5 }}>= {fmtUnit(principal)}</div>}
            </div>

            <div>
              <div style={labelStyle}>연 이자율 (%)</div>
              <div style={{ position: 'relative' }}>
                <input
                  type="text" inputMode="decimal" defaultValue={rateStr} key={rateStr}
                  onBlur={(e) => onRateStr(e.target.value.replace(/[^0-9.]/g, ''))}
                  onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9.]/g, '') }}
                  placeholder="예) 3.5" style={inputStyle}
                />
                <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF', pointerEvents: 'none' }}>%</span>
              </div>
            </div>

            <div>
              <div style={labelStyle}>대출 기간</div>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {[10, 15, 20, 30].map((yr) => {
                  const active = parseInt(termStr || '0', 10) === yr
                  return (
                    <button key={yr} type="button" onClick={() => onTermStr(String(yr))} style={{
                      padding: '7px 14px', borderRadius: 8,
                      border: `1.5px solid ${active ? PRIMARY : '#E5E7EB'}`,
                      background: active ? PRIMARY_LIGHT : '#FFFFFF',
                      color: active ? PRIMARY : '#6B7280',
                      fontSize: 13, fontWeight: active ? 700 : 500,
                      cursor: 'pointer', fontFamily: 'inherit',
                    }}>{yr}년</button>
                  )
                })}
                <div style={{ position: 'relative', flex: '0 0 80px' }}>
                  <input
                    type="text" inputMode="numeric" defaultValue={termStr} key={termStr}
                    onBlur={(e) => onTermStr(e.target.value.replace(/[^0-9]/g, ''))}
                    onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
                    placeholder="직접" style={{ ...inputStyle, height: 38, paddingRight: 28 }}
                  />
                  <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9CA3AF', pointerEvents: 'none' }}>년</span>
                </div>
              </div>
            </div>

            <div>
              <div style={labelStyle}>상환 방식</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {repayOptions.map(({ key, label, desc }) => {
                  const active = repayType === key
                  return (
                    <button key={key} type="button" onClick={() => onRepayType(key)} style={{
                      position: 'relative', display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 14px', borderRadius: JELLY.radiusControl,
                      border: active ? `1.5px solid ${PRIMARY}` : JELLY.innerBorderSoft,
                      background: active
                        ? 'linear-gradient(180deg, rgba(224,242,254,0.5) 0%, rgba(186,230,253,0.28) 100%)'
                        : 'rgba(255,255,255,0.22)',
                      boxShadow: active
                        ? 'inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 12px rgba(14,165,233,0.08)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.35)',
                      cursor: 'pointer', fontFamily: 'inherit', textAlign: 'left',
                      width: '100%', boxSizing: 'border-box',
                      transition: 'border 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                    }}>
                      <span style={{
                        width: 18, height: 18, borderRadius: '50%',
                        border: `2px solid ${active ? PRIMARY : 'rgba(148,163,184,0.55)'}`,
                        background: active ? PRIMARY : 'rgba(255,255,255,0.45)',
                        flexShrink: 0, display: 'flex', alignItems: 'center', justifyContent: 'center',
                        boxShadow: active ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
                      }}>
                        {active && <span style={{ width: 7, height: 7, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(15,23,42,0.2)' }} />}
                      </span>
                      <span>
                        <span style={{ fontSize: 13, fontWeight: active ? 600 : 500, color: '#1A1D1F' }}>{label}</span>
                        <span style={{ fontSize: 11, color: '#9CA3AF', marginLeft: 6 }}>{desc}</span>
                      </span>
                    </button>
                  )
                })}
              </div>
            </div>
          </div>
        </div>

        {narrow ? <ReceiptDividerH /> : <ReceiptDividerV />}

        {/* 결과 패널 */}
        <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1D1F', marginBottom: 4 }}>📊 상환 분석</div>
          {!result ? (
            <div style={{ marginTop: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '32px 0' }}>
              대출 금액·이자율·기간을 입력하면<br />결과가 표시됩니다.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>월 납입금</div>
              {repayType === 'bullet' ? (
                <>
                  <ResultRow label="월 이자" value={fmtWon(result.monthlyInterestOnly)} />
                  <ResultRow label="만기 상환" value={fmtWon(principal + result.monthlyInterestOnly)} sub="원금 + 마지막 이자" />
                </>
              ) : repayType === 'equal-installment' ? (
                <ResultRow label="월 납입금 (고정)" value={fmtWon(result.firstMonthPayment)} highlight large />
              ) : (
                <>
                  <ResultRow label="첫 달 납입금" value={fmtWon(result.firstMonthPayment)} highlight />
                  <ResultRow label="마지막 달 납입금" value={fmtWon(result.lastMonthPayment)} />
                </>
              )}

              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>총계</div>
              <ResultRow label="총 납부액" value={fmtWon(result.totalPayment)} sub={fmtUnit(result.totalPayment)} dividerTop />
              <ResultRow label="원금" value={fmtWon(principal)} />
              <ResultRow label="총 이자" value={fmtWon(result.totalInterest)} sub={`이자율 ${((result.totalInterest / principal) * 100).toFixed(1)}%`} />

              <div style={{ marginTop: 16, padding: '12px 14px', background: PRIMARY_LIGHT, borderRadius: 10, fontSize: 12, color: '#374151', lineHeight: 1.8 }}>
                <span style={{ fontWeight: 700, color: PRIMARY }}>
                  {repayType === 'bullet' ? '만기일시상환' : repayType === 'equal-installment' ? '원리금균등' : '원금균등'}
                </span>
                {'  '}{termYears}년 ({termYears * 12}회) · 연 {annualRate}%
                <br />월 부담 {fmtUnit(result.firstMonthPayment)} ~ {fmtUnit(result.lastMonthPayment)}
              </div>

              {/* 계획 시트 반영 버튼 */}
              <button
                type="button"
                onClick={handleSend}
                style={{
                  marginTop: 12, width: '100%', padding: '11px 0',
                  borderRadius: JELLY.radiusControl,
                  border: sentFlash ? `1.5px solid #16a34a` : `1.5px solid ${PRIMARY}`,
                  background: sentFlash ? '#dcfce7' : PRIMARY,
                  color: sentFlash ? '#15803d' : '#fff',
                  fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit',
                  transition: 'all 0.25s',
                }}
              >
                {sentFlash ? '✓ 계획 시트에 반영됨' : '이 대출 조건을 계획 시트에 반영 →'}
              </button>

              <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
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

// ── 계획 시트 공통 행 ─────────────────────────────────────────

function PlanFixedRow({ label, value, dim }: { label: string; value: string; dim?: boolean }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderTop: '1px solid #F3F4F6' }}>
      <span style={{ fontSize: 13, color: '#374151' }}>{label}</span>
      <span style={{ fontSize: 13, fontWeight: 600, color: dim ? '#9CA3AF' : '#1A1D1F' }}>{value}</span>
    </div>
  )
}

function PlanEditRow({
  item, onChangeName, onChangeAmount, onRemove, isEok = false,
}: {
  item: PlanLineItem; onChangeName: (v: string) => void
  onChangeAmount: (v: string) => void; onRemove: () => void; isEok?: boolean
}) {
  const amt = isEok ? eokToWon(item.amountMan) : (parseInt(item.amountMan || '0', 10) || 0) * 10_000
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 0', borderTop: '1px solid #F3F4F6' }}>
      <input
        type="text" defaultValue={item.name} key={item.id + '-name'}
        onBlur={(e) => onChangeName(e.target.value)}
        style={{ ...inputStyle, flex: '0 0 130px', height: 38, fontSize: 13 }}
      />
      <div style={{ position: 'relative', flex: 1, minWidth: 0 }}>
        {isEok ? (
          <input
            type="text" inputMode="decimal" defaultValue={item.amountMan} key={item.id + '-amt'}
            onBlur={(e) => {
              let v = e.target.value.replace(/[^0-9.]/g, '')
              const dots = v.split('.'); if (dots.length > 2) v = dots[0] + '.' + dots.slice(1).join('')
              onChangeAmount(v)
            }}
            onChange={(e) => {
              let v = e.target.value.replace(/[^0-9.]/g, '')
              const dots = v.split('.'); if (dots.length > 2) v = dots[0] + '.' + dots.slice(1).join('')
              e.target.value = v
            }}
            placeholder="0" style={{ ...inputStyle, height: 38, paddingRight: 44, width: '100%' }}
          />
        ) : (
          <input
            type="text" inputMode="numeric" defaultValue={item.amountMan} key={item.id + '-amt'}
            onBlur={(e) => onChangeAmount(e.target.value.replace(/[^0-9]/g, ''))}
            onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
            placeholder="0" style={{ ...inputStyle, height: 38, paddingRight: 44, width: '100%' }}
          />
        )}
        <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#9CA3AF', pointerEvents: 'none' }}>{isEok ? '억' : '만원'}</span>
      </div>
      <button type="button" onClick={onRemove} style={{
        flexShrink: 0, width: 32, height: 32, borderRadius: 8,
        border: '1px solid rgba(252,165,165,0.45)', background: 'rgba(254,242,242,0.9)',
        color: '#b91c1c', fontSize: 16, cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'inherit',
      }}>×</button>
    </div>
  )
}

// ── 항목 추가 행 ──────────────────────────────────────────────

function AddItemRow({ onAdd }: { onAdd: (name: string) => void }) {
  const [newName, setNewName] = useState('')
  const add = () => {
    const name = newName.trim() || '기타'
    onAdd(name)
    setNewName('')
  }
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
      <input
        type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
        onKeyDown={(e) => { if (e.key === 'Enter') add() }}
        placeholder="항목명 입력 후 추가" style={{ ...inputStyle, flex: 1, height: 40 }}
      />
      <button type="button" onClick={add} style={{
        height: 40, padding: '0 18px', borderRadius: INPUT_BORDER_RADIUS,
        border: `1.5px solid ${PRIMARY}`, background: PRIMARY_LIGHT,
        color: PRIMARY, fontSize: 13, fontWeight: 600,
        cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0,
      }}>+ 추가</button>
    </div>
  )
}

// ── 매매 계획 시트 (controlled) ───────────────────────────────

function PlanSheet({
  price, acqTax, agentFee, loan,
  planItems, onAddPlanItem, onUpdatePlanItem, onRemovePlanItem,
  capitalItems, onAddCapitalItem, onUpdateCapitalItem, onRemoveCapitalItem,
}: {
  price: number; acqTax: number; agentFee: number; loan: number
  planItems: PlanLineItem[]
  onAddPlanItem: (item: Omit<PlanLineItem, 'id'>) => void
  onUpdatePlanItem: (id: string, patch: Partial<Omit<PlanLineItem, 'id'>>) => void
  onRemovePlanItem: (id: string) => void
  capitalItems: PlanLineItem[]
  onAddCapitalItem: (item: Omit<PlanLineItem, 'id'>) => void
  onUpdateCapitalItem: (id: string, patch: Partial<Omit<PlanLineItem, 'id'>>) => void
  onRemoveCapitalItem: (id: string) => void
}) {
  const hasPrice = price > 0
  const fixedExtra = hasPrice ? acqTax + agentFee : 0
  const extraTotal = planItems.reduce((s, it) => s + (parseInt(it.amountMan || '0', 10) || 0) * 10_000, 0)
  const totalCost  = price + fixedExtra + extraTotal
  const selfFund   = Math.max(0, totalCost - loan)

  const capitalTotal = capitalItems.reduce((s, it) => s + eokToWon(it.amountMan), 0)
  const totalAvail   = capitalTotal + loan
  const gap          = totalAvail - totalCost // 양수=여유, 음수=부족
  const hasCapital   = capitalItems.some((it) => eokToWon(it.amountMan) > 0)

  const sectionLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginBottom: 4 }

  return (
    <div style={{ marginTop: 20 }}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 12 }}>
        📋 매매 계획 시트
      </div>
      <div style={{ ...jellyCardStyle, padding: '24px 20px' }}>

        {/* 부동산 취득 비용 */}
        <div style={sectionLabel}>부동산 취득 비용</div>
        <PlanFixedRow label="매매가" value={hasPrice ? fmtUnit(price) : '—'} dim={!hasPrice} />
        <PlanFixedRow label="취득세" value={hasPrice ? fmtWon(acqTax) : '—'} dim={!hasPrice} />
        <PlanFixedRow label="중개수수료 (상한)" value={hasPrice ? fmtWon(agentFee) : '—'} dim={!hasPrice} />

        {/* 비용 합계 */}
        <div style={{ marginTop: 16 }}>
          <ResultRow label="총 비용 합계" value={fmtWon(totalCost)} sub={fmtUnit(totalCost)} dividerTop />
          {loan > 0 && <ResultRow label="대출 (매매 조건)" value={`– ${fmtWon(loan)}`} />}
          <ResultRow label="필요 자기자본" value={fmtWon(selfFund)} sub={fmtUnit(selfFund)} highlight large dividerTop />
        </div>

        {!hasPrice && (
          <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
            위에서 매매가를 입력하면 취득세·중개수수료가 자동 반영됩니다.
          </div>
        )}

        {/* ── 자본 조달 계획 ─────────────────────────────── */}
        <div style={{ marginTop: 28, paddingTop: 20, borderTop: '2px dashed #E5E7EB' }}>
          <div style={{ fontSize: 14, fontWeight: 700, color: '#1A1D1F', marginBottom: 4 }}>
            💰 자본 조달 계획
          </div>
          <div style={{ fontSize: 12, color: '#9CA3AF', marginBottom: 12 }}>
            자기자본을 어디서 마련할지 계획해보세요.
          </div>

          <div style={sectionLabel}>자금 출처</div>
          {capitalItems.map((item) => (
            <PlanEditRow
              key={item.id} item={item} isEok
              onChangeName={(name) => onUpdateCapitalItem(item.id, { name })}
              onChangeAmount={(amountMan) => onUpdateCapitalItem(item.id, { amountMan })}
              onRemove={() => onRemoveCapitalItem(item.id)}
            />
          ))}
          <AddItemRow onAdd={(name) => onAddCapitalItem({ name, amountMan: '' })} />

          {/* 자본 조달 합계 */}
          <div style={{ marginTop: 16 }}>
            <ResultRow label="자본 조달 합계" value={fmtWon(capitalTotal)} sub={fmtUnit(capitalTotal)} dividerTop />
            {loan > 0 && <ResultRow label="대출" value={`+ ${fmtWon(loan)}`} />}
            <ResultRow label="총 조달 가능 자금" value={fmtWon(totalAvail)} sub={fmtUnit(totalAvail)} dividerTop />
            <ResultRow label="필요 총 비용" value={fmtWon(totalCost)} />
            {(hasCapital || loan > 0) && (
              <div style={{
                marginTop: 8, padding: '14px 16px',
                borderRadius: JELLY.radiusControl,
                background: gap >= 0 ? 'rgba(220,252,231,0.7)' : 'rgba(254,242,242,0.9)',
                border: `1.5px solid ${gap >= 0 ? 'rgba(74,222,128,0.5)' : 'rgba(252,165,165,0.55)'}`,
                display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
              }}>
                <span style={{ fontSize: 13, fontWeight: 600, color: gap >= 0 ? '#15803d' : '#991b1b' }}>
                  {gap >= 0 ? '자금 여유' : '자금 부족'}
                </span>
                <span style={{ fontSize: 16, fontWeight: 700, color: gap >= 0 ? '#16a34a' : '#dc2626' }}>
                  {gap >= 0 ? '+' : ''}{fmtWon(gap)}
                </span>
              </div>
            )}
          </div>

          {!hasPrice && (
            <div style={{ marginTop: 8, fontSize: 11, color: '#9CA3AF', textAlign: 'center' }}>
              매매가를 입력하면 자금 여유/부족 계산이 활성화됩니다.
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

// ── 계획 선택 바 ──────────────────────────────────────────────

function PlanSelectorBar({
  plans, activePlanId, onSelect, onCreate, onDelete, onRename,
}: {
  plans: RealEstatePlan[]
  activePlanId: string | null
  onSelect: (id: string) => void
  onCreate: () => void
  onDelete: (id: string) => void
  onRename: (id: string, name: string) => void
}) {
  const [editingId, setEditingId] = useState<string | null>(null)
  const [nameInput, setNameInput] = useState('')

  const activePlan = plans.find((p) => p.id === activePlanId) ?? null

  const startEdit = (plan: RealEstatePlan) => {
    setEditingId(plan.id)
    setNameInput(plan.name)
  }

  const commitEdit = () => {
    if (editingId && nameInput.trim()) {
      onRename(editingId, nameInput.trim())
    }
    setEditingId(null)
  }

  const handleDelete = () => {
    if (!activePlanId) return
    if (plans.length === 1) {
      if (!window.confirm('마지막 계획을 삭제하면 모든 데이터가 사라집니다. 삭제할까요?')) return
    }
    onDelete(activePlanId)
  }

  const updatedAt = activePlan ? new Date(activePlan.updatedAt) : null
  const savedLabel = updatedAt ? `마지막 저장 ${updatedAt.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}` : ''

  return (
    <div style={{ ...jellyCardStyle, padding: '12px 16px', marginBottom: 16 }}>
      {/* 계획 탭 스크롤 */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div style={{ display: 'flex', gap: 6, overflowX: 'auto', flex: 1, paddingBottom: 2 }}>
          {plans.map((p) => {
            const active = p.id === activePlanId
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => onSelect(p.id)}
                onDoubleClick={() => startEdit(p)}
                title="더블클릭하여 이름 변경"
                style={{
                  padding: '6px 14px', borderRadius: 9999, border: 'none',
                  background: active ? PRIMARY : '#F0F2F5',
                  color: active ? '#fff' : '#6B7280',
                  fontSize: 13, fontWeight: active ? 700 : 500,
                  cursor: 'pointer', fontFamily: 'inherit', whiteSpace: 'nowrap',
                  flexShrink: 0, transition: 'all 0.12s',
                }}
              >
                {p.name}
              </button>
            )
          })}
          <button
            type="button" onClick={onCreate}
            style={{
              padding: '6px 12px', borderRadius: 9999, flexShrink: 0,
              border: `1.5px dashed #D1D5DB`, background: 'transparent',
              color: '#9CA3AF', fontSize: 13, cursor: 'pointer', fontFamily: 'inherit',
              whiteSpace: 'nowrap',
            }}
          >
            + 새 계획
          </button>
        </div>
      </div>

      {/* 활성 계획 정보 */}
      {activePlan && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 10, paddingTop: 10, borderTop: '1px solid #F3F4F6' }}>
          {editingId === activePlan.id ? (
            <input
              type="text" autoFocus value={nameInput}
              onChange={(e) => setNameInput(e.target.value)}
              onBlur={commitEdit}
              onKeyDown={(e) => { if (e.key === 'Enter') commitEdit(); if (e.key === 'Escape') setEditingId(null) }}
              style={{ ...inputStyle, height: 34, flex: 1, fontSize: 13 }}
            />
          ) : (
            <button
              type="button" onClick={() => startEdit(activePlan)}
              style={{
                background: 'none', border: 'none', cursor: 'pointer', fontFamily: 'inherit',
                fontSize: 13, fontWeight: 600, color: '#374151', padding: '2px 6px',
                borderRadius: 6, textAlign: 'left', flex: 1,
              }}
              title="클릭하여 이름 변경"
            >
              ✏️ {activePlan.name}
            </button>
          )}
          {savedLabel && (
            <span style={{ fontSize: 11, color: '#9CA3AF', whiteSpace: 'nowrap' }}>{savedLabel}</span>
          )}
          {plans.length > 0 && (
            <button type="button" onClick={handleDelete} style={{
              flexShrink: 0, padding: '4px 10px', borderRadius: 8,
              border: '1px solid rgba(252,165,165,0.45)', background: 'rgba(254,242,242,0.9)',
              color: '#b91c1c', fontSize: 12, cursor: 'pointer', fontFamily: 'inherit',
            }}>삭제</button>
          )}
        </div>
      )}
    </div>
  )
}

// ── 매매 전 계산기 (store-driven) ─────────────────────────────

function BeforeTab({ narrow }: { narrow: boolean }) {
  const {
    plans, activePlanId,
    createPlan, deletePlan, renamePlan, setActivePlan, patchActivePlan,
    addPlanItem, updatePlanItem, removePlanItem,
    addCapitalItem, updateCapitalItem, removeCapitalItem,
  } = useRealEstatePlanStore()

  const plan = plans.find((p) => p.id === activePlanId) ?? null

  // 첫 방문 시 기본 계획 자동 생성
  if (plans.length === 0) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, padding: '48px 0' }}>
        <div style={{ fontSize: 40 }}>🏠</div>
        <div style={{ fontSize: 16, fontWeight: 700, color: '#1A1D1F' }}>아직 저장된 계획이 없어요</div>
        <div style={{ fontSize: 13, color: '#9CA3AF', textAlign: 'center' }}>새 계획을 만들어 매매 시나리오를 분석하고<br />여러 계획을 비교해 보세요.</div>
        <button type="button" onClick={() => createPlan('계획 1')} style={{
          padding: '12px 32px', borderRadius: JELLY.radiusControl,
          background: PRIMARY, color: '#fff', border: 'none',
          fontSize: 14, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit',
        }}>+ 첫 번째 계획 만들기</button>
      </div>
    )
  }

  // 활성 계획이 없으면 마지막 계획 선택
  const activePlan: RealEstatePlan = plan ?? plans[plans.length - 1]
  if (!plan) setActivePlan(activePlan.id)

  const p = activePlan
  const price = eokToWon(p.priceMan)
  const loan  = eokToWon(p.purchaseLoanMan)

  const deposit    = price * p.depositPct / 100
  const balance    = price - deposit
  const acqTax     = calcAcquisitionTax(price, p.homeCount)
  const agentFee   = calcAgentFee(price)
  const extraTotal = p.planItems.reduce((s, it) => s + (parseInt(it.amountMan || '0', 10) || 0) * 10_000, 0)
  const otherCosts = acqTax + agentFee
  const totalNeed  = price + otherCosts + extraTotal
  const ownCapital = Math.max(0, totalNeed - loan)
  const hasPrice   = price > 0

  return (
    <div>
      {/* 계획 선택 바 */}
      <PlanSelectorBar
        plans={plans}
        activePlanId={activePlan.id}
        onSelect={setActivePlan}
        onCreate={() => createPlan()}
        onDelete={deletePlan}
        onRename={renamePlan}
      />

      {/* 매매 조건 + 예상 비용 (receipt card) */}
      <div style={{
        display: 'flex', flexDirection: narrow ? 'column' : 'row',
        background: (jellyCardStyle.background ?? '#FFFFFF') as string,
        borderRadius: JELLY.radiusLg, boxShadow: JELLY.shadowFloat,
        position: 'relative', overflow: 'hidden',
      }}>
        {/* 입력 패널 */}
        <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 20 }}>
            📝 매매 조건 입력
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <div>
              <div style={labelStyle}>매매가</div>
              <EokInput value={p.priceMan} onChange={(v) => patchActivePlan({ priceMan: v })} placeholder="예) 7.7 (7억7천)" />
              {hasPrice && <div style={{ fontSize: 11, color: PRIMARY, marginTop: 5 }}>= {fmtUnit(price)}</div>}
            </div>
            <div>
              <div style={labelStyle}>계약금 비율</div>
              <OptionGroup options={[5, 10, 20]} value={p.depositPct} onChange={(v) => patchActivePlan({ depositPct: v })} format={(v) => `${v}%`} />
            </div>
            <div>
              <div style={labelStyle}>취득 후 보유 주택 수</div>
              <OptionGroup options={[1, 2, 3]} value={p.homeCount} onChange={(v) => patchActivePlan({ homeCount: v })} format={(v) => `${v}주택`} />
              {p.homeCount === 2 && <div style={{ fontSize: 11, color: '#F59E0B', marginTop: 6 }}>조정대상지역 기준 8% 적용</div>}
              {p.homeCount >= 3 && <div style={{ fontSize: 11, color: '#EF4444', marginTop: 6 }}>3주택 이상 12% 적용</div>}
            </div>

            <div style={{ borderTop: '1px solid #E5E7EB', paddingTop: 18 }}>
              <div style={labelStyle}>추가 비용</div>
              {p.planItems.map((item) => (
                <PlanEditRow
                  key={item.id} item={item}
                  onChangeName={(name) => updatePlanItem(item.id, { name })}
                  onChangeAmount={(amountMan) => updatePlanItem(item.id, { amountMan })}
                  onRemove={() => removePlanItem(item.id)}
                />
              ))}
              <AddItemRow onAdd={(name) => addPlanItem({ name, amountMan: '' })} />
            </div>
          </div>
        </div>

        {narrow ? <ReceiptDividerH /> : <ReceiptDividerV />}

        {/* 결과 패널 */}
        <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 4 }}>🧮 예상 비용 분석</div>
          {!hasPrice ? (
            <div style={{ marginTop: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '32px 0' }}>
              매매가를 입력하면 결과가 표시됩니다.
            </div>
          ) : (
            <>
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>매매 대금</div>
              <ResultRow label="계약금" value={fmtWon(deposit)} sub={`매매가의 ${p.depositPct}%`} />
              <ResultRow label="중도금 + 잔금" value={fmtWon(balance)} sub={`매매가의 ${100 - p.depositPct}%`} />
              <div style={{ fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }}>추가 비용</div>
              <ResultRow label="취득세" value={fmtWon(acqTax)} sub={`${((acqTax / price) * 100).toFixed(2)}%`} />
              <ResultRow label="중개수수료 (상한)" value={fmtWon(agentFee)} sub={`${((agentFee / price) * 100).toFixed(2)}%`} />
              {p.planItems.filter((it) => (parseInt(it.amountMan || '0', 10) || 0) > 0).map((it) => (
                <ResultRow key={it.id} label={it.name || '기타'} value={fmtWon((parseInt(it.amountMan || '0', 10) || 0) * 10_000)} />
              ))}
              <div style={{ marginTop: 8 }}>
                <ResultRow label="총 취득 비용" value={fmtWon(totalNeed)} sub={fmtUnit(totalNeed)} dividerTop />
                {loan > 0 && <ResultRow label="대출" value={`– ${fmtWon(loan)}`} />}
                <ResultRow label="필요 자기자본" value={fmtWon(ownCapital)} sub={fmtUnit(ownCapital)} highlight large dividerTop />
              </div>
              {loan > 0 && (
                <div style={{ marginTop: 16, padding: '12px 14px', background: PRIMARY_LIGHT, borderRadius: 10, fontSize: 12, color: '#374151', lineHeight: 1.6 }}>
                  <span style={{ fontWeight: 600, color: PRIMARY }}>참고</span>
                  {'  '}LTV {((loan / price) * 100).toFixed(1)}%
                  {'  ·  '}계약금 {fmtUnit(deposit)} + 기타비용 {fmtUnit(otherCosts)} = <span style={{ fontWeight: 700 }}>초기 {fmtUnit(deposit + otherCosts)}</span> 필요
                </div>
              )}
              <div style={{ marginTop: 12, fontSize: 11, color: '#9CA3AF', lineHeight: 1.6 }}>
                * 취득세는 주택 수·지역에 따라 달라질 수 있습니다.<br />
                * 중개수수료는 법정 상한액 기준이며 협의 가능합니다.
              </div>
            </>
          )}
        </div>
      </div>

      {/* 대출 계산기 */}
      <LoanCalcSection
        narrow={narrow}
        loanMan={p.loanCalcMan}      onLoanMan={(v) => patchActivePlan({ loanCalcMan: v })}
        rateStr={p.loanRate}         onRateStr={(v) => patchActivePlan({ loanRate: v })}
        termStr={p.loanTerm}         onTermStr={(v) => patchActivePlan({ loanTerm: v })}
        repayType={p.repayType}      onRepayType={(v) => patchActivePlan({ repayType: v })}
        onSendToSheet={(loanMan) => patchActivePlan({ purchaseLoanMan: loanMan })}
      />

      {/* 매매 계획 시트 */}
      <PlanSheet
        price={price} acqTax={acqTax} agentFee={agentFee} loan={loan}
        planItems={p.planItems}
        onAddPlanItem={addPlanItem}
        onUpdatePlanItem={updatePlanItem}
        onRemovePlanItem={removePlanItem}
        capitalItems={p.capitalItems}
        onAddCapitalItem={addCapitalItem}
        onUpdateCapitalItem={updateCapitalItem}
        onRemoveCapitalItem={removeCapitalItem}
      />
    </div>
  )
}

// ── 보유세 계산 ───────────────────────────────────────────────

function calcPropertyTax(assessed: number) {
  const base = assessed * 0.6
  let tax = 0
  if (base <= 60_000_000)       tax = base * 0.001
  else if (base <= 150_000_000) tax = 60_000 + (base - 60_000_000) * 0.0015
  else if (base <= 300_000_000) tax = 195_000 + (base - 150_000_000) * 0.0025
  else                          tax = 570_000 + (base - 300_000_000) * 0.004
  const city = base * 0.0014
  const edu  = tax * 0.2
  return { tax, city, edu, total: tax + city + edu }
}

function calcComprehensiveTax(assessed: number, homeCount: number) {
  const threshold = homeCount === 1 ? 1_200_000_000 : 600_000_000
  if (assessed <= threshold) return null
  const base = (assessed - threshold) * 0.6
  const brackets = homeCount === 1
    ? [[300e6,0.005],[600e6,0.007],[1200e6,0.010],[2500e6,0.013],[5000e6,0.015],[9400e6,0.020],[Infinity,0.027]]
    : [[300e6,0.006],[600e6,0.010],[1200e6,0.013],[2500e6,0.014],[5000e6,0.016],[9400e6,0.021],[Infinity,0.028]]
  let ctax = 0, prev = 0
  for (const [lim, rate] of brackets) {
    if (base <= prev) break
    ctax += (Math.min(base, lim) - prev) * rate
    prev = lim
    if (base <= lim) break
  }
  const rural = ctax * 0.2
  return { ctax, rural, total: ctax + rural }
}

// ── 양도소득세 계산 ───────────────────────────────────────────

function calcCapitalGainsTax(
  salePrice: number, acquirePrice: number, acquireCost: number,
  holdYears: number, isOneHome: boolean,
) {
  const gain = salePrice - acquirePrice - acquireCost
  if (gain <= 0) return { gain, taxable: 0, deductionRate: 0, tax: 0, localTax: 0, exempt: false }
  if (isOneHome && holdYears >= 2 && salePrice <= 1_200_000_000)
    return { gain, taxable: 0, deductionRate: 0, tax: 0, localTax: 0, exempt: true }
  let taxable = gain
  if (isOneHome && salePrice > 1_200_000_000)
    taxable = gain * (salePrice - 1_200_000_000) / salePrice
  let deductionRate = 0
  if (holdYears >= 3)
    deductionRate = isOneHome ? Math.min(holdYears * 0.08, 0.8) : Math.min((holdYears - 2) * 0.02, 0.3)
  taxable = Math.max(0, taxable * (1 - deductionRate) - 2_500_000)
  const brackets = [[14e6,0.06],[50e6,0.15],[88e6,0.24],[150e6,0.35],[300e6,0.38],[500e6,0.40],[1000e6,0.42],[Infinity,0.45]]
  let tax = 0, prev = 0
  for (const [lim, rate] of brackets) {
    if (taxable <= prev) break
    tax += (Math.min(taxable, lim) - prev) * rate
    prev = lim
    if (taxable <= lim) break
  }
  return { gain, taxable, deductionRate, tax, localTax: tax * 0.1, exempt: false }
}

// ── 매매 후 ───────────────────────────────────────────────────

function AfterTab({ narrow }: { narrow: boolean }) {
  const { plans, activePlanId } = useRealEstatePlanStore()
  const plan = plans.find((p) => p.id === activePlanId) ?? plans[plans.length - 1] ?? null

  // 보유세
  const [hAssessed, setHAssessed] = useState('')
  const [hHomeCount, setHHomeCount] = useState(1)

  // 월 지출
  const [mMaintenance, setMMaintenance] = useState('')
  const [mInsurance, setMInsurance] = useState('')
  const [mOther, setMOther] = useState('')

  // 매도
  const [sSalePrice, setSSalePrice] = useState('')
  const [sHoldYears, setSHoldYears] = useState('')
  const [sIsOne, setSIsOne] = useState(true)

  const assessedWon = eokToWon(hAssessed)
  const pt = assessedWon > 0 ? calcPropertyTax(assessedWon) : null
  const ct = assessedWon > 0 ? calcComprehensiveTax(assessedWon, hHomeCount) : null
  const annualHolding = (pt?.total ?? 0) + (ct?.total ?? 0)

  // 대출 원리금 (매매 전 계획 연동)
  const loanPrincipal = plan ? eokToWon(plan.loanCalcMan) : 0
  const loanRate = plan ? (parseFloat(plan.loanRate || '0') || 0) : 0
  const loanTerm = plan ? (parseInt(plan.loanTerm || '0', 10) || 0) : 0
  const loanRepay = plan?.repayType ?? 'equal-installment'
  const loanRes = calcLoan(loanPrincipal, loanRate, loanTerm, loanRepay)
  const loanMonthly = loanRes ? (loanRepay === 'bullet' ? loanRes.monthlyInterestOnly : loanRes.firstMonthPayment) : 0
  const creditMonthly = plan ? (plan.creditLoans ?? []).reduce((s: number, cl: { man: string; rate: string; term: string }) => {
    const clRes = calcLoan(eokToWon(cl.man), parseFloat(cl.rate || '0') || 0, parseInt(cl.term || '0', 10) || 0, 'equal-installment')
    return s + (clRes ? clRes.firstMonthPayment : 0)
  }, 0) : 0
  const totalLoanMonthly = loanMonthly + creditMonthly

  // 월 지출 합계
  const mExtra = ((parseInt(mMaintenance || '0', 10) || 0) + (parseInt(mInsurance || '0', 10) || 0) + (parseInt(mOther || '0', 10) || 0)) * 10_000
  const holdingMonthly = annualHolding / 12
  const totalMonthly = totalLoanMonthly + mExtra + holdingMonthly

  // 매도 시뮬레이터
  const acquirePriceWon = plan ? eokToWon(plan.priceMan) : 0
  const acquireCost = (plan && acquirePriceWon > 0)
    ? calcAcquisitionTax(acquirePriceWon, plan.homeCount) + calcAgentFee(acquirePriceWon)
      + plan.planItems.reduce((s, it) => s + (parseInt(it.amountMan || '0', 10) || 0) * 10_000, 0)
    : 0
  const salePriceWon = eokToWon(sSalePrice)
  const holdYears = parseInt(sHoldYears || '0', 10) || 0
  const saleResult = salePriceWon > 0
    ? calcCapitalGainsTax(salePriceWon, acquirePriceWon, acquireCost, holdYears, sIsOne)
    : null

  const sectionTitle: React.CSSProperties = { fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 12 }
  const secLabel: React.CSSProperties = { fontSize: 12, fontWeight: 600, color: '#9CA3AF', marginTop: 16, marginBottom: 4 }
  const note: React.CSSProperties = { fontSize: 11, color: '#9CA3AF', lineHeight: 1.6, marginTop: 12 }
  const receiptRow = (label: string, value: string, sub?: string, opts: { highlight?: boolean; large?: boolean; dividerTop?: boolean } = {}) => (
    <ResultRow key={label} label={label} value={value} sub={sub} {...opts} />
  )

  return (
    <div>
      {/* ── 보유세 계산기 ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>🏛️ 보유세 계산기</div>
        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', ...jellyCardStyle, borderRadius: JELLY.radiusLg, boxShadow: JELLY.shadowFloat, overflow: 'hidden' }}>
          <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 20 }}>📝 조건 입력</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={labelStyle}>공시가격</div>
                <EokInput value={hAssessed} onChange={setHAssessed} placeholder="예) 5 (5억)" />
                {assessedWon > 0 && <div style={{ fontSize: 11, color: PRIMARY, marginTop: 5 }}>= {fmtUnit(assessedWon)}</div>}
              </div>
              <div>
                <div style={labelStyle}>보유 주택 수</div>
                <OptionGroup options={[1, 2, 3]} value={hHomeCount} onChange={setHHomeCount} format={(v) => `${v}주택`} />
              </div>
            </div>
          </div>
          {narrow ? <ReceiptDividerH /> : <ReceiptDividerV />}
          <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 4 }}>🧮 세금 분석</div>
            {!pt ? (
              <div style={{ marginTop: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '32px 0' }}>공시가격을 입력하면 결과가 표시됩니다.</div>
            ) : (
              <>
                <div style={secLabel}>재산세</div>
                {receiptRow('재산세 본세', fmtWon(pt.tax))}
                {receiptRow('도시지역분', fmtWon(pt.city))}
                {receiptRow('지방교육세', fmtWon(pt.edu))}
                {receiptRow('소계', fmtWon(pt.total), fmtUnit(pt.total), { dividerTop: true })}
                <div style={secLabel}>종합부동산세</div>
                {ct ? (
                  <>
                    {receiptRow('종부세 본세', fmtWon(ct.ctax))}
                    {receiptRow('농어촌특별세', fmtWon(ct.rural))}
                    {receiptRow('소계', fmtWon(ct.total), fmtUnit(ct.total), { dividerTop: true })}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: '#9CA3AF', padding: '8px 0' }}>
                    공시가격 {hHomeCount === 1 ? '12억' : '6억'} 이하 — 종부세 비과세
                  </div>
                )}
                {receiptRow('연간 보유세 합계', fmtWon(annualHolding), fmtUnit(annualHolding), { highlight: true, large: true, dividerTop: true })}
                {receiptRow('월 환산', fmtWon(annualHolding / 12), '÷ 12개월')}
                <div style={note}>
                  * 재산세는 도시지역 기준이며, 7월·9월 분납됩니다.<br />
                  * 공시가격은 국토교통부 부동산공시가격알리미에서 확인하세요.
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* ── 월 지출 요약 ── */}
      <div style={{ marginBottom: 20 }}>
        <div style={sectionTitle}>📅 월 지출 요약</div>
        <div style={{ ...jellyCardStyle, padding: '24px 20px', borderRadius: JELLY.radiusLg, boxShadow: JELLY.shadowFloat }}>
          {totalLoanMonthly > 0 && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: PRIMARY_LIGHT, borderRadius: 10, fontSize: 12, color: '#374151' }}>
              대출 계산기 설정 기준 · 월 납입금 <strong style={{ color: PRIMARY }}>{fmtWon(totalLoanMonthly)}</strong> 자동 반영됨
            </div>
          )}
          {annualHolding > 0 && (
            <div style={{ marginBottom: 16, padding: '12px 14px', background: PRIMARY_LIGHT, borderRadius: 10, fontSize: 12, color: '#374151' }}>
              보유세 계산기 기준 · 월 환산 <strong style={{ color: PRIMARY }}>{fmtWon(holdingMonthly)}</strong> 자동 반영됨
            </div>
          )}
          <div style={{ ...labelStyle, marginBottom: 12 }}>추가 고정 지출 입력</div>
          <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 16, marginBottom: 20 }}>
            {([
              ['관리비 (월)', mMaintenance, setMMaintenance],
              ['보험료 (월)', mInsurance, setMInsurance],
              ['기타 고정 지출 (월)', mOther, setMOther],
            ] as [string, string, (v: string) => void][]).map(([label, val, setter]) => (
              <div key={label}>
                <div style={labelStyle}>{label}</div>
                <div style={{ position: 'relative' }}>
                  <input type="text" inputMode="numeric" defaultValue={val} key={val}
                    onBlur={(e) => setter(e.target.value.replace(/[^0-9]/g, ''))}
                    onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
                    placeholder="0" style={inputStyle} />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF', pointerEvents: 'none' }}>만원</span>
                </div>
              </div>
            ))}
          </div>
          {totalMonthly > 0 ? (
            <>
              {totalLoanMonthly > 0 && (
                <>
                  <div style={secLabel}>대출 원리금</div>
                  {loanMonthly > 0 && receiptRow(plan?.loanBank || '주택담보대출', fmtWon(loanMonthly))}
                  {creditMonthly > 0 && receiptRow('신용대출 합계', fmtWon(creditMonthly))}
                </>
              )}
              {holdingMonthly > 0 && (
                <>
                  <div style={secLabel}>보유세 (월할)</div>
                  {receiptRow('재산세·종부세', fmtWon(holdingMonthly), '연간 보유세 ÷ 12')}
                </>
              )}
              {mExtra > 0 && (
                <>
                  <div style={secLabel}>기타 고정 지출</div>
                  {parseInt(mMaintenance) > 0 && receiptRow('관리비', fmtWon((parseInt(mMaintenance) || 0) * 10_000))}
                  {parseInt(mInsurance) > 0 && receiptRow('보험료', fmtWon((parseInt(mInsurance) || 0) * 10_000))}
                  {parseInt(mOther) > 0 && receiptRow('기타', fmtWon((parseInt(mOther) || 0) * 10_000))}
                </>
              )}
              {receiptRow('월 총 지출', fmtWon(totalMonthly), fmtUnit(totalMonthly), { highlight: true, large: true, dividerTop: true })}
              {receiptRow('연간 환산', fmtWon(totalMonthly * 12), fmtUnit(totalMonthly * 12))}
            </>
          ) : (
            <div style={{ textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '24px 0' }}>위 항목을 입력하면 월 지출이 계산됩니다.</div>
          )}
        </div>
      </div>

      {/* ── 매도 시뮬레이터 ── */}
      <div>
        <div style={sectionTitle}>📈 매도 시뮬레이터</div>
        <div style={{ display: 'flex', flexDirection: narrow ? 'column' : 'row', ...jellyCardStyle, borderRadius: JELLY.radiusLg, boxShadow: JELLY.shadowFloat, overflow: 'hidden' }}>
          <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 20 }}>📝 매도 조건 입력</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
              <div>
                <div style={labelStyle}>취득가</div>
                {acquirePriceWon > 0 ? (
                  <>
                    <div style={{ padding: '10px 14px', background: PRIMARY_LIGHT, borderRadius: 10, fontSize: 12, color: '#374151' }}>
                      매매 전 계획 기준 · <strong style={{ color: PRIMARY }}>{fmtUnit(acquirePriceWon)}</strong>
                    </div>
                    {acquireCost > 0 && <div style={{ fontSize: 11, color: '#9CA3AF', marginTop: 4 }}>취득비용 포함 {fmtUnit(acquirePriceWon + acquireCost)}</div>}
                  </>
                ) : (
                  <div style={{ fontSize: 12, color: '#9CA3AF' }}>매매 전 탭에서 매매가를 입력하면 자동 반영됩니다.</div>
                )}
              </div>
              <div>
                <div style={labelStyle}>예상 매도가</div>
                <EokInput value={sSalePrice} onChange={setSSalePrice} placeholder="예) 10 (10억)" />
                {salePriceWon > 0 && <div style={{ fontSize: 11, color: PRIMARY, marginTop: 5 }}>= {fmtUnit(salePriceWon)}</div>}
              </div>
              <div>
                <div style={labelStyle}>보유 기간</div>
                <div style={{ position: 'relative' }}>
                  <input type="text" inputMode="numeric" defaultValue={sHoldYears} key={sHoldYears}
                    onBlur={(e) => setSHoldYears(e.target.value.replace(/[^0-9]/g, ''))}
                    onChange={(e) => { e.target.value = e.target.value.replace(/[^0-9]/g, '') }}
                    placeholder="예) 5" style={inputStyle} />
                  <span style={{ position: 'absolute', right: 14, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#9CA3AF', pointerEvents: 'none' }}>년</span>
                </div>
              </div>
              <div>
                <div style={labelStyle}>1세대 1주택 여부</div>
                <OptionGroup options={[true, false]} value={sIsOne} onChange={setSIsOne} format={(v) => v ? '예 (1주택)' : '아니요'} />
              </div>
            </div>
          </div>
          {narrow ? <ReceiptDividerH /> : <ReceiptDividerV />}
          <div style={{ padding: '24px 20px', flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 15, fontWeight: 700, color: '#1A1D1F', marginBottom: 4 }}>🧮 세금 & 수익 분석</div>
            {!saleResult ? (
              <div style={{ marginTop: 24, textAlign: 'center', color: '#9CA3AF', fontSize: 14, padding: '32px 0' }}>매도가를 입력하면 결과가 표시됩니다.</div>
            ) : (
              <>
                {acquirePriceWon > 0 && (
                  <>
                    <div style={secLabel}>양도차익</div>
                    {receiptRow('매도가', fmtWon(salePriceWon))}
                    {receiptRow('취득가', `– ${fmtWon(acquirePriceWon)}`)}
                    {acquireCost > 0 && receiptRow('취득비용', `– ${fmtWon(acquireCost)}`)}
                    {receiptRow('양도차익', fmtWon(saleResult.gain), fmtUnit(saleResult.gain), { dividerTop: true })}
                  </>
                )}
                <div style={secLabel}>양도소득세</div>
                {saleResult.exempt ? (
                  <>
                    <div style={{ fontSize: 12, color: '#16a34a', padding: '8px 0' }}>1주택 비과세 요건 충족 (보유 2년+, 매도가 12억 이하)</div>
                    {receiptRow('양도소득세', '0원', '비과세', { highlight: true, large: true, dividerTop: true })}
                    {receiptRow('실 수익', fmtWon(saleResult.gain), fmtUnit(saleResult.gain), { dividerTop: true })}
                  </>
                ) : saleResult.taxable <= 0 ? (
                  receiptRow('양도소득세', '0원', '양도차익 없음')
                ) : (
                  <>
                    {saleResult.deductionRate > 0 && receiptRow('장기보유특별공제', `-${(saleResult.deductionRate * 100).toFixed(0)}%`, `보유 ${holdYears}년 기준`)}
                    {receiptRow('기본공제', '– 250만원')}
                    {receiptRow('과세표준', fmtWon(saleResult.taxable), undefined, { dividerTop: true })}
                    {receiptRow('양도소득세', fmtWon(saleResult.tax))}
                    {receiptRow('지방소득세 (10%)', fmtWon(saleResult.localTax))}
                    {receiptRow('세금 합계', fmtWon(saleResult.tax + saleResult.localTax), fmtUnit(saleResult.tax + saleResult.localTax), { highlight: true, large: true, dividerTop: true })}
                    {receiptRow('실 수익 (세후)', fmtWon(saleResult.gain - saleResult.tax - saleResult.localTax), fmtUnit(saleResult.gain - saleResult.tax - saleResult.localTax), { dividerTop: true })}
                  </>
                )}
                <div style={note}>
                  * 간이 계산으로 실제 세액과 다를 수 있습니다.<br />
                  * 세무사 확인을 권장합니다.
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── 페이지 루트 ───────────────────────────────────────────────

export default function RealEstatePage() {
  const [tab, setTab] = useState<Tab>('before')
  const narrow = useNarrowLayout()

  return (
    <div style={{ padding: narrow ? '16px 12px' : '24px 20px', maxWidth: 900, margin: '0 auto' }}>
      <h1 style={pageTitleH1Style}>🏠 부동산 계산기</h1>
      <TabBar active={tab} onChange={setTab} />
      {tab === 'before' ? <BeforeTab narrow={narrow} /> : <AfterTab narrow={narrow} />}
    </div>
  )
}
