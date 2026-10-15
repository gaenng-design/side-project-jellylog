import { useMemo, useState } from 'react'
import { DS } from '@/design-system/tokens'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { Switch } from '@/design-system/components/Switch'
import { Modal } from '@/components/Modal'
import { AmountInput } from '@/components/AmountInput'
import { CustomSelect } from '@/components/CustomSelect'
import { useAppStore } from '@/store/useAppStore'
import { useWeddingStore, WEDDING_CATEGORIES, type WeddingExpense } from '@/store/useWeddingStore'
import type { Side } from '@/lib/weddingSettlement'
import { Chip, EmptyNote, Field, numStyle, parseAmount, textInput, won } from './weddingUi'

type Draft = Omit<WeddingExpense, 'id'>
const blank = (): Draft => ({ category: WEDDING_CATEGORIES[0], name: '', amount: 0, paid: false, payer: 'A', shareA: 50 })

/** 비용 탭: 항목별 예산·결제 내역 */
export function WeddingExpenses() {
  const { expenses, settings, addExpense, updateExpense, removeExpense } = useWeddingStore()
  const aName = useAppStore((s) => s.settings.personAName) || '유저 1'
  const bName = useAppStore((s) => s.settings.personBName) || '유저 2'
  const sideName = (s: Side) => (s === 'A' ? aName : bName)

  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)

  const groups = useMemo(() => {
    const map = new Map<string, WeddingExpense[]>()
    for (const e of expenses) map.set(e.category, [...(map.get(e.category) ?? []), e])
    return [...map.entries()].sort((a, b) => a[0].localeCompare(b[0], 'ko'))
  }, [expenses])

  const save = () => {
    if (!editing) return
    const d = editing.draft
    if (!d.name.trim()) return
    if (editing.id) updateExpense(editing.id, d)
    else addExpense(d)
    setEditing(null)
  }
  const set = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))
  const showShare = settings.splitMode === 'item'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space[3] }}>
      <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
        <Button variant="primary" onClick={() => setEditing({ id: null, draft: blank() })}>+ 비용 추가</Button>
      </div>

      {expenses.length === 0 ? (
        <Card variant="data" padding={5} hoverLift={false}>
          <EmptyNote>
            아직 등록한 비용이 없어요.<br />
            예식장·스드메·예물처럼 항목을 추가하고 예산과 결제 내역을 기록해 보세요.
          </EmptyNote>
        </Card>
      ) : (
        groups.map(([cat, list]) => {
          const total = list.reduce((s, e) => s + e.amount, 0)
          return (
            <Card key={cat} variant="data" padding={4} hoverLift={false}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700 }}>{cat}</div>
                <div style={{ fontSize: DS.font.size.body, fontWeight: 600, ...numStyle }}>{won(total)}</div>
              </div>
              {list.map((e) => (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => setEditing({ id: e.id, draft: { ...e } })}
                  style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, width: '100%', textAlign: 'left', padding: '10px 0', border: 'none', borderTop: `1px solid ${DS.color.border.subtle}`, background: 'transparent', color: 'inherit', fontFamily: 'inherit', cursor: 'pointer' }}
                >
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: DS.font.size.body, fontWeight: 600, color: DS.color.text.primary }}>{e.name}</div>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                      <Chip tone={e.paid ? 'positive' : 'warning'}>{e.paid ? '결제 완료' : '결제 전'}</Chip>
                      <Chip>{sideName(e.payer)} 결제</Chip>
                      {showShare && <Chip tone="primary">{aName} {e.shareA}%</Chip>}
                      {e.date && <Chip>{e.date}</Chip>}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right', flexShrink: 0, ...numStyle }}>
                    <div style={{ fontSize: DS.font.size.body, fontWeight: 600 }}>{won(e.amount)}</div>
                    {e.budget ? <div style={{ fontSize: DS.font.size.caption, color: e.amount > e.budget ? DS.color.negative.main : DS.color.text.muted }}>예산 {won(e.budget)}</div> : null}
                  </div>
                </button>
              ))}
            </Card>
          )
        })
      )}

      <Modal open={!!editing} title={editing?.id ? '비용 수정' : '비용 추가'} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <Field label="분류">
              <CustomSelect options={[...WEDDING_CATEGORIES]} value={editing.draft.category} onChange={(v) => set({ category: v })} compact compactFill compactHeight={40} />
            </Field>
            <Field label="항목 이름">
              <input style={textInput} value={editing.draft.name} onChange={(e) => set({ name: e.target.value })} placeholder="예: 예식장 계약금" />
            </Field>
            <Field label="금액 (예정 또는 결제한 금액)">
              <AmountInput value={editing.draft.amount ? String(editing.draft.amount) : ''} onChange={(v) => set({ amount: parseAmount(v) })} variant="filled" />
            </Field>
            <Field label="예산 (선택)">
              <AmountInput value={editing.draft.budget ? String(editing.draft.budget) : ''} onChange={(v) => set({ budget: parseAmount(v) || undefined })} variant="filled" />
            </Field>
            <Field label="결제한 쪽">
              <CustomSelect options={[aName, bName]} value={sideName(editing.draft.payer)} onChange={(v) => set({ payer: v === aName ? 'A' : 'B' })} compact compactFill compactHeight={40} />
            </Field>
            {showShare && (
              <Field label={`${aName}측 부담 비율 (%)`} hint={`나머지 ${100 - editing.draft.shareA}%는 ${bName}측이 부담해요`}>
                <input style={textInput} inputMode="numeric" value={String(editing.draft.shareA)} onChange={(e) => set({ shareA: Math.min(100, parseAmount(e.target.value)) })} />
              </Field>
            )}
            <Field label="결제(예정)일 (선택)">
              <input style={textInput} type="date" value={editing.draft.date ?? ''} onChange={(e) => set({ date: e.target.value || undefined })} />
            </Field>
            <Field label="메모 (선택)">
              <input style={textInput} value={editing.draft.memo ?? ''} onChange={(e) => set({ memo: e.target.value || undefined })} />
            </Field>
            <div style={{ marginBottom: 12 }}>
              <Switch checked={editing.draft.paid} onChange={(v) => set({ paid: v })} label={<span style={{ fontSize: DS.font.size.body }}>결제 완료 (정산에 포함)</span>} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
              {editing.id ? (
                <Button variant="danger" onClick={() => { removeExpense(editing.id!); setEditing(null) }}>삭제</Button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 8 }}>
                <Button onClick={() => setEditing(null)}>취소</Button>
                <Button variant="primary" onClick={save} disabled={!editing.draft.name.trim()}>저장</Button>
              </div>
            </div>
          </>
        )}
      </Modal>
    </div>
  )
}
