import React, { useState, useEffect, useMemo, useRef } from 'react'
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from '@dnd-kit/core'
import { SortableContext, useSortable, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { useAppStore, YEAR_PICKER_MIN, DEFAULT_FIXED_CATEGORIES } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { UserChipColorSelect } from '@/components/UserChipColorSelect'
import { PersonToggle, getPersonStyle } from '@/components/PersonUI'
import { AmountInput } from '@/components/AmountInput'
import { DaySelect } from '@/components/DaySelect'
import { CustomSelect } from '@/components/CustomSelect'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import { FixedExpenseRow } from '@/components/FixedExpenseRow'
import { InvestRow } from '@/components/InvestRow'
import { GroupHeaderChip } from '@/components/GroupHeaderChip'
import { Modal } from '@/components/Modal'
import { MobileSnackbar } from '@/components/MobileSnackbar'
import { GitHubSyncPanel } from '@/features/sync/GitHubSyncPanel'
import {
  inputBaseStyle,
  CATEGORY_SELECT_TRIGGER_WIDTH,
  PRIMARY,
  PRIMARY_LIGHT,
  settingsSectionCardWithBleedTitleStyle,
  settingsSectionTitleWrapForViewport,
  settingsTemplateGroupHeaderForViewport,
  pageTitleH1Style,
  settingsTemplateDeleteButtonStyle,
  settingsTemplateAddItemButtonBase,
  SETTINGS_TEMPLATE_ROW_HEIGHT,
} from '@/styles/formControls'
import { JELLY } from '@/styles/jellyGlass'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'
import { downloadYearBudgetExcel } from '@/lib/yearExcelExport'
import type { Person } from '@/types'
import type { FixedTemplate, InvestTemplate } from '@/types'

const INVEST_CATEGORIES = ['저축', '투자']
const PERSON_ORDER = ['공금', 'A', 'B'] as const

/** 지출 계획 고정지출 추가 모달과 동일 높이(별도 정산 행) */
const MODAL_SEPARATE_CHIP_H = 26

function formatInvestMaturityLabel(ymd: string) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  return `${y}.${m}.${d}`
}

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
              borderRadius: JELLY.radiusControl,
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
              borderRadius: JELLY.radiusControl,
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
  const narrow = useNarrowLayout()
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [draft, setDraft] = useState(settings)
  const [toastMsg, setToastMsg] = useState<string | null>(null)

  useEffect(() => {
    setDraft(settings)
  }, [settings.personAName, settings.personBName, settings.personAIncome, settings.personBIncome, settings.personAIncomeDay, settings.personBIncomeDay, settings.user1Color, settings.user2Color])

  useEffect(() => {
    if (!toastMsg || narrow) return
    const t = setTimeout(() => setToastMsg(null), 2000)
    return () => clearTimeout(t)
  }, [toastMsg, narrow])

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
    <div style={settingsSectionCardWithBleedTitleStyle}>
      <div style={settingsSectionTitleWrapForViewport(narrow)}>
        <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>유저 설정</div>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 24 }}>
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
            borderRadius: JELLY.radiusControl,
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
    {narrow && toastMsg ? (
      <MobileSnackbar open tone="ok" text={toastMsg} durationMs={2400} onClose={() => setToastMsg(null)} />
    ) : !narrow && toastMsg ? (
      <div
        style={{
          position: 'fixed',
          top: 24,
          left: '50%',
          transform: 'translateX(-50%)',
          padding: '12px 20px',
          background: '#111827',
          color: '#fff',
          borderRadius: JELLY.radiusControl,
          fontSize: 14,
          fontWeight: 500,
          zIndex: 2000,
          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
        }}
      >
        {toastMsg}
      </div>
    ) : null}
    </>
  )
}

const RATIO_OPTIONS = [
  { value: '50:50' as const, label: '50:50' },
  { value: 'income' as const, label: '수입 %에 따라' },
  { value: 'custom' as const, label: '사용자 설정에 따라' },
]

