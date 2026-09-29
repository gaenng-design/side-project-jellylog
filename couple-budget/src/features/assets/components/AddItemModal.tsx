import { useState } from 'react'
import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { CustomSelect } from '@/components/CustomSelect'
import { AmountInput } from '@/components/AmountInput'
import { jellyPrimaryButton, jellyInputSurface } from '@/styles/jellyGlass'
import { PRIMARY, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE } from '@/styles/formControls'
import { SAVINGS_TYPES, savingsTypeLabel, type SavingsType } from '../assetFormat'
import { ToggleSwitch } from './ToggleSwitch'
import { DS } from '@/design-system/tokens'

export function AddItemModal({ onAdd, personAName, personBName, initialCategory, onClose }: {
  onAdd: (params: {
    name: string; category: string; defaultAmount: number; person: 'A' | 'B' | undefined
    locked: boolean; initialAmount?: number
    savingsType?: SavingsType
    interestRate?: number; maturityDate?: string
  }) => void
  personAName: string
  personBName: string
  initialCategory: string
  onClose: () => void
}) {
  const [name, setName] = useState('')
  const [category, setCategory] = useState(initialCategory)
  const [person, setPerson] = useState<'A' | 'B'>('A')
  const [initialAmount, setInitialAmount] = useState('')
  const [defaultAmount, setDefaultAmount] = useState('')
  const [locked, setLocked] = useState(false)
  const [savingsType, setSavingsType] = useState<SavingsType>('installment')
  const [interestRate, setInterestRate] = useState('')
  const [maturityDate, setMaturityDate] = useState('')

  const isDeposit = category === '저축' && savingsType === 'deposit'
  const needsRateDate = category === '저축' && savingsType !== 'checking' && savingsType !== 'subscription'
  const savingsValid = category !== '저축' || savingsType === 'checking' || savingsType === 'subscription' || (!!interestRate && !!maturityDate)
  const canSubmit = name.trim() && savingsValid

  const handleAdd = () => {
    if (!canSubmit) return
    const defAmt = defaultAmount ? parseInt(defaultAmount.replace(/,/g, ''), 10) : 0
    const initAmt = initialAmount ? parseInt(initialAmount.replace(/,/g, ''), 10) : 0
    onAdd({
      name: name.trim(), category,
      defaultAmount: defAmt,
      person,
      locked,
      initialAmount: initAmt || undefined,
      savingsType: category === '저축' ? savingsType : undefined,
      interestRate: interestRate ? parseFloat(interestRate) : undefined,
      maturityDate: (needsRateDate && maturityDate) ? maturityDate : undefined,
    })
    onClose()
  }

  const personOptions = [
    { value: 'A', label: personAName },
    { value: 'B', label: personBName },
  ]

  const btnStyle = (active: boolean): React.CSSProperties => ({
    flex: 1, height: 36, borderRadius: INPUT_BORDER_RADIUS,
    border: active ? `1.5px solid ${PRIMARY}` : `1px solid ${DS.color.border.subtle}`,
    background: active ? `rgba(79,140,255,0.1)` : DS.color.bg.secondary,
    fontSize: 12, fontWeight: active ? 600 : 400,
    color: active ? PRIMARY : DS.color.text.secondary,
    cursor: 'pointer', fontFamily: 'inherit',
  })

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 1000,
        background: 'rgba(0,0,0,0.35)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 16px',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div style={{
        background: DS.color.bg.secondary, borderRadius: 16, padding: '24px 20px',
        width: '100%', maxWidth: 400, maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 8px 40px rgba(0,0,0,0.18)',
        display: 'flex', flexDirection: 'column', gap: 16,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ fontSize: 16, fontWeight: 700, color: DS.color.text.primary }}>항목 추가</span>
          <button type="button" onClick={onClose} style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: DS.color.text.muted, padding: '0 4px' }}>×</button>
        </div>

        {/* 카테고리 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>카테고리 <span style={{ color: DS.color.negative.main }}>*</span></div>
          <CustomSelect options={ASSET_CATEGORIES} value={category} onChange={setCategory} compact compactFill compactHeight={40} />
        </div>

        {/* 항목명 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>항목명 <span style={{ color: DS.color.negative.main }}>*</span></div>
          <input
            autoFocus value={name} onChange={(e) => setName(e.target.value)}
            placeholder="항목명" onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: INPUT_BORDER_RADIUS, fontSize: INPUT_FONT_SIZE, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', ...jellyInputSurface, color: DS.color.text.primary }}
          />
        </div>

        {/* 명의 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>명의 <span style={{ color: DS.color.negative.main }}>*</span></div>
          <CustomSelect
            options={personOptions.map(o => o.label)}
            value={personOptions.find(o => o.value === person)?.label ?? personAName}
            onChange={(label) => { const opt = personOptions.find(o => o.label === label); if (opt) setPerson(opt.value as 'A' | 'B') }}
            compact compactFill compactHeight={40}
          />
        </div>

        {/* 저축 종류 */}
        {category === '저축' && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>종류 <span style={{ color: DS.color.negative.main }}>*</span></div>
            <div style={{ display: 'flex', gap: 6 }}>
              {SAVINGS_TYPES.map((type) => (
                <button key={type} type="button" onClick={() => setSavingsType(type)} style={btnStyle(savingsType === type)}>{savingsTypeLabel(type)}</button>
              ))}
            </div>
          </div>
        )}

        {/* 예금액 (예금 전용) */}
        {isDeposit && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>예금액 <span style={{ color: DS.color.negative.main }}>*</span></div>
            <AmountInput value={initialAmount} onChange={setInitialAmount} placeholder="예금 원금" height={40} />
          </div>
        )}

        {/* 초기 금액 (예금 외) */}
        {!isDeposit && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>초기 금액 (선택)</div>
            <AmountInput value={initialAmount} onChange={setInitialAmount} placeholder="이미 보유한 금액" height={40} />
          </div>
        )}

        {/* 정기 납입액 (부동산·예금 제외) */}
        {category !== '부동산' && !isDeposit && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>
              {category === '저축' ? '월 납입액' : '월 정기 입금액'} (선택)
            </div>
            <AmountInput value={defaultAmount} onChange={setDefaultAmount} placeholder="0" height={40} />
          </div>
        )}

        {/* 연이율 (저축, checking·subscription 제외) */}
        {needsRateDate && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>연이율 % <span style={{ color: DS.color.negative.main }}>*</span></div>
            <input
              type="number" min="0" max="100" step="0.1" value={interestRate}
              onChange={(e) => setInterestRate(e.target.value)} placeholder="예: 3.5"
              style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: INPUT_BORDER_RADIUS, fontSize: INPUT_FONT_SIZE, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', ...jellyInputSurface, color: DS.color.text.primary }}
            />
          </div>
        )}

        {/* 만기일 (저축, checking·subscription 제외) */}
        {needsRateDate && (
          <div>
            <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>만기일 <span style={{ color: DS.color.negative.main }}>*</span></div>
            <input
              type="date" value={maturityDate} onChange={(e) => setMaturityDate(e.target.value)}
              style={{ width: '100%', height: 40, padding: '0 12px', borderRadius: INPUT_BORDER_RADIUS, fontSize: INPUT_FONT_SIZE, fontFamily: 'inherit', outline: 'none', boxSizing: 'border-box', ...jellyInputSurface, color: DS.color.text.primary }}
            />
          </div>
        )}

        {/* 묶인 돈 */}
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>묶인 돈</div>
          <ToggleSwitch checked={locked} onChange={setLocked} />
        </div>

        {/* 버튼 */}
        <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
          <button type="button" onClick={onClose} style={{ flex: 1, height: 44, borderRadius: INPUT_BORDER_RADIUS, border: `1px solid ${DS.color.border.subtle}`, background: DS.color.bg.secondary, fontSize: 14, cursor: 'pointer', color: DS.color.text.secondary, fontFamily: 'inherit' }}>
            취소
          </button>
          <button
            type="button" onClick={handleAdd}
            style={{ ...jellyPrimaryButton, flex: 2, height: 44, fontSize: 14, opacity: canSubmit ? 1 : 0.45, cursor: canSubmit ? 'pointer' : 'default' }}
          >
            추가
          </button>
        </div>
      </div>
    </div>
  )
}
