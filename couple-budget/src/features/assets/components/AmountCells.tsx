import { useState, useRef } from 'react'
import { JELLY } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { DS } from '@/design-system/tokens'
import { useAssetStore } from '@/store/useAssetStore'

/** 월별 금액 셀 — 클릭하면 입력 모드 */
export function AmountCell({
  value,
  onChange,
  disabled,
  projected,
}: {
  value: number
  onChange: (v: string) => void
  disabled?: boolean
  projected?: boolean  // 미래 예측값 (읽기전용, 다른 스타일)
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setRaw(value === 0 ? '' : String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    // 정확한 금액 계산: raw값이 공백이면 0, 아니면 파싱
    const cleanValue = raw.replace(/,/g, '')
    const parsed = cleanValue === '' ? '' : cleanValue
    onChange(parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        style={{
          width: '100%',
          height: 36,
          padding: '0 8px',
          border: `1.5px solid ${PRIMARY}`,
          borderRadius: 0,
          fontSize: DS.font.size.caption,
          textAlign: 'right',
          outline: 'none',
          boxSizing: 'border-box',
          background: DS.color.bg.secondary,
          fontFamily: 'inherit',
          color: JELLY.text,
        }}
      />
    )
  }

  return (
    <div
      onClick={() => !disabled && !projected && startEdit()}
      style={{
        width: '100%',
        minHeight: 36,
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px',
        fontSize: DS.font.size.caption,
        color: projected
          ? (value === 0 ? DS.color.border.default : DS.color.text.muted)  // 예측값: 회색
          : (value === 0 ? DS.color.border.default : JELLY.text),
        cursor: (disabled || projected) ? 'default' : 'pointer',
        userSelect: 'none',
        background: projected
          ? (value > 0 ? 'rgba(156, 163, 175, 0.06)' : 'transparent')  // 예측값: 연회색 배경
          : 'transparent',
        border: '1.5px solid transparent',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        fontStyle: projected ? 'italic' : 'normal',  // 예측값: 이탤릭
      }}
    >
      {value === 0 ? '—' : value.toLocaleString('ko-KR')}
    </div>
  )
}


/** 투자 평가 손익용: +/- 입력 지원, 색상 표시 */
export function SignedAmountCell({
  value,
  onChange,
  disabled,
  projected,
}: {
  value: number
  onChange: (v: number) => void
  disabled?: boolean
  projected?: boolean
}) {
  const [editing, setEditing] = useState(false)
  const [raw, setRaw] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  const startEdit = () => {
    setRaw(value === 0 ? '' : String(value))
    setEditing(true)
    setTimeout(() => inputRef.current?.select(), 0)
  }

  const commit = () => {
    const cleaned = raw.replace(/,/g, '').trim()
    const parsed = cleaned === '' ? 0 : parseInt(cleaned, 10)
    onChange(isNaN(parsed) ? 0 : parsed)
    setEditing(false)
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        value={raw}
        onChange={(e) => setRaw(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') commit()
          if (e.key === 'Escape') setEditing(false)
        }}
        placeholder="+/- 금액"
        style={{
          width: '100%',
          height: 36,
          padding: '0 8px',
          border: `1.5px solid ${PRIMARY}`,
          borderRadius: 0,
          fontSize: DS.font.size.caption,
          textAlign: 'right',
          outline: 'none',
          boxSizing: 'border-box',
          background: DS.color.bg.secondary,
          fontFamily: 'inherit',
          color: JELLY.text,
        }}
      />
    )
  }

  const isNeg = value < 0
  const isPos = value > 0
  return (
    <div
      onClick={() => !disabled && !projected && startEdit()}
      style={{
        width: '100%',
        minHeight: 36,
        alignSelf: 'stretch',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'flex-end',
        padding: '0 8px',
        fontSize: DS.font.size.caption,
        color: isNeg ? DS.color.negative.main : isPos ? DS.color.positive.main : DS.color.border.default,
        cursor: (disabled || projected) ? 'default' : 'pointer',
        userSelect: 'none',
        background: 'transparent',
        border: '1.5px solid transparent',
        boxSizing: 'border-box',
        whiteSpace: 'nowrap',
        opacity: disabled ? 0.5 : 1,
        fontWeight: (isNeg || isPos) ? 600 : 400,
      }}
    >
      {value === 0 ? '—' : (isPos ? '+' : '') + value.toLocaleString('ko-KR')}
    </div>
  )
}

/** 투자 항목 월 셀의 예수금 행 — 총 잔고 = 주식 평가금 + 예수금 */
export function CashCell({ itemId, yearMonth, disabled, projected }: { itemId: string; yearMonth: string; disabled?: boolean; projected?: boolean }) {
  const value = useAssetStore((s) => s.cashEntries[`${itemId}::${yearMonth}`] ?? 0)
  const setCash = useAssetStore((s) => s.setCashEntry)
  return (
    <AmountCell
      value={value}
      onChange={(v) => setCash(itemId, yearMonth, v ? parseInt(v.replace(/,/g, ''), 10) || 0 : 0)}
      disabled={disabled}
      projected={projected}
    />
  )
}

/** 투자 항목 월 셀의 실현손익 행 — 그 달에 매도로 확정된 손익(+/-) */
export function RealizedCell({ itemId, yearMonth, disabled, projected }: { itemId: string; yearMonth: string; disabled?: boolean; projected?: boolean }) {
  const value = useAssetStore((s) => s.realizedEntries[`${itemId}::${yearMonth}`] ?? 0)
  const setRealized = useAssetStore((s) => s.setRealizedEntry)
  return <SignedAmountCell value={value} onChange={(v) => setRealized(itemId, yearMonth, v)} disabled={disabled} projected={projected} />
}