function SharedLivingCostSettings() {
  const narrow = useNarrowLayout()
  const settings = useAppStore((s) => s.settings)
  const updateSettings = useAppStore((s) => s.updateSettings)
  const [ratioFocus, setRatioFocus] = useState<string | null>(null)

  return (
    <div style={settingsSectionCardWithBleedTitleStyle}>
      <div style={settingsSectionTitleWrapForViewport(narrow)}>
        <div style={{ fontSize: 15, fontWeight: 700, color: JELLY.text }}>공동 생활비</div>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: JELLY.textMuted }}>월 공동 생활비 (원)</div>
          <AmountInput
            value={String(settings.sharedLivingCost ?? 0)}
            onChange={(v) => updateSettings({ sharedLivingCost: Number(v.replace(/,/g, '')) || 0 })}
          />
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 4, color: JELLY.textMuted }}>
            공동 생활비 정산 사이클 시작일
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
            <div style={{ minWidth: 100 }}>
              <DaySelect
                value={settings.sharedExpenseCycleStartDay ?? 1}
                onChange={(v) => updateSettings({ sharedExpenseCycleStartDay: v ?? 1 })}
              />
            </div>
            <div style={{ fontSize: 12, color: '#6b7280' }}>
              매월 <strong>{settings.sharedExpenseCycleStartDay ?? 1}일</strong>부터 다음 달{' '}
              <strong>
                {(() => {
                  const sd = settings.sharedExpenseCycleStartDay ?? 1
                  return sd <= 1 ? '말일' : `${sd - 1}일`
                })()}
              </strong>
              까지가 한 사이클
            </div>
          </div>
        </div>
        <div>
          <div style={{ fontSize: 12, marginBottom: 8, color: JELLY.textMuted }}>분담 비율</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {RATIO_OPTIONS.map((opt) => {
              const checked = (settings.sharedLivingCostRatioMode ?? '50:50') === opt.value
              const focused = ratioFocus === opt.value
              return (
                <label
                  key={opt.value}
                  style={{
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '10px 14px',
                    borderRadius: JELLY.radiusControl,
                    border: checked ? `1.5px solid ${PRIMARY}` : JELLY.innerBorderSoft,
                    background: checked
                      ? 'linear-gradient(180deg, rgba(224, 242, 254, 0.5) 0%, rgba(186, 230, 253, 0.28) 100%)'
                      : 'rgba(255, 255, 255, 0.22)',
                    backdropFilter: JELLY.blur,
                    WebkitBackdropFilter: JELLY.blur,
                    cursor: 'pointer',
                    boxSizing: 'border-box',
                    boxShadow: focused
                      ? '0 0 0 2px rgba(14, 165, 233, 0.45), 0 4px 14px rgba(14, 165, 233, 0.1)'
                      : checked
                        ? 'inset 0 1px 0 rgba(255,255,255,0.55), 0 4px 12px rgba(14, 165, 233, 0.08)'
                        : 'inset 0 1px 0 rgba(255,255,255,0.35)',
                    transition: 'border 0.15s ease, background 0.15s ease, box-shadow 0.15s ease',
                  }}
                >
                  <input
                    type="radio"
                    name="sharedRatio"
                    checked={checked}
                    onChange={() => updateSettings({ sharedLivingCostRatioMode: opt.value })}
                    onFocus={() => setRatioFocus(opt.value)}
                    onBlur={() => setRatioFocus(null)}
                    style={{
                      position: 'absolute',
                      width: 1,
                      height: 1,
                      margin: -1,
                      padding: 0,
                      overflow: 'hidden',
                      clip: 'rect(0, 0, 0, 0)',
                      whiteSpace: 'nowrap',
                      border: 0,
                    }}
                  />
                  <span
                    aria-hidden
                    style={{
                      width: 18,
                      height: 18,
                      borderRadius: '50%',
                      flexShrink: 0,
                      border: `2px solid ${checked ? PRIMARY : 'rgba(148, 163, 184, 0.55)'}`,
                      background: checked ? PRIMARY : 'rgba(255, 255, 255, 0.45)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      boxShadow: checked ? 'inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
                    }}
                  >
                    {checked ? (
                      <span
                        style={{
                          width: 7,
                          height: 7,
                          borderRadius: '50%',
                          background: '#fff',
                          boxShadow: '0 1px 2px rgba(15, 23, 42, 0.2)',
                        }}
                      />
                    ) : null}
                  </span>
                  <span
                    style={{
                      fontSize: 13,
                      fontWeight: checked ? 600 : 500,
                      color: JELLY.text,
                      lineHeight: 1.35,
                    }}
                  >
                    {opt.label}
                  </span>
                </label>
              )
            })}
          </div>
          {(settings.sharedLivingCostRatioMode ?? '50:50') === 'custom' && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                marginTop: 10,
                padding: '10px 12px',
                borderRadius: JELLY.radiusControl,
                border: JELLY.innerBorderSoft,
                background: 'rgba(255, 255, 255, 0.18)',
                backdropFilter: JELLY.blur,
                WebkitBackdropFilter: JELLY.blur,
              }}
            >
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
              <span style={{ fontSize: 13, color: JELLY.textMuted, fontWeight: 600 }}>:</span>
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

function CategorySettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const updateSettings = useAppStore((s) => s.updateSettings)
  const categories = useAppStore((s) => s.settings.fixedCategories) ?? DEFAULT_FIXED_CATEGORIES

  const [newCat, setNewCat] = useState('')
  const [editingIdx, setEditingIdx] = useState<number | null>(null)
  const [editValue, setEditValue] = useState('')
  const [error, setError] = useState<string | null>(null)

  // 드래그앤드롭 상태 (native HTML5)
  const [draggingIdx, setDraggingIdx] = useState<number | null>(null)
  const [dragOverIdx, setDragOverIdx] = useState<number | null>(null)

  const updateCategories = (next: string[]) => updateSettings({ fixedCategories: next })

  const handleAdd = () => {
    const name = newCat.trim()
    if (!name) return
    if (categories.includes(name)) {
      setError(`'${name}' 카테고리가 이미 존재합니다`)
      return
    }
    updateCategories([...categories, name])
    setError(null)
    setNewCat('')
  }

  const startEdit = (idx: number) => {
    setEditingIdx(idx)
    setEditValue(categories[idx])
    setError(null)
  }

  const commitEdit = () => {
    if (editingIdx == null) return
    const oldName = categories[editingIdx]
    const newVal = editValue.trim()
    if (!newVal || oldName === newVal) {
      setEditingIdx(null)
      return
    }
    if (categories.includes(newVal)) {
      setError(`'${newVal}' 카테고리가 이미 존재합니다`)
      return
    }
    const next = [...categories]
    next[editingIdx] = newVal
    updateCategories(next)
    setError(null)
    setEditingIdx(null)
  }

  const handleDelete = (idx: number) => {
    const name = categories[idx]
    if (!window.confirm(`'${name}' 카테고리를 삭제하시겠습니까?`)) return
    updateCategories(categories.filter((_, i) => i !== idx))
  }

  // 드래그앤드롭 핸들러 (native)
  const handleDragStart = (idx: number) => (e: React.DragEvent) => {
    setDraggingIdx(idx)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(idx))
  }
  const handleDragOver = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    if (draggingIdx == null || draggingIdx === idx) return
    setDragOverIdx(idx)
  }
  const handleDragLeave = () => setDragOverIdx(null)
  const handleDrop = (idx: number) => (e: React.DragEvent) => {
    e.preventDefault()
    if (draggingIdx == null || draggingIdx === idx) {
      setDraggingIdx(null)
      setDragOverIdx(null)
      return
    }
    const next = [...categories]
    const [moved] = next.splice(draggingIdx, 1)
    next.splice(idx, 0, moved)
    updateCategories(next)
    setDraggingIdx(null)
    setDragOverIdx(null)
  }
  const handleDragEnd = () => {
    setDraggingIdx(null)
    setDragOverIdx(null)
  }

  return (
    <Modal open={open} title="카테고리 수정" onClose={onClose}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {/* 카테고리 리스트 (카드 형태) */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'column',
            gap: 8,
            maxHeight: 400,
            overflowY: 'auto',
            padding: '2px',
          }}
        >
          {categories.length === 0 ? (
            <div
              style={{
                padding: 16,
                textAlign: 'center',
                color: '#9ca3af',
                fontSize: 12,
                background: '#fff',
                borderRadius: 12,
                border: '1px solid #e5e7eb',
              }}
            >
              카테고리가 없습니다. 아래에서 추가해주세요.
            </div>
          ) : (
            categories.map((cat, idx) => {
              const isEditing = editingIdx === idx
              const isDragging = draggingIdx === idx
              const isDragOver = dragOverIdx === idx
              return (
                <div key={`${cat}-${idx}`}>
                  <div
                    draggable={!isEditing}
                    onDragStart={handleDragStart(idx)}
                    onDragOver={handleDragOver(idx)}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop(idx)}
                    onDragEnd={handleDragEnd}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '12px 14px',
                      background: isEditing
                        ? 'rgba(79, 140, 255, 0.04)'
                        : isDragOver
                          ? 'rgba(79, 140, 255, 0.08)'
                          : '#fff',
                      opacity: isDragging ? 0.4 : 1,
                      cursor: isEditing ? 'auto' : 'grab',
                      transition: 'background 0.15s ease, border-color 0.15s ease, box-shadow 0.15s ease',
                      borderRadius: 12,
                      border: `1px solid ${isDragOver ? PRIMARY : '#e5e7eb'}`,
                      boxShadow: isDragging
                        ? '0 4px 12px rgba(79, 140, 255, 0.15)'
                        : '0 1px 2px rgba(0,0,0,0.03)',
                    }}
                  >
                    {/* 드래그 핸들 */}
                    <div
                      role="button"
                      aria-roledescription="sortable"
                      title="드래그하여 순서 변경"
                      aria-hidden
                      style={{
                        flexShrink: 0,
                        padding: '4px 2px',
                        cursor: isEditing ? 'auto' : 'grab',
                        color: '#d1d5db',
                        fontSize: 16,
                        lineHeight: 1,
                        userSelect: 'none',
                        fontWeight: 700,
                      }}
                    >
                      ⋮
                    </div>

                    {/* 카테고리 이름 (텍스트만 - 클릭 시 이름 수정) */}
                    {!isEditing && (
                      <div
                        onClick={() => startEdit(idx)}
                        title="클릭하여 이름 수정"
                        style={{
                          flexShrink: 0,
                          fontSize: 14,
                          fontWeight: 600,
                          color: JELLY.text,
                          padding: '4px 4px',
                          whiteSpace: 'nowrap',
                          maxWidth: 200,
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          cursor: 'pointer',
                        }}
                      >
                        {cat}
                      </div>
                    )}

                    {/* 이름 편집 input (편집 중) 또는 spacer */}
                    {isEditing ? (
                      <input
                        autoFocus
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onBlur={commitEdit}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') commitEdit()
                          if (e.key === 'Escape') setEditingIdx(null)
                        }}
                        style={{
                          flex: 1,
                          height: 32,
                          padding: '0 10px',
                          borderRadius: 6,
                          border: `1.5px solid ${PRIMARY}`,
                          fontSize: 13,
                          outline: 'none',
                          background: '#fff',
                          fontFamily: 'inherit',
                        }}
                      />
                    ) : (
                      <div style={{ flex: 1 }} />
                    )}

                    {/* 삭제 버튼 (항상 우측 끝) */}
                    <button
                      type="button"
                      onClick={() => handleDelete(idx)}
                      style={{
                        flexShrink: 0,
                        padding: '4px 10px',
                        borderRadius: 6,
                        border: '1px solid #fca5a5',
                        background: '#fff',
                        color: '#ef4444',
                        fontSize: 12,
                        cursor: 'pointer',
                      }}
                    >
                      삭제
                    </button>
                  </div>
                </div>
              )
            })
          )}
        </div>

        {/* 새 카테고리 추가 */}
        <div style={{ display: 'flex', gap: 8 }}>
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            placeholder="새 카테고리 이름 (예: 보험)"
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            style={{
              flex: 1,
              height: 40,
              padding: '0 12px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              fontSize: 13,
              outline: 'none',
              boxSizing: 'border-box',
              fontFamily: 'inherit',
              background: '#fff',
              color: JELLY.text,
            }}
          />
          <button
            type="button"
            onClick={handleAdd}
            style={{
              height: 40,
              padding: '0 16px',
              borderRadius: JELLY.radiusControl,
              border: 'none',
              background: newCat.trim() ? PRIMARY : '#e5e7eb',
              color: newCat.trim() ? '#fff' : '#9ca3af',
              fontSize: 13,
              fontWeight: 600,
              cursor: newCat.trim() ? 'pointer' : 'default',
              flexShrink: 0,
            }}
          >
            + 추가
          </button>
        </div>

        {error && (
          <div
            style={{
              padding: '8px 12px',
              borderRadius: 6,
              background: '#fee2e2',
              color: '#991b1b',
              fontSize: 12,
              border: '1px solid #fca5a5',
            }}
          >
            {error}
          </div>
        )}
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 18 }}>
        <button
          onClick={onClose}
          style={{
            padding: '8px 16px',
            borderRadius: 8,
            border: 'none',
            background: PRIMARY,
            color: '#fff',
            fontSize: 13,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          완료
        </button>
      </div>
    </Modal>
  )
}

