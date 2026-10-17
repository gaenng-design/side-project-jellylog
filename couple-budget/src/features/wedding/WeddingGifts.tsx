import { useMemo, useState } from 'react'
import { DS } from '@/design-system/tokens'
import { Button } from '@/design-system/components/Button'
import { Card } from '@/design-system/components/Card'
import { StatCard } from '@/design-system/components/StatCard'
import { Switch } from '@/design-system/components/Switch'
import { Modal } from '@/components/Modal'
import { AmountInput } from '@/components/AmountInput'
import { CustomSelect } from '@/components/CustomSelect'
import { useAppStore } from '@/store/useAppStore'
import { useWeddingStore, GIFT_RELATIONS, type WeddingGift } from '@/store/useWeddingStore'
import type { Side } from '@/lib/weddingSettlement'
import { GiftImportModal } from './GiftImportModal'
import { Chip, EmptyNote, Field, numStyle, parseAmount, textInput, won } from './weddingUi'
import { fmtWonShort } from '@/features/dashboard/chartKit'

type Draft = Omit<WeddingGift, 'id'>
const blank = (side: Side): Draft => ({ side, name: '', relation: GIFT_RELATIONS[1], amount: 0, attended: true })

/** 축의금 탭: 받은 축의금 명단과 답례 관리 */
export function WeddingGifts() {
  const { gifts, addGift, updateGift, removeGift } = useWeddingStore()
  const aName = useAppStore((s) => s.settings.personAName) || '유저 1'
  const bName = useAppStore((s) => s.settings.personBName) || '유저 2'
  const sideName = (s: Side) => (s === 'A' ? aName : bName)

  const [filter, setFilter] = useState<'all' | Side>('all')
  const [query, setQuery] = useState('')
  const [importOpen, setImportOpen] = useState(false)
  const [editing, setEditing] = useState<{ id: string | null; draft: Draft } | null>(null)

  const stat = useMemo(() => {
    const sum = (side?: Side) => gifts.filter((g) => !side || g.side === side).reduce((s, g) => s + g.amount, 0)
    return { total: sum(), a: sum('A'), b: sum('B'), pending: gifts.filter((g) => !g.returned).length }
  }, [gifts])

  const list = gifts
    .filter((g) => (filter === 'all' || g.side === filter) && (!query.trim() || g.name.includes(query.trim())))
    .sort((a, b) => b.amount - a.amount || a.name.localeCompare(b.name, 'ko'))

  const set = (patch: Partial<Draft>) => setEditing((e) => (e ? { ...e, draft: { ...e.draft, ...patch } } : e))
  const save = () => {
    if (!editing || !editing.draft.name.trim()) return
    if (editing.id) updateGift(editing.id, editing.draft)
    else addGift(editing.draft)
    setEditing(null)
  }

  const tab = (value: 'all' | Side, label: string) => (
    <button
      key={value}
      type="button"
      data-compact
      onClick={() => setFilter(value)}
      style={{ height: 32, minHeight: 32, padding: '0 14px', borderRadius: DS.radius.chip, border: `1px solid ${filter === value ? DS.color.primary : DS.color.border.subtle}`, background: filter === value ? DS.color.primarySoft : DS.color.bg.secondary, color: filter === value ? DS.color.primaryDark : DS.color.text.secondary, fontWeight: 600, fontSize: DS.font.size.caption, cursor: 'pointer', fontFamily: 'inherit' }}
    >
      {label}
    </button>
  )

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space[3] }}>
      <div style={{ display: 'grid', gap: DS.space[3], gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <StatCard valueSize={DS.font.size.title} label="총 축의금" value={fmtWonShort(stat.total)} sub={`${gifts.length}건`} />
        <StatCard valueSize={DS.font.size.title} label="답례 남음" value={`${stat.pending}건`} sub="답례 완료 전" />
        <StatCard valueSize={DS.font.size.title} label={`${aName}측`} value={fmtWonShort(stat.a)} />
        <StatCard valueSize={DS.font.size.title} label={`${bName}측`} value={fmtWonShort(stat.b)} />
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
        {tab('all', '전체')}{tab('A', `${aName}측`)}{tab('B', `${bName}측`)}
        <input style={{ ...textInput, flex: '1 1 140px', width: 'auto', height: 36 }} value={query} onChange={(e) => setQuery(e.target.value)} placeholder="이름 검색" />
        <Button onClick={() => setImportOpen(true)}>엑셀로 가져오기</Button>
        <Button variant="primary" onClick={() => setEditing({ id: null, draft: blank(filter === 'B' ? 'B' : 'A') })}>+ 추가</Button>
      </div>

      <Card variant="data" padding={4} hoverLift={false}>
        {list.length === 0 ? (
          <EmptyNote>{gifts.length === 0 ? '받은 축의금을 이름·금액으로 기록해 두세요.' : '조건에 맞는 항목이 없어요.'}</EmptyNote>
        ) : (
          list.map((g, i) => (
            <div key={g.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderTop: i === 0 ? 'none' : `1px solid ${DS.color.border.subtle}` }}>
              <button
                type="button"
                onClick={() => setEditing({ id: g.id, draft: { ...g } })}
                style={{ flex: 1, minWidth: 0, textAlign: 'left', border: 'none', background: 'transparent', padding: 0, fontFamily: 'inherit', color: 'inherit', cursor: 'pointer' }}
              >
                <div style={{ fontSize: DS.font.size.body, fontWeight: 600, color: DS.color.text.primary }}>{g.name}</div>
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
                  <Chip tone="primary">{sideName(g.side)}측</Chip>
                  <Chip>{g.relation}</Chip>
                  {g.attended === false && <Chip tone="warning">불참</Chip>}
                </div>
              </button>
              <div style={{ textAlign: 'right', flexShrink: 0 }}>
                <div style={{ fontSize: DS.font.size.body, fontWeight: 600, ...numStyle }}>{won(g.amount)}</div>
                <button
                  type="button"
                  data-compact
                  onClick={() => updateGift(g.id, { returned: !g.returned })}
                  style={{ marginTop: 4, height: 24, minHeight: 24, padding: '0 8px', borderRadius: DS.radius.chip, border: `1px solid ${g.returned ? DS.color.positive.border : DS.color.border.default}`, background: g.returned ? DS.color.positive.soft : DS.color.bg.secondary, color: g.returned ? DS.color.positive.main : DS.color.text.secondary, fontSize: DS.font.size.caption, fontWeight: 600, cursor: 'pointer', fontFamily: 'inherit' }}
                >
                  {g.returned ? '답례 완료' : '답례 전'}
                </button>
              </div>
            </div>
          ))
        )}
      </Card>

      <GiftImportModal open={importOpen} onClose={() => setImportOpen(false)} names={{ A: aName, B: bName }} />

      <Modal open={!!editing} title={editing?.id ? '축의금 수정' : '축의금 추가'} onClose={() => setEditing(null)}>
        {editing && (
          <>
            <Field label="받은 쪽">
              <CustomSelect options={[aName, bName]} value={sideName(editing.draft.side)} onChange={(v) => set({ side: v === aName ? 'A' : 'B' })} compact compactFill compactHeight={40} />
            </Field>
            <Field label="이름">
              <input style={textInput} value={editing.draft.name} onChange={(e) => set({ name: e.target.value })} />
            </Field>
            <Field label="관계">
              <CustomSelect options={[...GIFT_RELATIONS]} value={editing.draft.relation} onChange={(v) => set({ relation: v })} compact compactFill compactHeight={40} />
            </Field>
            <Field label="금액">
              <AmountInput value={editing.draft.amount ? String(editing.draft.amount) : ''} onChange={(v) => set({ amount: parseAmount(v) })} variant="filled" />
            </Field>
            <Field label="메모 (선택)">
              <input style={textInput} value={editing.draft.memo ?? ''} onChange={(e) => set({ memo: e.target.value || undefined })} />
            </Field>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginBottom: 12 }}>
              <Switch checked={editing.draft.attended !== false} onChange={(v) => set({ attended: v })} label={<span style={{ fontSize: DS.font.size.body }}>참석</span>} />
              <Switch checked={!!editing.draft.returned} onChange={(v) => set({ returned: v })} label={<span style={{ fontSize: DS.font.size.body }}>답례 완료</span>} />
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginTop: 16 }}>
              {editing.id ? <Button variant="danger" onClick={() => { removeGift(editing.id!); setEditing(null) }}>삭제</Button> : <span />}
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
