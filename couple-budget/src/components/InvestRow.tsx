import { useRef, type CSSProperties } from 'react'
import type { Person } from '@/types'
import { CustomSelect } from '@/components/CustomSelect'
import { AmountInput } from '@/components/AmountInput'
import { PersonToggle } from '@/components/PersonUI'
import { CATEGORY_SELECT_TRIGGER_WIDTH, inputBaseStyle } from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'

const INVEST_CATEGORIES = ['저축', '투자']

function formatMaturityDate(ymd: string) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  return `${y}.${m}.${d}`
}

interface InvestRowData {
  id: string
  /** 지출 계획에서 구분(A/B) 표시·편집 시 전달 */
  person?: Exclude<Person, '공금'>
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
  /** true면 행 앞에 A/B 구분 토글 (설정 템플릿 등) */
  showPersonToggle?: boolean
  /** 행 컨테이너(회색 pill) 내부 하단에 렌더 — 계좌번호 등 보조 컨트롤 */
  footerSlot?: React.ReactNode
}

export function InvestRow({
  row,
  onUpdate,
  actionSlot,
  disabled,
  dragHandle,
  compactMaturityDate,
  showPersonToggle = false,
  footerSlot,
}: InvestRowProps) {
  const narrow = useNarrowLayout()
  const dateInputRef = useRef<HTMLInputElement>(null)

  const descStyle: CSSProperties = { flex: 1, minWidth: 0, ...inputBaseStyle }

  const maturityBlock = compactMaturityDate ? (
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
          borderRadius: JELLY.radiusControl,
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
  )

  const amountWrapStyle: CSSProperties = narrow
    ? { flex: 1, minWidth: 0, maxWidth: '100%' }
    : { width: 150, minWidth: 150, flexShrink: 0 }

  if (narrow) {
    return (
      <div
        style={{
          display: 'flex',
          flexDirection: 'column',
          gap: 8,
          padding: '10px 12px',
          borderRadius: JELLY.radiusControl,
          background: '#f9fafb',
          minWidth: 0,
          opacity: disabled ? 0.6 : 1,
        }}
      >
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
            minWidth: 0,
            width: '100%',
            boxSizing: 'border-box',
          }}
        >
          {dragHandle && (
            <div style={{ flexShrink: 0, cursor: disabled ? 'default' : 'grab' }}>{dragHandle}</div>
          )}
          {showPersonToggle && (
            <PersonToggle
              compact
              options={['A', 'B']}
              value={(row.person ?? 'A') as Person}
              onChange={(p) => {
                if (disabled || p === '공금') return
                onUpdate({ person: p as Exclude<Person, '공금'> })
              }}
            />
          )}
          <div style={{ flex: '0 0 auto', width: CATEGORY_SELECT_TRIGGER_WIDTH }}>
            <CustomSelect
              compact
              compactFill
              options={INVEST_CATEGORIES}
              value={row.category}
              onChange={(v) => !disabled && onUpdate({ category: v })}
              triggerWidth={CATEGORY_SELECT_TRIGGER_WIDTH}
            />
          </div>
          <input
            value={row.description}
            onChange={(e) => !disabled && onUpdate({ description: e.target.value })}
            placeholder="항목명"
            disabled={disabled}
            style={descStyle}
          />
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, width: '100%', flexWrap: 'wrap' }}>
          <div style={amountWrapStyle}>
            <AmountInput
              value={String(row.amount)}
              onChange={(v) => !disabled && onUpdate({ amount: Number(v.replace(/,/g, '')) || 0 })}
              disabled={disabled}
            />
          </div>
          <div style={{ flexShrink: 0 }}>{maturityBlock}</div>
          <div style={{ flexShrink: 0, alignSelf: 'center' }}>{actionSlot}</div>
        </div>
        {footerSlot}
      </div>
    )
  }

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 4,
        padding: '10px 12px',
        borderRadius: JELLY.radiusControl,
        background: '#f9fafb',
        minWidth: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        minWidth: 0,
      }}
    >
      {dragHandle && (
        <div style={{ flexShrink: 0, cursor: disabled ? 'default' : 'grab' }}>{dragHandle}</div>
      )}
      {showPersonToggle && (
        <PersonToggle
          compact
          options={['A', 'B']}
          value={(row.person ?? 'A') as Person}
          onChange={(p) => {
            if (disabled || p === '공금') return
            onUpdate({ person: p as Exclude<Person, '공금'> })
          }}
        />
      )}
      <CustomSelect
        compact
        options={INVEST_CATEGORIES}
        value={row.category}
        onChange={(v) => !disabled && onUpdate({ category: v })}
        triggerWidth={CATEGORY_SELECT_TRIGGER_WIDTH}
      />
      <input
        value={row.description}
        onChange={(e) => !disabled && onUpdate({ description: e.target.value })}
        placeholder="항목명"
        disabled={disabled}
        style={descStyle}
      />
      <div style={amountWrapStyle}>
        <AmountInput
          value={String(row.amount)}
          onChange={(v) => !disabled && onUpdate({ amount: Number(v.replace(/,/g, '')) || 0 })}
          disabled={disabled}
        />
      </div>
      {maturityBlock}
      {actionSlot}
    </div>
    {footerSlot}
    </div>
  )
}