function FixedTemplateSettings() {
  const narrow = useNarrowLayout()
  const settings = useAppStore((s) => s.settings)
  const fixedCategories = settings.fixedCategories ?? DEFAULT_FIXED_CATEGORIES
  const templatesRaw = useFixedTemplateStore((s) => s.templates)
  const addTemplate = useFixedTemplateStore((s) => s.addTemplate)
  const updateTemplate = useFixedTemplateStore((s) => s.updateTemplate)
  const removeTemplate = useFixedTemplateStore((s) => s.removeTemplate)
  const moveTemplateWithinPerson = useFixedTemplateStore((s) => s.moveTemplateWithinPerson)
  const personAName = settings.personAName || '유저1'
  const personBName = settings.personBName || '유저2'
  const PERSON_LABELS: Record<string, string> = { 공금: '공금', A: personAName, B: personBName }

  const [fixedAddForm, setFixedAddForm] = useState<{
    person: Person
    category: string
    description: string
    amount: string
    isSeparate: boolean
    separatePerson: 'A' | 'B'
    payDay?: number
  }>({
    person: '공금',
    category: '관리비',
    description: '',
    amount: '',
    isSeparate: false,
    separatePerson: 'A',
  })
  const [addFixedOpen, setAddFixedOpen] = useState(false)
  const [categoryModalOpen, setCategoryModalOpen] = useState(false)

  const resetFixedAddForm = () => {
    setFixedAddForm({
      person: '공금',
      category: '관리비',
      description: '',
      amount: '',
      isSeparate: false,
      separatePerson: 'A',
      payDay: undefined,
    })
  }

  const handleFixedAdd = () => {
    const { person: planPerson, description, amount, category, isSeparate, separatePerson, payDay } = fixedAddForm
    if (!description || !amount) return
    const sepPersonResolved =
      isSeparate && planPerson === '공금'
        ? separatePerson
        : planPerson === 'A' || planPerson === 'B'
          ? planPerson
          : 'A'
    addTemplate({
      person: planPerson,
      category: category || '기타',
      description,
      defaultAmount: Number(amount.replace(/,/g, '')) || 0,
      defaultSeparate: isSeparate,
      defaultSeparatePerson: isSeparate ? sepPersonResolved : undefined,
      payDay,
    })
    resetFixedAddForm()
    setAddFixedOpen(false)
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
    <div style={settingsSectionCardWithBleedTitleStyle}>
      <div style={settingsSectionTitleWrapForViewport(narrow)}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 8,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>고정지출 템플릿</div>
          <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
            <button
              type="button"
              onClick={() => setCategoryModalOpen(true)}
              style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: JELLY.radiusControl,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              카테고리 수정
            </button>
            <button
              type="button"
              onClick={() => {
                resetFixedAddForm()
                setAddFixedOpen(true)
              }}
              style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: JELLY.radiusControl,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                cursor: 'pointer',
                flexShrink: 0,
              }}
            >
              + 항목 추가
            </button>
          </div>
        </div>
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
                <div style={settingsTemplateGroupHeaderForViewport(narrow)}>
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
                </div>
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
      <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
        지출 계획 화면의 고정지출 카드에 반영됩니다.
      </div>

      <Modal
        open={addFixedOpen}
        title="고정지출 항목 추가"
        onClose={() => {
          setAddFixedOpen(false)
          resetFixedAddForm()
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>구분</div>
            <PersonToggle
              value={fixedAddForm.person}
              onChange={(p) => {
                // 구분에 따라 별도 정산 자동 설정
                if (p === '공금') {
                  // 공금 선택: 별도 정산 가능 (선택지 유지)
                  setFixedAddForm((f) => ({ ...f, person: p }))
                } else {
                  // 승윤 또는 경은 선택: 별도 정산 해제, separatePerson을 현재 person으로 설정
                  setFixedAddForm((f) => ({
                    ...f,
                    person: p,
                    isSeparate: false,
                    separatePerson: p,
                  }))
                }
              }}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리</div>
              <CustomSelect
                options={fixedCategories}
                value={fixedAddForm.category}
                onChange={(v) => setFixedAddForm((f) => ({ ...f, category: v }))}
                placeholder="카테고리 선택"
                triggerWidth={CATEGORY_SELECT_TRIGGER_WIDTH}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>항목명</div>
              <input
                value={fixedAddForm.description}
                onChange={(e) => setFixedAddForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="예: 관리비"
                style={{ width: '100%', ...inputBaseStyle }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: 0, width: 80 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>입금일</div>
              <DaySelect
                value={fixedAddForm.payDay}
                onChange={(v) => setFixedAddForm((f) => ({ ...f, payDay: v }))}
                width={80}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>금액</div>
              <AmountInput
                value={fixedAddForm.amount}
                onChange={(v) => setFixedAddForm((f) => ({ ...f, amount: v }))}
              />
            </div>
          </div>
          {(() => {
            const sepSlot = fixedAddForm.separatePerson ?? 'A'
            const { bg: sepChipBg, color: sepChipColor } = getPersonStyle(sepSlot, settings)
            const sepNameLabel = sepSlot === 'A' ? personAName : personBName
            const inactiveSeparateBtnStyle = {
              height: MODAL_SEPARATE_CHIP_H,
              minHeight: MODAL_SEPARATE_CHIP_H,
              padding: '0 12px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              color: '#9ca3af',
              cursor: 'pointer' as const,
              display: 'inline-flex' as const,
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 12,
              fontWeight: 700 as const,
              flexShrink: 0,
              boxSizing: 'border-box' as const,
              fontFamily: 'inherit',
            }
            const separateCaption = (
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: JELLY.text }}>별도 정산으로 등록</div>
                <div style={{ fontSize: 11, color: '#6b7280', marginTop: 2 }}>최종 정산에서만 반영됩니다.</div>
              </div>
            )
            return (
              <div
                style={{
                  marginTop: 4,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 8,
                  padding: '10px 12px',
                  borderRadius: JELLY.radiusControl,
                  background: '#f9fafb',
                  minWidth: 0,
                }}
              >
                {!fixedAddForm.isSeparate ? (
                  <>
                    <button
                      type="button"
                      title="별도 정산"
                      onClick={() => setFixedAddForm((f) => ({ ...f, isSeparate: true }))}
                      style={inactiveSeparateBtnStyle}
                    >
                      ↗
                    </button>
                    {separateCaption}
                  </>
                ) : fixedAddForm.person === '공금' ? (
                  <>
                    <CustomSelect
                      compact
                      compactAutoWidth
                      options={[personAName, personBName]}
                      value={fixedAddForm.separatePerson === 'A' ? personAName : personBName}
                      onChange={(v) =>
                        setFixedAddForm((f) => ({ ...f, separatePerson: v === personAName ? 'A' : 'B' }))
                      }
                      placeholder="선택"
                      customBgColor={sepChipColor}
                      customChipBg={sepChipBg}
                      compactHeight={MODAL_SEPARATE_CHIP_H}
                      title="별도 정산 담당 선택 · ↗ 누르면 해제"
                      compactLeading={<span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>↗</span>}
                      onCompactLeadingClick={() => setFixedAddForm((f) => ({ ...f, isSeparate: false }))}
                      compactCaretColor="#fff"
                    />
                    {separateCaption}
                  </>
                ) : (
                  <>
                    <div
                      style={{
                        height: MODAL_SEPARATE_CHIP_H,
                        minHeight: MODAL_SEPARATE_CHIP_H,
                        display: 'inline-flex',
                        alignItems: 'center',
                        borderRadius: JELLY.radiusUserChip,
                        border: `1.5px solid ${sepChipColor}`,
                        background: sepChipBg,
                        padding: '0 10px 0 8px',
                        gap: 6,
                        flexShrink: 0,
                        boxSizing: 'border-box',
                      }}
                      title="별도 정산 · ↗ 누르면 해제"
                    >
                      <button
                        type="button"
                        onClick={() => setFixedAddForm((f) => ({ ...f, isSeparate: false }))}
                        style={{
                          padding: 0,
                          border: 'none',
                          background: 'none',
                          cursor: 'pointer',
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
                          color: sepChipColor,
                          fontSize: 12,
                          fontWeight: 700,
                        }}
                      >
                        {sepNameLabel}
                      </span>
                    </div>
                    {separateCaption}
                  </>
                )}
              </div>
            )
          })()}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => {
              setAddFixedOpen(false)
              resetFixedAddForm()
            }}
            style={{
              padding: '8px 14px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              background: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleFixedAdd}
            disabled={!fixedAddForm.description || !fixedAddForm.amount}
            style={{
              padding: '8px 16px',
              borderRadius: JELLY.radiusControl,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: !fixedAddForm.description || !fixedAddForm.amount ? 'not-allowed' : 'pointer',
              background: !fixedAddForm.description || !fixedAddForm.amount ? '#e5e7eb' : '#111827',
              color: !fixedAddForm.description || !fixedAddForm.amount ? '#9ca3af' : '#fff',
            }}
          >
            추가
          </button>
        </div>
      </Modal>

      {/* 카테고리 수정 모달 */}
      <CategorySettingsModal
        open={categoryModalOpen}
        onClose={() => setCategoryModalOpen(false)}
      />
    </div>
  )
}

const INVEST_CAT_ORDER: Record<string, number> = { 저축: 0, 투자: 1 }

const INVEST_PERSON_ORDER = ['A', 'B'] as const

function InvestTemplateSettings() {
  const narrow = useNarrowLayout()
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
  const [addInvestOpen, setAddInvestOpen] = useState(false)

  const resetInvestAddForm = () => {
    setPerson('A')
    setCategory('저축')
    setDesc('')
    setAmount('')
    setMaturityDate('')
  }

  const handleInvestAdd = () => {
    if (!desc || !amount) return
    const cat = INVEST_CATEGORIES.includes(category) ? category : '투자'
    addTemplate({
      person,
      category: cat,
      description: desc,
      defaultAmount: Number(amount.replace(/,/g, '')) || 0,
      maturityDate: maturityDate || undefined,
    })
    resetInvestAddForm()
    setAddInvestOpen(false)
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
    <div style={settingsSectionCardWithBleedTitleStyle}>
      <div style={settingsSectionTitleWrapForViewport(narrow)}>
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 12,
            flexWrap: 'wrap',
          }}
        >
          <div style={{ fontSize: 15, fontWeight: 700, color: '#111827' }}>투자·저축 템플릿</div>
          <button
            type="button"
            onClick={() => {
              resetInvestAddForm()
              setAddInvestOpen(true)
            }}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              cursor: 'pointer',
              flexShrink: 0,
            }}
          >
            + 항목 추가
          </button>
        </div>
      </div>
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
              <div style={settingsTemplateGroupHeaderForViewport(narrow)}>
                <GroupHeaderChip
                  label={PERSON_LABELS[personKey]}
                  total={grouped[personKey]?.reduce((s, t) => s + t.defaultAmount, 0)}
                  color={personKey === 'A' ? settings.user1Color : settings.user2Color}
                  useUserChipStyle
                />
              </div>
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
      <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
        지출 계획 화면의 투자·저축 카드 기본값으로 사용됩니다.
      </div>

      <Modal
        open={addInvestOpen}
        title="투자·저축 추가"
        onClose={() => {
          setAddInvestOpen(false)
          resetInvestAddForm()
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>구분</div>
            <PersonToggle
              value={person}
              onChange={(p) => setPerson(p)}
              options={['A', 'B']}
            />
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리</div>
              <CustomSelect
                options={INVEST_CATEGORIES}
                value={category}
                onChange={(v) => setCategory(v)}
                placeholder="카테고리"
                triggerWidth={CATEGORY_SELECT_TRIGGER_WIDTH}
              />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>항목명</div>
              <input
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder="예: 적금, ETF"
                style={{ width: '100%', ...inputBaseStyle }}
              />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
            <div style={{ flex: '0 0 auto' }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>만기일 (선택)</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
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
                    padding: '8px 12px',
                    border: '1px solid #e5e7eb',
                    borderRadius: JELLY.radiusControl,
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                    color: '#6b7280',
                  }}
                >
                  📅 날짜 선택
                </button>
                {maturityDate && (
                  <span style={{ fontSize: 13, color: '#111827' }}>{formatInvestMaturityLabel(maturityDate)}</span>
                )}
                {maturityDate && (
                  <button
                    type="button"
                    onClick={() => setMaturityDate('')}
                    style={{
                      fontSize: 12,
                      padding: '4px 8px',
                      borderRadius: JELLY.radiusControl,
                      border: '1px solid #e5e7eb',
                      background: '#f9fafb',
                      cursor: 'pointer',
                      color: '#6b7280',
                    }}
                  >
                    지우기
                  </button>
                )}
              </div>
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12, marginBottom: 4 }}>금액</div>
              <AmountInput value={amount} onChange={(v) => setAmount(v)} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => {
              setAddInvestOpen(false)
              resetInvestAddForm()
            }}
            style={{
              padding: '8px 14px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              background: '#fff',
              fontSize: 13,
              cursor: 'pointer',
            }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleInvestAdd}
            disabled={!desc || !amount}
            style={{
              padding: '8px 16px',
              borderRadius: JELLY.radiusControl,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: !desc || !amount ? 'not-allowed' : 'pointer',
              background: !desc || !amount ? '#e5e7eb' : PRIMARY,
              color: !desc || !amount ? '#9ca3af' : '#fff',
            }}
          >
            추가
          </button>
        </div>
      </Modal>
    </div>
  )
}

