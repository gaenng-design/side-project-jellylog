import { useState } from 'react'
import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { AmountInput } from '@/components/AmountInput'
import { Modal } from '@/components/Modal'
import { JELLY, jellyInputSurface } from '@/styles/jellyGlass'
import { PRIMARY, INPUT_BORDER_RADIUS } from '@/styles/formControls'
import { ym } from '@/lib/assetCalc'
import type { AssetItem } from '@/types'
import { MONTHS, fmtSum, savingsTypeLabel } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { DS } from '@/design-system/tokens'
import { Button } from '@/design-system/components'

/** 부호 있는 금액 표시 (예: -120000 → "-120,000") */
const formatSigned = (v: string): string => {
  const neg = v.trim().startsWith('-')
  const digits = v.replace(/\D/g, '')
  if (!digits) return neg ? '-' : ''
  return (neg ? '-' : '') + Number(digits).toLocaleString('ko-KR')
}

const parseAmount = (v: string): number => {
  const n = parseInt(v.replace(/[^\d-]/g, ''), 10)
  return isNaN(n) ? 0 : n
}

/**
 * 이달 잔액 일괄 입력 — 모든 항목의 이번 달 잔액(투자는 평가손익 포함)을 한 화면에서 입력.
 * 입력칸은 현재 표시값(입력값 또는 추정값)으로 채워지고, 저장하면 이번 달 실제 값으로 확정된다.
 */
export function MonthlyBalanceModal({ model, onClose }: { model: AssetModel; onClose: () => void }) {
  const {
    currentYear, currentMonth, sortedItems, getEntry, setEntry, getCostBasisEntry, setCostBasisEntry,
    getProjectedValue, getPnl, getPersonColor, getPersonLabel,
  } = model
  const currentYM = ym(currentYear, currentMonth)

  // 이번 달에 살아있는 항목만 (해지된 항목 제외)
  const activeItems = sortedItems.filter((item) => !item.closedYM || currentYM <= item.closedYM)
  const categories = [
    ...ASSET_CATEGORIES,
    ...new Set(activeItems.map((i) => i.category).filter((c) => !ASSET_CATEGORIES.includes(c))),
  ].filter((cat) => activeItems.some((i) => i.category === cat))

  const [balances, setBalances] = useState<Record<string, string>>(() =>
    Object.fromEntries(activeItems.map((item) => {
      const v = getProjectedValue(currentYear, item, currentMonth)
      return [item.id, v ? String(v) : '']
    })),
  )
  const [pnls, setPnls] = useState<Record<string, string>>(() =>
    Object.fromEntries(activeItems
      .filter((item) => item.category === '투자')
      .map((item) => {
        const v = getPnl(item, currentYear, currentMonth)
        return [item.id, v ? formatSigned(String(v)) : '']
      })),
  )

  const total = activeItems.reduce((s, item) => s + parseAmount(balances[item.id] ?? ''), 0)

  const save = () => {
    for (const item of activeItems) {
      const next = parseAmount(balances[item.id] ?? '')
      if (next !== getEntry(item.id, currentYM)) setEntry(item.id, currentYM, next)
      if (item.category === '투자') {
        const nextPnl = parseAmount(pnls[item.id] ?? '')
        if (nextPnl !== getCostBasisEntry(item.id, currentYM)) setCostBasisEntry(item.id, currentYM, nextPnl)
      }
    }
    onClose()
  }

  const row = (item: AssetItem) => {
    const isEstimated = getEntry(item.id, currentYM) === 0 && parseAmount(balances[item.id] ?? '') !== 0
    const sub = item.category === '저축' ? savingsTypeLabel(item.savingsType) : null
    return (
      <div key={item.id} style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 0', borderTop: `1px solid ${DS.color.bg.muted}` }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ flex: '1 1 0', minWidth: 0 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
              <span
                title={getPersonLabel(item.person)}
                style={{ width: 8, height: 8, borderRadius: '50%', background: getPersonColor(item.person), flexShrink: 0 }}
              />
              <span style={{ fontSize: 13, fontWeight: 600, color: JELLY.text, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {item.name}
              </span>
            </div>
            {(sub || isEstimated) && (
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginTop: 2, paddingLeft: 14 }}>
                {sub && <span style={{ fontSize: 11, color: DS.color.text.muted }}>{sub}</span>}
                {isEstimated && (
                  <span
                    title="이번 달 입력값이 없어 추정한 금액입니다"
                    style={{ fontSize: 10, color: DS.color.text.secondary, background: DS.color.bg.muted, borderRadius: 999, padding: '1px 6px' }}
                  >
                    추정
                  </span>
                )}
              </div>
            )}
          </div>
          <div style={{ flex: '0 0 52%' }}>
            <AmountInput
              value={balances[item.id] ?? ''}
              onChange={(v) => setBalances((prev) => ({ ...prev, [item.id]: v }))}
              height={36}
            />
          </div>
        </div>
        {item.category === '투자' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ flex: '1 1 0', fontSize: 11, color: DS.color.text.secondary, paddingLeft: 14 }}>평가 손익 (+/−)</span>
            <div style={{ flex: '0 0 52%' }}>
              <input
                value={formatSigned(pnls[item.id] ?? '')}
                onChange={(e) => setPnls((prev) => ({ ...prev, [item.id]: e.target.value }))}
                inputMode="text"
                placeholder="예: -120,000"
                style={{
                  width: '100%',
                  height: 36,
                  padding: '0 12px',
                  borderRadius: INPUT_BORDER_RADIUS,
                  fontSize: 13,
                  textAlign: 'right',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  ...jellyInputSurface,
                  color: JELLY.text,
                }}
              />
            </div>
          </div>
        )}
      </div>
    )
  }

  return (
    <Modal open title={`${currentYear}년 ${MONTHS[currentMonth]} 잔액 입력`} onClose={onClose}>
      <div style={{ fontSize: 12, color: DS.color.text.secondary, marginBottom: 8 }}>
        통장·증권 앱에 보이는 이번 달 잔액을 입력하세요. 비어 있던 칸은 추정값으로 채워져 있어요.
      </div>
      {activeItems.length === 0 ? (
        <div style={{ padding: '24px 0', textAlign: 'center', fontSize: 13, color: DS.color.text.muted }}>
          입력할 자산 항목이 없습니다.
        </div>
      ) : (
        categories.map((cat) => (
          <div key={cat} style={{ marginTop: 12 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: DS.color.text.body, marginBottom: 2 }}>{cat}</div>
            {activeItems.filter((i) => i.category === cat).map(row)}
          </div>
        ))
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 16, paddingTop: 12, borderTop: `1px solid ${DS.color.border.subtle}` }}>
        <span style={{ fontSize: 12, color: DS.color.text.secondary }}>합계</span>
        <span style={{ fontSize: 16, fontWeight: 700, color: PRIMARY }}>{fmtSum(total)}</span>
      </div>
      <div style={{ fontSize: 11, color: DS.color.text.muted, marginTop: 6 }}>
        저장하면 추정값도 이번 달 실제 값으로 확정됩니다.
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 16 }}>
        <Button onClick={onClose}>취소</Button>
        <Button variant="primary" onClick={save} disabled={activeItems.length === 0}>
          저장
        </Button>
      </div>
    </Modal>
  )
}
