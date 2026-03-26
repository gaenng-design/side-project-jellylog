import { useState, useEffect, useMemo, useRef } from 'react'
import { Link } from 'react-router-dom'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { UserChipColorSelect } from '@/components/UserChipColorSelect'
import { PersonToggle, getPersonStyle } from '@/components/PersonUI'
import { AmountInput } from '@/components/AmountInput'
import { DaySelect } from '@/components/DaySelect'
import { CustomSelect } from '@/components/CustomSelect'
import { FixedExpenseRow } from '@/components/FixedExpenseRow'
import { InvestRow } from '@/components/InvestRow'
import { GroupHeaderChip } from '@/components/GroupHeaderChip'
import { inputBaseStyle, PRIMARY, settingsSectionCardStyle } from '@/styles/formControls'
import { jellyGhostButton, jellyPrimaryButton, jellyPrimaryButtonDisabled } from '@/styles/jellyGlass'
import { isSupabaseConfigured } from '@/data/supabase'
import { saveAllToSupabase } from '@/data/saveAllToSupabase'
import type { Person } from '@/types'
import type { FixedTemplate, InvestTemplate } from '@/types'

const FIXED_CATEGORIES = ['주거', '통신', '보험', '구독', '교통', '식비', '의료', '교육', '문화', '관리비', '기타']
const INVEST_CATEGORIES = ['저축', '투자']
const PERSON_ORDER = ['공금', 'A', 'B'] as const

type TemplateUpdatePatch = Partial<{ category: string; description: string; defaultAmount: number; payDay?: number; defaultSeparate?: boolean; defaultSeparatePerson?: 'A' | 'B' }>

