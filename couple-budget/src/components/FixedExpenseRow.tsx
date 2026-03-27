import { useAppStore } from '@/store/useAppStore'
import { getPersonStyle, PersonBadge, PersonToggle } from '@/components/PersonUI'
import { CustomSelect } from '@/components/CustomSelect'
import { DaySelect } from '@/components/DaySelect'
import { AmountInput } from '@/components/AmountInput'
import { inputBaseStyle } from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'
import type { Person } from '@/types'

/** 삭제 버튼과 동일한 높이 (padding 6*2 + font 11 ≈ 26) */
const ROW_CHIP_HEIGHT = 26
/** 사용자 칩 최대 넓이 */
const USER_CHIP_MAX_WIDTH = 68
/** 금액 인풋 넓이 */
const AMOUNT_INPUT_WIDTH = 150

const FIXED_CATEGORIES = ['주거', '통신', '보험', '구독', '교통', '식비', '의료', '교육', '문화', '관리비', '기타']

export interface FixedExpenseRowData {
  id: string
  /** 지출 계획 구분(공금 / A / B) — 별도 지출 카드에서 편집 시 필요 */
  person?: Person
  category: string
  description: string
  amount: number
  isSeparate?: boolean
  separatePerson?: 'A' | 'B'
  payDay?: number
  /** 고정지출 템플릿 행: 이번 달만 제외 시 합계에서 빠짐 */
  isExcluded?: boolean
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
  /** 지출 계획 행의 구분(공금/A/B) — 카테고리별 보기 맨 앞 칩용 */
  planPerson?: Person
  /** true면 카테고리보다 앞에 유저(또는 별도정산 담당) 칩 */
  categoryViewLeadUserFirst?: boolean
  /** 별도 지출 카드: 앞줄에서 구분(공금/A/B) 편집 */
  leadPlanPersonEditable?: boolean
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
  planPerson = '공금',
  categoryViewLeadUserFirst = false,
  leadPlanPersonEditable = false,
}: FixedExpenseRowProps) {
  const settings = useAppStore((s) => s.settings)
  const separatePerson = row.separatePerson ?? 'A'
  const { bg: chipBg, color: chipColor } = getPersonStyle(separatePerson, settings)
  const separateLabel = row.separatePerson === 'A' ? personAName : row.separatePerson === 'B' ? personBName : null

  const inactiveSeparateButton = (
    <button
      type="button"
      disabled={disabled}
      onClick={() => !disabled && onUpdate({ isSeparate: true })}
      title="별도 정산"
      style={{
        height: ROW_CHIP_HEIGHT,
        minHeight: ROW_CHIP_HEIGHT,
        padding: '0 12px',
        borderRadius: JELLY.radiusControl,
        border: '1px solid #e5e7eb',
        background: '#f9fafb',
        color: '#9ca3af',
        cursor: disabled ? 'default' : 'pointer',
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: 12,
        fontWeight: 700,
        flexShrink: 0,
        boxSizing: 'border-box',
        fontFamily: 'inherit',
      }}
    >
      ↗
    </button>
  )

  const separatePersonSelectChip = row.isSeparate && showSeparatePersonSelect && (
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
      title="별도 정산 담당 선택 · ↗ 누르면 해제"
      compactLeading={<span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>↗</span>}
      onCompactLeadingClick={() => !disabled && onUpdate({ isSeparate: false })}
      compactCaretColor="#fff"
    />
  )

  const separateReadonlyChip = row.isSeparate && !showSeparatePersonSelect && separateLabel && (
    <div
      style={{
        height: ROW_CHIP_HEIGHT,
        minHeight: ROW_CHIP_HEIGHT,
        maxWidth: USER_CHIP_MAX_WIDTH + 52,
        display: 'inline-flex',
        alignItems: 'center',
        borderRadius: JELLY.radiusUserChip,
        border: `1.5px solid ${chipColor}`,
        background: chipBg,
        padding: '0 10px 0 8px',
        gap: 6,
        flexShrink: 0,
        boxSizing: 'border-box',
      }}
      title="별도 정산 · ↗ 누르면 해제"
    >
      <button
        type="button"
        disabled={disabled}
        onClick={() => !disabled && onUpdate({ isSeparate: false })}
        style={{
          padding: 0,
          border: 'none',
          background: 'none',
          cursor: disabled ? 'default' : 'pointer',
          color: '#fff',
          fontSize: 12,
          fontWeight: 700,
          lineHeight: 1,
          fontFamily: 'inherit',
          display: 'inline-flex',
          alignItems: 'center',
        }}
      >
        ↗
      </button>
      <span
        aria-hidden
        style={{
          width: 1,
          alignSelf: 'stretch',
          minHeight: 14,
          background: 'rgba(255,255,255,0.35)',
          borderRadius: 1,
        }}
      />
      <span
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          minWidth: 0,
          color: chipColor,
          fontSize: 12,
          fontWeight: 700,
        }}
      >
        {separateLabel}
      </span>
    </div>
  )

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 8,
        padding: '10px 12px',
        borderRadius: JELLY.radiusControl,
        background: '#f9fafb',
        minWidth: 0,
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {dragHandle && (
        <div style={{ flexShrink: 0, cursor: disabled ? 'default' : 'grab' }}>{dragHandle}</div>
      )}
      {categoryViewLeadUserFirst && (
        <div
          style={{
            flexShrink: 0,
            display: 'flex',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: 6,
            minHeight: ROW_CHIP_HEIGHT,
          }}
        >
          {leadPlanPersonEditable ? (
            <PersonToggle
              compact
              value={row.person ?? planPerson}
              onChange={(p) => {
                if (disabled) return
                if (p === '공금') {
                  onUpdate({ person: p, separatePerson: row.separatePerson ?? 'A' })
                } else {
                  onUpdate({ person: p, separatePerson: p })
                }
              }}
            />
          ) : row.isSeparate ? (
            <>
              {separatePersonSelectChip}
              {separateReadonlyChip}
            </>
          ) : (
            <PersonBadge person={planPerson} />
          )}
          {leadPlanPersonEditable && row.isSeparate && (
            <>
              {separatePersonSelectChip}
              {separateReadonlyChip}
            </>
          )}
        </div>
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
      {categoryViewLeadUserFirst ? (
        !row.isSeparate && inactiveSeparateButton
      ) : (
        <>
          {!row.isSeparate && inactiveSeparateButton}
          {separatePersonSelectChip}
          {separateReadonlyChip}
        </>
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
