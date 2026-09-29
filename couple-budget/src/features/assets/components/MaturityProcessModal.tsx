import { useState } from 'react'
import { AmountInput } from '@/components/AmountInput'
import { CustomSelect } from '@/components/CustomSelect'
import { Modal } from '@/components/Modal'
import { JELLY } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { ym, addMonths } from '@/lib/assetCalc'
import type { AssetItem } from '@/types'
import { MONTHS, fmtSum } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { DS } from '@/design-system/tokens'

const NO_TRANSFER = '옮기지 않음 (현금으로 수령)'

/**
 * 만기 처리
 * - 처리 월(이번 달)부터 만기 상품은 0원으로 표시 (closedYM = 처리 월의 전월)
 * - 받은 금액을 선택한 항목의 이번 달 잔액에 더함
 */
export function MaturityProcessModal({ model, item, onClose }: { model: AssetModel; item: AssetItem; onClose: () => void }) {
  const { currentYear, currentMonth, sortedItems, getMaturity, getProjectedValue, updateItem, setEntry, getPersonLabel, interestAfterTax } = model
  const currentYM = ym(currentYear, currentMonth)
  const maturity = getMaturity(item)
  const expected = Math.round(maturity?.amount ?? getProjectedValue(currentYear, item, currentMonth))

  // 옮길 수 있는 항목: 이번 달에 살아있는 다른 항목 (입출금 통장을 앞에)
  const targets = sortedItems
    .filter((t) => t.id !== item.id && (!t.closedYM || currentYM <= t.closedYM))
    .sort((a, b) => Number(b.savingsType === 'checking') - Number(a.savingsType === 'checking'))
  const labelOf = (t: AssetItem) => `${t.name} (${getPersonLabel(t.person)})`
  const options = [...targets.map(labelOf), NO_TRANSFER]

  const [received, setReceived] = useState(String(expected))
  const [target, setTarget] = useState(options[0])
  const targetItem = targets.find((t) => labelOf(t) === target)
  const receivedAmount = parseInt(received.replace(/[^\d]/g, ''), 10) || 0

  const prev = addMonths(currentYear, currentMonth, -1)
  const monthLabel = `${currentYear}년 ${MONTHS[currentMonth]}`

  const confirm = () => {
    if (targetItem && receivedAmount > 0) {
      const base = getProjectedValue(currentYear, targetItem, currentMonth)
      setEntry(targetItem.id, currentYM, base + receivedAmount)
    }
    updateItem(item.id, { closedYM: ym(prev.year, prev.monthIdx) })
    onClose()
  }

  const infoRow = (label: string, value: string, strong = false) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: strong ? 13 : 12, marginBottom: 4 }}>
      <span style={{ color: DS.color.text.secondary }}>{label}</span>
      <span style={{ color: strong ? PRIMARY : JELLY.text, fontWeight: strong ? 700 : 500 }}>{value}</span>
    </div>
  )

  return (
    <Modal open title={`${item.name} 만기 처리`} onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <div style={{ background: DS.color.bg.subtle, borderRadius: 10, padding: '10px 12px' }}>
          {infoRow('만기일', item.maturityDate ?? '—')}
          {maturity && infoRow('원금', fmtSum(Math.round(maturity.principal)))}
          {maturity && infoRow(interestAfterTax ? '이자 (세후)' : '이자 (세전)', `+${fmtSum(Math.round(maturity.interest))}`)}
          {infoRow('예상 수령액', fmtSum(expected), true)}
        </div>

        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>실제 받은 금액</div>
          <AmountInput value={received} onChange={setReceived} height={40} />
        </div>

        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: DS.color.text.secondary }}>받은 돈을 옮길 곳</div>
          <CustomSelect options={options} value={target} onChange={setTarget} compact compactFill compactHeight={40} />
        </div>

        <div style={{ fontSize: 12, color: DS.color.text.body, lineHeight: 1.6, background: 'rgba(79, 140, 255, 0.06)', borderRadius: 10, padding: '10px 12px' }}>
          · {monthLabel}부터 <b>{item.name}</b>은(는) 0원으로 표시돼요.
          {targetItem && receivedAmount > 0 && (
            <>
              <br />· <b>{targetItem.name}</b>의 {monthLabel} 잔액에 <b>+{fmtSum(receivedAmount)}</b>이 더해져요.
            </>
          )}
          <br />· 되돌리려면 항목 수정에서 &lsquo;해지/만기 처리&rsquo;를 끄고, 옮긴 금액은 표에서 직접 고쳐주세요.
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
        <button
          type="button"
          onClick={onClose}
          style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: `1px solid ${DS.color.border.strong}`, background: DS.color.bg.secondary, fontSize: 13, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          취소
        </button>
        <button
          type="button"
          onClick={confirm}
          style={{ padding: '8px 16px', borderRadius: JELLY.radiusControl, border: 'none', background: PRIMARY, color: DS.color.text.inverse, fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
        >
          만기 처리
        </button>
      </div>
    </Modal>
  )
}