function SortableTemplateRow(props: {
  tpl: FixedTemplate
  personAName: string
  personBName: string
  settings: { user1Color?: string; user2Color?: string }
  onUpdate: (patch: TemplateUpdatePatch) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.tpl.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <FixedExpenseRow
        row={{
          id: props.tpl.id,
          category: props.tpl.category,
          description: props.tpl.description,
          amount: props.tpl.defaultAmount,
          isSeparate: props.tpl.defaultSeparate,
          separatePerson: props.tpl.person === 'A' || props.tpl.person === 'B' ? props.tpl.person : (props.tpl.defaultSeparatePerson ?? 'A'),
          payDay: props.tpl.payDay,
        }}
        onUpdate={(patch) => {
          if ('category' in patch) props.onUpdate({ category: patch.category! })
          if ('description' in patch) props.onUpdate({ description: patch.description! })
          if ('amount' in patch) props.onUpdate({ defaultAmount: patch.amount! })
          if ('payDay' in patch) props.onUpdate({ payDay: patch.payDay })
          if ('isSeparate' in patch) {
            const update: { defaultSeparate: boolean; defaultSeparatePerson?: 'A' | 'B' } = { defaultSeparate: patch.isSeparate! }
            if (patch.isSeparate && (props.tpl.person === 'A' || props.tpl.person === 'B')) {
              update.defaultSeparatePerson = props.tpl.person
            }
            props.onUpdate(update)
          }
          if ('separatePerson' in patch) props.onUpdate({ defaultSeparatePerson: patch.separatePerson })
        }}
        actionSlot={
          <button
            onClick={props.onRemove}
            style={{
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            삭제
          </button>
        }
        personAName={props.personAName}
        personBName={props.personBName}
        showSeparatePersonSelect={props.tpl.person === '공금'}
        dragHandle={
          <div {...attributes} {...listeners} style={{ padding: '4px 2px', cursor: isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.5 : 1, color: '#d1d5db' }}>
            ⋮
          </div>
        }
      />
    </div>
  )
}

function SortableInvestRow(props: {
  tpl: InvestTemplate
  onUpdate: (patch: Partial<{ category: string; description: string; defaultAmount: number; maturityDate?: string }>) => void
  onRemove: () => void
}) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: props.tpl.id })
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }
  return (
    <div ref={setNodeRef} style={style}>
      <InvestRow
        row={{
          id: props.tpl.id,
          category: props.tpl.category,
          description: props.tpl.description,
          amount: props.tpl.defaultAmount,
          maturityDate: props.tpl.maturityDate,
        }}
        onUpdate={props.onUpdate}
        actionSlot={
          <button
            onClick={props.onRemove}
            style={{
              fontSize: 11,
              padding: '6px 10px',
              borderRadius: 8,
              border: '1px solid #fecaca',
              background: '#fef2f2',
              color: '#b91c1c',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            삭제
          </button>
        }
        dragHandle={
          <div {...attributes} {...listeners} style={{ padding: '4px 2px', cursor: isDragging ? 'grabbing' : 'grab', opacity: isDragging ? 0.5 : 1, color: '#d1d5db' }}>
            ⋮
          </div>
        }
        compactMaturityDate
      />
    </div>
  )
}

function UserSettings() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [draft, setDraft] = useState(settings)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings.personAName, settings.personBName, settings.personAIncome, settings.personBIncome, settings.personAIncomeDay, settings.personBIncomeDay, settings.user1Color, settings.user2Color])

  useEffect(() => {
    if (!toastMsg) return
    const t = setTimeout(() => setToastMsg(null), 2000)
    return () => clearTimeout(t)
  }, [toastMsg])

  const handleSave = () => {
    updateSettings({
      personAName: draft.personAName,
      personBName: draft.personBName,
      personAIncome: draft.personAIncome,
      personBIncome: draft.personBIncome,
      personAIncomeDay: draft.personAIncomeDay,
      personBIncomeDay: draft.personBIncomeDay,
      user1Color: draft.user1Color,
      user2Color: draft.user2Color,
    })
    setToastMsg('저장되었습니다.')
  }

  return (
    <>
    <div style={settingsSectionCardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>유저 설정</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        {/* 유저 1 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={draft.personAName}
              onChange={(e) => setDraft((d) => ({ ...d, personAName: e.target.value }))}
              placeholder="유저명"
              style={{ flex: 1, minWidth: 80, ...inputBaseStyle }}
            />
            <UserChipColorSelect
              value={draft.user1Color ?? '#FFADAD'}
              onChange={(c) => setDraft((d) => ({ ...d, user1Color: c }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AmountInput
              value={String(draft.personAIncome)}
              onChange={(v) => setDraft((d) => ({ ...d, personAIncome: Number(v.replace(/,/g, '')) || 0 }))}
              placeholder="월수입"
            />
            <DaySelect
              value={draft.personAIncomeDay}
              onChange={(v) => setDraft((d) => ({ ...d, personAIncomeDay: v ?? 25 }))}
              compact
            />
          </div>
        </div>
        {/* 유저 2 */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
            <input
              value={draft.personBName}
              onChange={(e) => setDraft((d) => ({ ...d, personBName: e.target.value }))}
              placeholder="유저명"
              style={{ flex: 1, minWidth: 80, ...inputBaseStyle }}
            />
            <UserChipColorSelect
              value={draft.user2Color ?? '#9BF6FF'}
              onChange={(c) => setDraft((d) => ({ ...d, user2Color: c }))}
            />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <AmountInput
              value={String(draft.personBIncome)}
              onChange={(v) => setDraft((d) => ({ ...d, personBIncome: Number(v.replace(/,/g, '')) || 0 }))}
              placeholder="월수입"
            />
            <DaySelect
              value={draft.personBIncomeDay}
              onChange={(v) => setDraft((d) => ({ ...d, personBIncomeDay: v ?? 25 }))}
              compact
            />
          </div>
        </div>
      </div>
      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'flex-end' }}>
        <button
          type="button"
          onClick={handleSave}
          style={{
            padding: '10px 24px',
            borderRadius: 10,
            border: 'none',
            background: PRIMARY,
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          저장
        </button>
      </div>
    </div>
    {toastMsg && (
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 20px',
          background: '#111827',
          color: '#fff',
          borderRadius: 10,
          fontSize: 14,
          fontWeight: 500,
          zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {toastMsg}
      </div>
    )}
    </>
  )
}

const RATIO_OPTIONS = [
  { value: '50:50' as const, label: '50:50' },
  { value: 'custom' as const, label: '사용자 설정에 따라' },
  { value: 'income' as const, label: '수입 %에 따라' },
]

function SharedLivingCostSettings() {
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)

  return (
    <div style={settingsSectionCardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>공동 생활비</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>월 공동 생활비 (원)</div>
          <AmountInput
            value={String(settings.sharedLivingCost ?? 0)}
            onChange={(v) => updateSettings({ sharedLivingCost: Number(v.replace(/,/g, '')) || 0 })}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4 }}>분담 비율</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {RATIO_OPTIONS.map((opt) => (
              <label
                key={opt.value}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  fontSize: 13,
                  cursor: 'pointer',
                }}
              >
                <input
                  type="radio"
                  name="sharedRatio"
                  checked={(settings.sharedLivingCostRatioMode ?? '50:50') === opt.value}
                  onChange={() => updateSettings({ sharedLivingCostRatioMode: opt.value })}
                />
                {opt.label}
              </label>
            ))}
          </div>
          {(settings.sharedLivingCostRatioMode ?? '50:50') === 'custom' && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.sharedLivingCostRatio?.[0] ?? 50}
                onChange={(e) => {
                  const a = Number(e.target.value) || 0
                  const b = 100 - a
                  updateSettings({ sharedLivingCostRatio: [a, b] })
                }}
                style={{ width: 60, ...inputBaseStyle }}
              />
              <span style={{ fontSize: 12 }}>:</span>
              <input
                type="number"
                min={0}
                max={100}
                value={settings.sharedLivingCostRatio?.[1] ?? 50}
                onChange={(e) => {
                  const b = Number(e.target.value) || 0
                  const a = 100 - b
                  updateSettings({ sharedLivingCostRatio: [a, b] })
                }}
                style={{ width: 60, ...inputBaseStyle }}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function FixedTemplateSettings() {
  const settings = useAppStore((s) => s.settings)
  const templatesRaw = useFixedTemplateStore((s) => s.templates)
  const addTemplate = useFixedTemplateStore((s) => s.addTemplate)
  const updateTemplate = useFixedTemplateStore((s) => s.updateTemplate)
  const removeTemplate = useFixedTemplateStore((s) => s.removeTemplate)
  const moveTemplateWithinPerson = useFixedTemplateStore((s) => s.moveTemplateWithinPerson)
  const personAName = settings.personAName || '유저1'
  const personBName = settings.personBName || '유저2'
  const PERSON_LABELS: Record<string, string> = { 공금: '공금', A: personAName, B: personBName }

  const [person, setPerson] = useState<Person>('공금')
  const [category, setCategory] = useState('관리비')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [defaultSeparate, setDefaultSeparate] = useState(false)
  const [defaultSeparatePerson, setDefaultSeparatePerson] = useState<'A' | 'B'>('A')

  const handleAdd = () => {
    if (!desc) return
    addTemplate({
      person,
      category,
      description: desc,
      defaultAmount: Number(amount.replace(/,/g, '')) || 0,
      defaultSeparate: person === '공금' ? defaultSeparate : undefined,
      defaultSeparatePerson: person === '공금' && defaultSeparate ? defaultSeparatePerson : undefined,
    })
    setDesc('')
    setAmount('')
  }

  const grouped = useMemo(() => {
    const acc = templatesRaw.reduce((a, t) => {
      const key = t.person
      if (!a[key]) a[key] = []
      a[key].push(t)
      return a
    }, {} as Record<string, typeof templatesRaw>)
    for (const key of Object.keys(acc)) {
      acc[key].sort((a, b) => (a.personOrder ?? 999) - (b.personOrder ?? 999))
    }
    return acc
  }, [templatesRaw])

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <div style={settingsSectionCardStyle}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>고정지출 템플릿</div>
      </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
          {PERSON_ORDER.filter((p) => (grouped[p]?.length ?? 0) > 0).map((personKey) => (
            <DndContext
              key={personKey}
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={({ active, over }) => {
                if (over && active.id !== over.id) {
                  moveTemplateWithinPerson(String(active.id), String(over.id))
                }
              }}
            >
              <div>
                <GroupHeaderChip
                  label={PERSON_LABELS[personKey]}
                  total={grouped[personKey]?.reduce((s, t) => s + t.defaultAmount, 0)}
                  color={
                    personKey === '공금'
                      ? '#111827'
                      : personKey === 'A'
                        ? settings.user1Color
                        : settings.user2Color
                  }
                  useUserChipStyle={personKey !== '공금'}
                />
                <SortableContext items={grouped[personKey]?.map((t) => t.id) ?? []} strategy={verticalListSortingStrategy}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {grouped[personKey]?.map((tpl) => (
                      <SortableTemplateRow
                        key={tpl.id}
                        tpl={tpl}
                        personAName={personAName}
                        personBName={personBName}
                        settings={settings}
                        onUpdate={(patch) => updateTemplate(tpl.id, patch)}
                        onRemove={() => removeTemplate(tpl.id)}
                      />
                    ))}
                  </div>
                </SortableContext>
              </div>
            </DndContext>
          ))}
        </div>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 8,
          alignItems: 'center',
          minWidth: 0,
          overflowX: 'auto',
        }}
      >
        <PersonToggle value={person} onChange={(p) => setPerson(p)} compact />
        {person === '공금' && (() => {
          const { bg: chipBg, color: chipColor } = getPersonStyle(defaultSeparatePerson, settings)
          const nameLabel = defaultSeparatePerson === 'A' ? personAName : personBName
          if (!defaultSeparate) {
            return (
              <button
                type="button"
                onClick={() => setDefaultSeparate(true)}
                title="별도 정산"
                style={{
                  height: 26,
                  minHeight: 26,
                  padding: '0 12px',
                  borderRadius: 999,
                  border: '1px solid #e5e7eb',
                  background: '#f9fafb',
                  color: '#9ca3af',
                  cursor: 'pointer',
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
          }
          return (
            <CustomSelect
              compact
              compactAutoWidth
              compactHeight={26}
              options={[personAName, personBName]}
              value={nameLabel}
              onChange={(v) => setDefaultSeparatePerson(v === personAName ? 'A' : 'B')}
              placeholder="선택"
              customBgColor={chipColor}
              customChipBg={chipBg}
              title="별도 정산 담당 선택 · ↗ 누르면 해제"
              compactLeading={<span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>↗</span>}
              onCompactLeadingClick={() => setDefaultSeparate(false)}
              compactCaretColor="#fff"
            />
          )
        })()}
        <CustomSelect
          options={FIXED_CATEGORIES}
          value={category}
          onChange={(v) => setCategory(v)}
          placeholder="카테고리"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="항목명"
          style={{ width: 120, minWidth: 0, flex: 1, ...inputBaseStyle }}
        />
        <div style={{ width: 150, minWidth: 150, flexShrink: 0 }}>
          <AmountInput value={amount} onChange={(v) => setAmount(v)} />
        </div>
        <button
          onClick={handleAdd}
          disabled={!desc}
          style={{
            fontSize: 12,
            padding: '8px 14px',
            borderRadius: 10,
            border: 'none',
            background: !desc ? '#e5e7eb' : PRIMARY,
            color: !desc ? '#9ca3af' : '#fff',
            cursor: !desc ? 'not-allowed' : 'pointer',
            fontWeight: 500,
          }}
        >
          + 항목 추가
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
        지출 계획 화면의 고정지출 카드에 반영됩니다.
      </div>
    </div>
  )
}

const INVEST_CAT_ORDER: Record<string, number> = { 저축: 0, 투자: 1 }

const INVEST_PERSON_ORDER = ['A', 'B'] as const

function formatMaturityDate(ymd: string) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  return `${y}.${m}.${d}`
}

