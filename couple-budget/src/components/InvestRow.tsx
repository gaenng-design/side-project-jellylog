import { useRef } from 'react'
import { CustomSelect } from '@/components/CustomSelect'
import { AmountInput } from '@/components/AmountInput'
import { inputBaseStyle } from '@/styles/formControls'

const INVEST_CATEGORIES = ['저축', '투자']

function formatMaturityDate(ymd: string) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  return `${y}.${m}.${d}`
}

interface InvestRowData {
  id: string
  category: string
  description: string
  amount: number
  maturityDate?: string
}

interface InvestRowProps {
  row: InvestRowData
  onUpdate: (patch: Partial<InvestRowData>) => void
  actionSlot: React.ReactNode
  disabled?: boolean
  dragHandle?: React.ReactNode
  compactMaturityDate?: boolean
}

export function InvestRow({ row, onUpdate, actionSlot, disabled, dragHandle, compactMaturityDate }: InvestRowProps) {
  const dateInputRef = useRef<HTMLInputElement>(null)
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: 10,
        background: '#f9fafb',
        minWidth: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {dragHandle && (
        <div style={{ flexShrink: 0, cursor: disabled ? 'default' : 'grab' }}>{dragHandle}</div>
      )}
      <CustomSelect
        compact
        options={INVEST_CATEGORIES}
        value={row.category}
        onChange={(v) => !disabled && onUpdate({ category: v })}
      />
      <input
        value={row.description}
        onChange={(e) => !disabled && onUpdate({ description: e.target.value })}
        placeholder="항목명"
        disabled={disabled}
        style={{ flex: 1, minWidth: 0, ...inputBaseStyle }}
      />
      <div style={{ width: 150, minWidth: 150, flexShrink: 0 }}>
        <AmountInput
          value={String(row.amount)}
          onChange={(v) => !disabled && onUpdate({ amount: Number(v.replace(/,/g, '')) || 0 })}
          disabled={disabled}
        />
      </div>
      {compactMaturityDate ? (
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <input
            ref={dateInputRef}
            type="date"
            value={row.maturityDate ?? ''}
            onChange={(e) => !disabled && onUpdate({ maturityDate: e.target.value || undefined })}
            disabled={disabled}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, left: 0, top: 0, pointerEvents: 'none' }}
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => {
              if (disabled) return
              const el = dateInputRef.current
              if (el) {
                if (typeof el.showPicker === 'function') el.showPicker()
                else el.click()
              }
            }}
            disabled={disabled}
            title="만기일 선택"
            style={{
              padding: 8,
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              background: '#fff',
              cursor: disabled ? 'default' : 'pointer',
              fontSize: 14,
              color: '#6b7280',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            📅
          </button>
          {row.maturityDate && (
            <span style={{ fontSize: 13, color: '#111827', minWidth: 72 }}>
              {formatMaturityDate(row.maturityDate)}
            </span>
          )}
        </div>
      ) : (
        <input
          type="date"
          value={row.maturityDate ?? ''}
          onChange={(e) => !disabled && onUpdate({ maturityDate: e.target.value || undefined })}
          disabled={disabled}
          placeholder="만기일"
          style={{ width: 130, minWidth: 130, flexShrink: 0, ...inputBaseStyle }}
        />
      )}
      {actionSlot}
    </div>
  )
}
