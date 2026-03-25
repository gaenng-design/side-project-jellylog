import { useRef } from 'react'
import { INPUT_HEIGHT, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE, INPUT_BORDER } from '@/styles/formControls'

interface AmountInputProps {
  value: string
  onChange: (v: string) => void
  placeholder?: string
  disabled?: boolean
}

export function AmountInput({ value, onChange, placeholder = '0', disabled }: AmountInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const raw = value.replace(/,/g, '')
  const displayValue = raw ? Number(raw).toLocaleString('ko-KR') : ''

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const digits = e.target.value.replace(/[^0-9]/g, '')
    onChange(digits)
    setTimeout(() => {
      if (inputRef.current) {
        const len = inputRef.current.value.length
        inputRef.current.setSelectionRange(len, len)
      }
    }, 0)
  }

  return (
    <div
      style={{
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        width: '100%',
        minHeight: INPUT_HEIGHT,
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
          height: INPUT_HEIGHT,
          padding: '0 38px 0 12px',
          border: INPUT_BORDER,
          borderRadius: INPUT_BORDER_RADIUS,
          fontSize: INPUT_FONT_SIZE,
          color: '#232d3c',
          fontFamily: 'inherit',
          outline: 'none',
          background: '#fff',
          textAlign: 'right',
          boxSizing: 'border-box',
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