function InvestTemplateSettings() {
  const settings = useAppStore((s) => s.settings)
  const templatesRaw = useInvestTemplateStore((s) => s.templates)
  const addTemplate = useInvestTemplateStore((s) => s.addTemplate)
  const updateTemplate = useInvestTemplateStore((s) => s.updateTemplate)
  const removeTemplate = useInvestTemplateStore((s) => s.removeTemplate)
  const moveTemplateWithinPerson = useInvestTemplateStore((s) => s.moveTemplateWithinPerson)
  const personAName = settings.personAName || '유저1'
  const personBName = settings.personBName || '유저2'

  const [person, setPerson] = useState<Person>('A')
  const [category, setCategory] = useState('저축')
  const [desc, setDesc] = useState('')
  const [amount, setAmount] = useState('')
  const [maturityDate, setMaturityDate] = useState('')
  const addFormDateRef = useRef<HTMLInputElement>(null)

  const handleAdd = () => {
    if (!desc || !amount) return
    addTemplate({
      person,
      category,
      description: desc,
      defaultAmount: Number(amount.replace(/,/g, '')) || 0,
      maturityDate: maturityDate || undefined,
    })
    setDesc('')
    setAmount('')
    setMaturityDate('')
  }

  const grouped = useMemo(() => {
    const acc = templatesRaw.reduce((a, t) => {
      const key = t.person
      if (!a[key]) a[key] = []
      a[key].push(t)
      return a
    }, {} as Record<string, typeof templatesRaw>)
    for (const key of Object.keys(acc)) {
      acc[key].sort((a, b) => (a.personOrder ?? a.order ?? 999) - (b.personOrder ?? b.order ?? 999))
    }
    return acc
  }, [templatesRaw])

  const PERSON_LABELS: Record<string, string> = { A: personAName, B: personBName }
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }))

  return (
    <div style={settingsSectionCardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 14 }}>투자·저축 템플릿</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {INVEST_PERSON_ORDER.filter((p) => (grouped[p]?.length ?? 0) > 0).map((personKey) => (
          <DndContext
            key={personKey}
            sensors={sensors}
            collisionDetection={closestCenter}
            onDragEnd={({ active, over }) => {
              if (over && active.id !== over.id) {
                moveTemplateWithinPerson(String(active.id), String(over.id))
              }
            }}
          >
            <div>
              <GroupHeaderChip
                label={PERSON_LABELS[personKey]}
                total={grouped[personKey]?.reduce((s, t) => s + t.defaultAmount, 0)}
                color={personKey === 'A' ? settings.user1Color : settings.user2Color}
                useUserChipStyle
              />
              <SortableContext items={grouped[personKey]?.map((t) => t.id) ?? []} strategy={verticalListSortingStrategy}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {grouped[personKey]?.map((tpl) => (
                    <SortableInvestRow
                      key={tpl.id}
                      tpl={tpl}
                      onUpdate={(patch) => {
                        if ('category' in patch) updateTemplate(tpl.id, { category: patch.category! })
                        if ('description' in patch) updateTemplate(tpl.id, { description: patch.description! })
                        if ('amount' in patch) updateTemplate(tpl.id, { defaultAmount: patch.amount! })
                        if ('maturityDate' in patch) updateTemplate(tpl.id, { maturityDate: patch.maturityDate })
                      }}
                      onRemove={() => removeTemplate(tpl.id)}
                    />
                  ))}
                </div>
              </SortableContext>
            </div>
          </DndContext>
        ))}
      </div>
      <div
        style={{
          paddingTop: 12,
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          flexWrap: 'nowrap',
          gap: 8,
          alignItems: 'center',
          minWidth: 0,
          overflowX: 'auto',
        }}
      >
        <PersonToggle value={person} onChange={(p) => setPerson(p)} options={['A', 'B']} compact />
        <CustomSelect
          options={INVEST_CATEGORIES}
          value={category}
          onChange={(v) => setCategory(v)}
          placeholder="카테고리"
        />
        <input
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder="항목명"
          style={{ width: 120, minWidth: 0, flex: 1, ...inputBaseStyle }}
        />
        <div style={{ width: 150, minWidth: 150, flexShrink: 0 }}>
          <AmountInput value={amount} onChange={(v) => setAmount(v)} />
        </div>
        <div style={{ flexShrink: 0, display: 'flex', alignItems: 'center', gap: 6, position: 'relative' }}>
          <input
            ref={addFormDateRef}
            type="date"
            value={maturityDate}
            onChange={(e) => setMaturityDate(e.target.value)}
            style={{ position: 'absolute', opacity: 0, width: 1, height: 1, left: 0, top: 0, pointerEvents: 'none' }}
            tabIndex={-1}
          />
          <button
            type="button"
            onClick={() => {
              const el = addFormDateRef.current
              if (el) {
                if (typeof el.showPicker === 'function') el.showPicker()
                else el.click()
              }
            }}
            title="만기일 선택"
            style={{
              ...jellyGhostButton,
              padding: 10,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            📅
          </button>
          {maturityDate && (
            <span style={{ fontSize: 13, color: '#111827', minWidth: 72 }}>
              {formatMaturityDate(maturityDate)}
            </span>
          )}
        </div>
        <button
          onClick={handleAdd}
          disabled={!desc}
          style={{
            ...(desc ? jellyPrimaryButton : jellyPrimaryButtonDisabled),
            fontSize: 12,
            padding: '10px 16px',
          }}
        >
          + 항목 추가
        </button>
      </div>
      <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
        지출 계획 화면의 투자·저축 카드 기본값으로 사용됩니다.
      </div>
    </div>
  )
}