function YearExcelExportSection() {
  const narrow = useNarrowLayout()
  const currentYearMonth = useAppStore((s) => s.currentYearMonth)
  const defaultYear = Number(String(currentYearMonth).split('-')[0]) || YEAR_PICKER_MIN
  const [exportYear, setExportYear] = useState(defaultYear)
  const [exporting, setExporting] = useState(false)
  const [exportErr, setExportErr] = useState<string | null>(null)

  return (
    <div style={settingsSectionCardWithBleedTitleStyle}>
      <div style={settingsSectionTitleWrapForViewport(narrow)}>
        <div style={{ fontSize: 15, fontWeight: 700, color: JELLY.text }}>엑셀보내기</div>
      </div>
      <p style={{ fontSize: 13, color: '#4b5563', lineHeight: 1.55, margin: '12px 0 12px' }}>
        선택한 연도의 수입·고정·별도·투자·정산 스냅샷을 한 파일로 받습니다. 맨 앞에 공통 설정 시트가 붙고,{' '}
        <strong style={{ color: '#111827' }}>데이터가 있는 달만</strong> 월별 시트가 추가됩니다.
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: JELLY.text }}>
          <span style={{ color: JELLY.textMuted }}>연도</span>
          <YearSelectDropdown value={exportYear} onChange={setExportYear} variant="light" />
        </div>
        <button
          type="button"
          disabled={exporting}
          onClick={() => {
            setExportErr(null)
            setExporting(true)
            void (async () => {
              try {
                // GitHub에서 최신 데이터 Pull
                const { GitHubDataSync } = await import('@/services/github-sync')
                const config = GitHubDataSync.loadConfig()
                if (config) {
                  const sync = new GitHubDataSync(config)
                  await sync.pull()
                }
                // Pull 완료 후 엑셀 다운로드
                await downloadYearBudgetExcel(exportYear)
              } catch (e) {
                setExportErr(e instanceof Error ? e.message : String(e))
              } finally {
                setExporting(false)
              }
            })()
          }}
          style={{
            padding: '10px 18px',
            borderRadius: JELLY.radiusControl,
            border: `1px solid ${PRIMARY}`,
            background: '#fff',
            color: PRIMARY,
            fontSize: 14,
            fontWeight: 600,
            cursor: exporting ? 'wait' : 'pointer',
          }}
        >
          {exporting ? '만드는 중…' : '엑셀 다운로드'}
        </button>
      </div>
      {exportErr ? (
        <div style={{ marginTop: 10, fontSize: 13, color: '#b91c1c' }}>{exportErr}</div>
      ) : null}
    </div>
  )
}

export function SettingsPage() {
  const narrow = useNarrowLayout()

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 12 }}>설정</h1>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
        <UserSettings />
        <SharedLivingCostSettings />
        <FixedTemplateSettings />
        <InvestTemplateSettings />

        {/* 엑셀 내보내기와 깃허브 동기화를 PC에서만 2단 그리드로 배치 */}
        <div style={{ display: 'grid', gridTemplateColumns: narrow ? '1fr' : '1fr 1fr', gap: 14 }}>
          <YearExcelExportSection />
          <GitHubSyncPanel />
        </div>
      </div>
    </div>
  )
}
