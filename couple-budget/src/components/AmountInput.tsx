import { useLayoutEffect, useRef } from 'react'
import { INPUT_HEIGHT, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE } from '@/styles/formControls'
import { JELLY, jellyInputSurface } from '@/styles/jellyGlass'

/** 포맷된 문자열에서 왼쪽부터 `digitOffset`개의 숫자 뒤에 해당하는 문자 인덱스(커서 위치) */
function cursorIndexAfterDigitOffset(formatted: string, digitOffset: number): number {
  if (digitOffset <= 0) return 0
  let n = 0
  for (let i = 0; i < formatted.length; i++) {
    if (/\d/.test(formatted[i])) {
      n += 1
      if (n === digitOffset) return i + 1
    }
  }
  return formatted.length
}

interface AmountInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
  /** 미지정 시 `INPUT_HEIGHT` */
  height?: number
  /** `filled`: 면 채움 배경(모달·항목 추가 등) */
  variant?: 'default' | 'filled'
}

export function AmountInput({
  value,
  onChange,
  placeholder = '0',
  disabled,
  height: heightProp,
  variant = 'default',
}: AmountInputProps) {
  const height = heightProp ?? INPUT_HEIGHT
  const inputRef = useRef<HTMLInputElement>(null)
  /** 다음 렌더 후 커서를 놓을 “커서 왼쪽 숫자 개수” (콤마 포맷 반영) */
  const restoreDigitOffsetRef = useRef<number | null>(null)
  const raw = value.replace(/,/g, '')
  const displayValue = raw ? Number(raw).toLocaleString('ko-KR') : ''

  useLayoutEffect(() => {
    const el = inputRef.current
    const off = restoreDigitOffsetRef.current
    if (el == null || off === null || disabled) return
    restoreDigitOffsetRef.current = null
    const maxDigits = (displayValue.match(/\d/g) ?? []).length
    const clamped = Math.max(0, Math.min(off, maxDigits))
    const pos = cursorIndexAfterDigitOffset(displayValue, clamped)
    el.setSelectionRange(pos, pos)
  }, [displayValue, disabled])

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const inputVal = e.target.value
    const sel = e.target.selectionStart ?? inputVal.length
    const digitsBeforeCursor = [...inputVal.slice(0, sel)].filter((c) => /\d/.test(c)).length
    const digits = inputVal.replace(/\D/g, '')
    restoreDigitOffsetRef.current = digitsBeforeCursor
    onChange(digits)
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minHeight: height,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      <input
        ref={inputRef}
        value={displayValue}
        onChange={handleChange}
        placeholder={placeholder}
        inputMode="numeric"
        disabled={disabled}
        style={{
          width: '100%',
          height,
          padding: '0 38px 0 12px',
          borderRadius: INPUT_BORDER_RADIUS,
          fontSize: INPUT_FONT_SIZE,
          fontFamily: 'inherit',
          outline: 'none',
          textAlign: 'right',
          boxSizing: 'border-box',
          ...(variant === 'filled'
            ? {
                background: JELLY.surfaceInput,
                border: JELLY.innerBorderSoft,
                boxShadow: 'none',
              }
            : {
                ...jellyInputSurface,
              }),
          color: '#232d3c',
        }}
      />
      <span
        style={{
          position: 'absolute',
          right: 12,
          color: '#8a99ae',
          fontSize: 13,
          pointerEvents: 'none',
        }}
      >
        원
      </span>
    </div>
  )
}