function SupabaseStatus() {
  const [saving, setSaving] = useState(false)
  const [saveMessage, setSaveMessage] = useState<{ tone: 'ok' | 'err' | 'hint'; text: string } | null>(null)

  const handleSaveAll = async () => {
    setSaveMessage(null)
    setSaving(true)
    try {
      const res = await saveAllToSupabase()
      if (!res.ok) {
        setSaveMessage({ tone: 'err', text: res.message })
        return
      }
      if (res.snapshotOk) {
        setSaveMessage({ tone: 'ok', text: 'Supabase에 반영했습니다. (DB 테이블 + 앱 로컬 스냅샷)' })
      } else {
        setSaveMessage({
          tone: 'hint',
          text:
            res.snapshotHint ??
            'DB 테이블(incomes 등)은 반영되었습니다. 앱 전체 스냅샷은 supabase-migration-app-snapshot.sql 적용 후 다시 시도해 주세요.',
        })
      }
    } finally {
      setSaving(false)
    }
  }

  return (
    <div style={settingsSectionCardStyle}>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#111827', marginBottom: 8 }}>Supabase</div>
      <div style={{ fontSize: 13, color: isSupabaseConfigured ? '#374151' : '#6b7280', lineHeight: 1.55, marginBottom: 12 }}>
        {isSupabaseConfigured ? (
          <>
            연결됨. 일상적인 입력은 이 기기(로컬)에만 저장되며,{' '}
            <strong style={{ color: '#111827' }}>전체 저장하기</strong>를 눌렀을 때만 Supabase에 업로드됩니다. 클라우드 동기화는{' '}
            <Link to="/account" style={{ color: PRIMARY, fontWeight: 600 }}>
              계정
            </Link>
            에서 <strong style={{ color: '#111827' }}>가계 아이디(16자)로 맞춘 뒤</strong> 가능합니다. (Supabase Anonymous
            필요) 가계에 안 들어가 있으면 로컬 전용과 같습니다.
          </>
        ) : (
          '.env에 VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY를 설정한 뒤 전체 저장하기로 클라우드에 반영할 수 있습니다.'
        )}
      </div>
      <button
        type="button"
        disabled={!isSupabaseConfigured || saving}
        onClick={handleSaveAll}
        style={{
          padding: '10px 18px',
          borderRadius: 10,
          border: 'none',
          background: !isSupabaseConfigured || saving ? '#e5e7eb' : PRIMARY,
          color: !isSupabaseConfigured || saving ? '#9ca3af' : '#fff',
          fontSize: 14,
          fontWeight: 600,
          cursor: !isSupabaseConfigured || saving ? 'not-allowed' : 'pointer',
        }}
      >
        {saving ? '저장 중…' : '전체 저장하기'}
      </button>
      {saveMessage ? (
        <div
          style={{
            marginTop: 10,
            fontSize: 13,
            color: saveMessage.tone === 'err' ? '#b91c1c' : saveMessage.tone === 'ok' ? '#059669' : '#92400e',
            lineHeight: 1.5,
          }}
        >
          {saveMessage.text}
        </div>
      ) : null}
    </div>
  )
}

export function SettingsPage() {
  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ margin: 0, fontSize: 20, fontWeight: 600, color: '#111827', marginBottom: 18, letterSpacing: '-0.02em' }}>
        설정
      </h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <UserSettings />
        <SharedLivingCostSettings />
        <FixedTemplateSettings />
        <InvestTemplateSettings />
        <SupabaseStatus />
      </div>
    </div>
  )
}
