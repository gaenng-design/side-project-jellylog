import { useState } from 'react'
import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { CustomSelect } from '@/components/CustomSelect'
import { AmountInput } from '@/components/AmountInput'
import { Modal } from '@/components/Modal'
import { jellyInputSurface } from '@/styles/jellyGlass'
import { PRIMARY, INPUT_BORDER_RADIUS, INPUT_FONT_SIZE } from '@/styles/formControls'
import type { AssetItem } from '@/types'
import { SAVINGS_TYPES, savingsTypeLabel, type SavingsType } from '../assetFormat'
import { ToggleSwitch } from './ToggleSwitch'
import { DS } from '@/design-system/tokens'
import { Button } from '@/design-system/components'

/** 항목 수정 모달 — 열릴 때 item 값으로 폼을 채운다 (item이 바뀌면 key로 다시 마운트) */
export function EditItemModal({
  item,
  personAName,
  personBName,
  currentYM,
  onSave,
  onDelete,
  onClose,
}: {
  item: AssetItem
  personAName: string
  personBName: string
  /** 해지 처리 토글 시 기록할 연월 */
  currentYM: string
  onSave: (patch: Partial<Omit<AssetItem, 'id'>>) => void
  onDelete: () => void
  onClose: () => void
}) {
  const [editForm, setEditForm] = useState({
    name: item.name,
    category: item.category || '저축',
    defaultAmount: item.defaultAmount ? String(item.defaultAmount) : '',
    person: (item.person ?? '공유') as 'A' | 'B' | '공유',
    locked: !!item.locked,
    interestRate: item.interestRate ? String(item.interestRate) : '',
    savingsType: (item.savingsType ?? 'installment') as SavingsType,
    maturityDate: item.maturityDate ?? '',
    closedYM: item.closedYM ?? '',
  })
  const savingsValid =
    editForm.category !== '저축' ||
    editForm.savingsType === 'checking' ||
    editForm.savingsType === 'subscription' ||
    (!!editForm.interestRate && !!editForm.maturityDate)
  const canSave = !!editForm.name.trim() && savingsValid

  return (
    <Modal
      open
      title="항목 수정"
      onClose={onClose}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>항목명 <span style={{ color: DS.color.negative.main }}>*</span></div>
          <input
            value={editForm.name}
            onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
            placeholder="항목명"
            style={{
              width: '100%',
              height: 40,
              padding: '0 12px',
              borderRadius: INPUT_BORDER_RADIUS,
              fontSize: INPUT_FONT_SIZE,
              fontFamily: 'inherit',
              outline: 'none',
              boxSizing: 'border-box',
              ...jellyInputSurface,
              color: DS.color.text.primary,
            }}
          />
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>카테고리 <span style={{ color: DS.color.negative.main }}>*</span></div>
            <CustomSelect
              options={ASSET_CATEGORIES}
              value={editForm.category}
              onChange={(v) => setEditForm({ ...editForm, category: v })}
              compact
              compactFill
              compactHeight={40}
            />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>명의 <span style={{ color: DS.color.negative.main }}>*</span></div>
            <CustomSelect
              options={['공유', personAName, personBName]}
              value={editForm.person === 'A' ? personAName : editForm.person === 'B' ? personBName : '공유'}
              onChange={(label) => {
                const p = label === personAName ? 'A' : label === personBName ? 'B' : '공유'
                setEditForm({ ...editForm, person: p as 'A' | 'B' | '공유' })
              }}
              compact
              compactFill
              compactHeight={40}
            />
          </div>
        </div>

        {editForm.category !== '부동산' && !(editForm.category === '저축' && editForm.savingsType === 'deposit') && (
          <div>
            <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>정기입금액 (선택)</div>
            <AmountInput
              value={editForm.defaultAmount}
              onChange={(v) => setEditForm({ ...editForm, defaultAmount: v })}
              placeholder="매월 추가되는 금액"
              height={40}
            />
          </div>
        )}

        {/* 예금 전용: 원금은 월별 표에서 수정 (defaultAmount는 월 납입액이므로 사용하지 않음) */}
        {editForm.category === '저축' && editForm.savingsType === 'deposit' && (
          <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary }}>
            예금 원금은 월별 표의 금액 칸에서 수정할 수 있어요.
          </div>
        )}

        {/* 묶인 돈 토글 */}
        <div>
          <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>묶인 돈</div>
          <ToggleSwitch checked={editForm.locked} onChange={(v) => setEditForm({ ...editForm, locked: v })} />
        </div>

        {/* 저축 전용 필드 */}
        {editForm.category === '저축' && (
          <>
            {/* 적금 / 예금 선택 */}
            <div>
              <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>종류 <span style={{ color: DS.color.negative.main }}>*</span></div>
              <div style={{ display: 'flex', gap: 8 }}>
                {SAVINGS_TYPES.map((type) => {
                  const label = savingsTypeLabel(type)
                  const active = editForm.savingsType === type
                  return (
                    <button
                      key={type}
                      type="button"
                      onClick={() => setEditForm({ ...editForm, savingsType: type })}
                      style={{
                        flex: 1,
                        height: 40,
                        borderRadius: INPUT_BORDER_RADIUS,
                        border: `1.5px solid ${active ? PRIMARY : DS.color.border.subtle}`,
                        background: active ? 'rgba(79,140,255,0.1)' : DS.color.bg.secondary,
                        fontSize: DS.font.size.body,
                        fontWeight: active ? 600 : 400,
                        color: active ? PRIMARY : DS.color.text.secondary,
                        cursor: 'pointer',
                        fontFamily: 'inherit',
                      }}
                    >
                      {label}
                    </button>
                  )
                })}
              </div>
            </div>
            {/* 연이율 */}
            <div>
              <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>연이율 % {editForm.savingsType !== 'checking' && editForm.savingsType !== 'subscription' && <span style={{ color: DS.color.negative.main }}>*</span>}</div>
              <input
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={editForm.interestRate}
                onChange={(e) => setEditForm({ ...editForm, interestRate: e.target.value })}
                placeholder="예: 3.5"
                style={{
                  width: '100%',
                  height: 40,
                  padding: '0 12px',
                  borderRadius: INPUT_BORDER_RADIUS,
                  fontSize: INPUT_FONT_SIZE,
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box',
                  ...jellyInputSurface,
                  color: DS.color.text.primary,
                }}
              />
            </div>
            {/* 만기일: 청약은 불필요 */}
            {editForm.savingsType !== 'subscription' && (
              <div>
                <div style={{ fontSize: DS.font.size.caption, marginBottom: 4 }}>만기일 {editForm.savingsType !== 'checking' && <span style={{ color: DS.color.negative.main }}>*</span>}</div>
                <input
                  type="date"
                  value={editForm.maturityDate}
                  onChange={(e) => setEditForm({ ...editForm, maturityDate: e.target.value })}
                  style={{
                    width: '100%',
                    height: 40,
                    padding: '0 12px',
                    borderRadius: INPUT_BORDER_RADIUS,
                    fontSize: INPUT_FONT_SIZE,
                    fontFamily: 'inherit',
                    outline: 'none',
                    boxSizing: 'border-box',
                    ...jellyInputSurface,
                    color: DS.color.text.primary,
                  }}
                />
              </div>
            )}
          </>
        )}


      {/* 해지/만기 처리 */}
      {editForm.category === '저축' && (
        <div>
          <div style={{ fontSize: DS.font.size.caption, marginBottom: 4, color: DS.color.text.secondary }}>해지/만기 처리</div>
          <ToggleSwitch
            checked={!!editForm.closedYM}
            onChange={(v) => setEditForm({ ...editForm, closedYM: v ? currentYM : '' })}
            onLabel="해지됨"
            offLabel="사용 중"
          />
          {editForm.closedYM && (
            <div style={{ fontSize: DS.font.size.caption, color: DS.color.warning.main, marginTop: 4 }}>
              {editForm.closedYM} 이후 자동 이월 중단
            </div>
          )}
        </div>
      )}

      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 18 }}>
        {/* 삭제 버튼 */}
        <Button
          variant="danger"
          onClick={() => {
            if (window.confirm(`'${item.name}' 항목을 삭제할까요?\n모든 금액 데이터도 함께 삭제됩니다.`)) {
              onDelete()
            }
          }}
        >
          삭제
        </Button>

        <div style={{ display: 'flex', gap: 8 }}>
          <Button onClick={onClose}>취소</Button>
          <Button
            variant="primary"
            disabled={!canSave}
            onClick={() => {
              if (canSave) {
                const isDepositForm = editForm.category === '저축' && editForm.savingsType === 'deposit'
                const newDefaultAmount = !isDepositForm && editForm.defaultAmount ? parseInt(editForm.defaultAmount.replace(/,/g, ''), 10) : undefined
                const newPerson = editForm.person === '공유' ? undefined : editForm.person as 'A' | 'B'
                onSave({
                  name: editForm.name.trim(),
                  category: editForm.category || '저축',
                  person: newPerson,
                  defaultAmount: newDefaultAmount,
                  locked: editForm.locked || undefined,
                  interestRate: editForm.interestRate ? parseFloat(editForm.interestRate) : undefined,
                  savingsType: editForm.category === '저축' ? editForm.savingsType : undefined,
                  maturityDate: (editForm.savingsType !== 'subscription' && editForm.maturityDate) ? editForm.maturityDate : undefined,
                  closedYM: editForm.closedYM || undefined,
                })
              }
            }}
          >
            저장
          </Button>
        </div>
      </div>
    </Modal>
  )
}
