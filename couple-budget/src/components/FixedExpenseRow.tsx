import { useAppStore } from '@/store/useAppStore'
import { getPersonStyle } from '@/components/PersonUI'
import { CustomSelect } from '@/components/CustomSelect'
import { DaySelect } from '@/components/DaySelect'
import { AmountInput } from '@/components/AmountInput'
import { inputBaseStyle, INPUT_BORDER_RADIUS } from '@/styles/formControls'

/** 삭제 버튼과 동일한 높이 (padding 6*2 + font 11 ≈ 26) */
const ROW_CHIP_HEIGHT = 26
/** 사용자 칩 최대 넓이 */
const USER_CHIP_MAX_WIDTH = 68
/** 금액 인풋 넓이 */
const AMOUNT_INPUT_WIDTH = 150

const FIXED_CATEGORIES = ['주거', '통신', '보험', '구독', '교통', '식비', '의료', '교육', '문화', '관리비', '기타']

const separateChipStyle = (bg: string, color: string) => ({
  height: ROW_CHIP_HEIGHT,
  minHeight: ROW_CHIP_HEIGHT,
  maxWidth: USER_CHIP_MAX_WIDTH,
  padding: '0 8px',
  display: 'inline-flex' as const,
  alignItems: 'center',
  fontSize: 12,
  fontWeight: 700,
  borderRadius: 999,
  border: `1.5px solid ${color}`,
  background: bg,
  color,
  boxSizing: 'border-box' as const,
  overflow: 'hidden' as const,
  textOverflow: 'ellipsis' as const,
  whiteSpace: 'nowrap' as const,
})

export interface FixedExpenseRowData {
  id: string
  category: string
  description: string
  amount: number
  isSeparate?: boolean
  separatePerson?: 'A' | 'B'
  payDay?: number
}

interface FixedExpenseRowProps {
  row: FixedExpenseRowData
  onUpdate: (patch: Partial<FixedExpenseRowData>) => void
  actionSlot: React.ReactNode
  disabled?: boolean
  dragHandle?: React.ReactNode
  personAName?: string
  personBName?: string
  useTextFields?: boolean
  showSeparatePersonSelect?: boolean
  showPayDay?: boolean
}

export function FixedExpenseRow({
  row,
  onUpdate,
  actionSlot,
  disabled,
  dragHandle,
  personAName = '유저1',
  personBName = '유저2',
  showSeparatePersonSelect = true,
  showPayDay = true,
}: FixedExpenseRowProps) {
  const settings = useAppStore((s) => s.settings)
  const separatePerson = row.separatePerson ?? 'A'
  const { bg: chipBg, color: chipColor } = getPersonStyle(separatePerson, settings)
  const separateLabel = row.separatePerson === 'A' ? personAName : row.separatePerson === 'B' ? personBName : null

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
        options={FIXED_CATEGORIES}
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
      <span
        onClick={() => !disabled && onUpdate({ isSeparate: !row.isSeparate })}
        title={row.isSeparate ? '별도 정산 해제' : '별도 정산'}
        style={{
          width: 24,
          height: 24,
          borderRadius: 6,
          border: row.isSeparate ? `1.5px solid ${chipColor}` : '1px solid #e5e7eb',
          background: row.isSeparate ? chipBg : '#f9fafb',
          color: row.isSeparate ? chipColor : '#9ca3af',
          cursor: disabled ? 'default' : 'pointer',
          display: 'inline-flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 12,
          fontWeight: 700,
          flexShrink: 0,
        }}
      >
        ↗
      </span>
      {row.isSeparate && showSeparatePersonSelect && (
        <CustomSelect
          compact
          compactAutoWidth
          options={[personAName, personBName]}
          value={row.separatePerson === 'A' ? personAName : personBName}
          onChange={(v) => !disabled && onUpdate({ separatePerson: v === personAName ? 'A' : 'B' })}
          placeholder="선택"
          customBgColor={chipColor}
          customChipBg={chipBg}
          compactHeight={ROW_CHIP_HEIGHT}
        />
      )}
      {row.isSeparate && !showSeparatePersonSelect && separateLabel && (
        <span style={separateChipStyle(chipBg, chipColor)}>{separateLabel}</span>
      )}
      {showPayDay && (
        <DaySelect
          value={row.payDay}
          onChange={(v) => !disabled && onUpdate({ payDay: v })}
          disabled={disabled}
          compact
        />
      )}
      <div style={{ width: AMOUNT_INPUT_WIDTH, minWidth: AMOUNT_INPUT_WIDTH, flexShrink: 0 }}>
        <AmountInput
          value={String(row.amount)}
          onChange={(v) => !disabled && onUpdate({ amount: Number(v.replace(/,/g, '')) || 0 })}
          disabled={disabled}
        />
      </div>
      {actionSlot}
    </div>
  )
}
