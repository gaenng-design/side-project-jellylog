import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { Person, InvestTemplate } from '@/types'
import { useAppStore, YEAR_PICKER_MIN } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { useIncomes } from '@/hooks/useRepository'
import { MonthPicker } from '@/components/MonthPicker'
import { YearSelectDropdown } from '@/components/YearSelectDropdown'
import {
  inputBaseStyle,
  AMOUNT_INPUT_MIN_WIDTH,
  PRIMARY,
  PRIMARY_LIGHT,
  planRowActionButtonLayout,
  buttonWriteDeleteStyle,
  settingsSectionCardStyle,
  settingsTemplateDeleteButtonStyle,
  allowanceValueColor,
} from '@/styles/formControls'
import { JELLY, jellyCardStyle, jellyPrimaryButton } from '@/styles/jellyGlass'
import { SUB_FIXED_ACCENT, SUB_INVEST_ACCENT } from '@/styles/oklchSubColors'
import { Modal } from '@/components/Modal'
import { PersonBadge, PersonToggle, getPersonStyle } from '@/components/PersonUI'
import { InlineEdit } from '@/components/InlineEdit'
import { AmountInput } from '@/components/AmountInput'
import { CustomSelect } from '@/components/CustomSelect'
import { FixedExpenseRow, type FixedExpenseRowData } from '@/components/FixedExpenseRow'
import { GroupHeaderChip } from '@/components/GroupHeaderChip'
import { InvestRow } from '@/components/InvestRow'
import { DaySelect } from '@/components/DaySelect'
import { calcSettlementSummary, getSharedLivingByPerson } from '@/lib/calcSettlementSummary'
import { computeSeparateExpenseCard5090, payerForSeparateExpenseRow } from '@/lib/separateExpenseSettlement'
import { saveAllToSupabase } from '@/data/saveAllToSupabase'
import { isSupabaseConfigured } from '@/data/supabase'
import { SettlementResultView } from './SettlementResultView'

const fmt = (n: number) => n.toLocaleString('ko-KR') + '원'
const FIXED_CATEGORIES = ['주거', '통신', '보험', '구독', '교통', '식비', '의료', '교육', '문화', '관리비', '기타']
const INVEST_CATEGORIES = ['투자', '저축']
/** 고정지출 그룹 헤더 합계 강조색 */
const FIXED_EXPENSE_SUMMARY_COLOR = SUB_FIXED_ACCENT
/** 투자·저축 그룹 헤더 합계 강조색 */
const INVEST_GROUP_TOGGLE_COLOR = SUB_INVEST_ACCENT

/** Zustand 셀렉터에서 `?? {}` 쓰면 매번 새 참조 → getSnapshot 무한 루프 방지 */
const EMPTY_DEFAULT_SALARY_EXCLUDED: Partial<Record<'A' | 'B', boolean>> = {}

function formatInvestMaturityLabel(ymd: string) {
  if (!ymd) return ''
  const [y, m, d] = ymd.split('-')
  return `${y}.${m}.${d}`
}

type IncomeRow = { id: string; person: Exclude<Person, '공금'>; category: string; description: string; amount: number }
type FixedRow = { id: string; person: Person; category: string; description: string; amount: number; isSeparate?: boolean; separatePerson?: 'A' | 'B'; payDay?: number; isExcluded?: boolean }
type InvestRow = {
  id: string
  person: Person
  category: string
  description: string
  amount: number
  isSeparate?: boolean
  isExcluded?: boolean
  maturityDate?: string
}

/** 정산 결과에서 유저별 투자/저축 행 분리 표시용 (공금 등은 해당 인원에 합산하지 않음) */
function investByCategoryForPerson(rows: InvestRow[], person: 'A' | 'B'): { 투자: number; 저축: number } {
  let 투자 = 0
  let 저축 = 0
  for (const r of rows) {
    if (r.isExcluded) continue
    if (r.person !== person) continue
    if (r.category === '저축') 저축 += r.amount
    else 투자 += r.amount
  }
  return { 투자, 저축 }
}

/** 정산 결과 항목별(연금·비상금 등) 표시: 설명 우선, 없으면 카테고리 */
function investLinesByCategoryForPerson(
  rows: InvestRow[],
  person: 'A' | 'B',
): { 투자: { label: string; amount: number }[]; 저축: { label: string; amount: number }[] } {
  const 투자: { label: string; amount: number }[] = []
  const 저축: { label: string; amount: number }[] = []
  for (const r of rows) {
    if (r.isExcluded) continue
    if (r.person !== person) continue
    const label = (r.description && r.description.trim()) || r.category
    const item = { label, amount: r.amount }
    if (r.category === '저축') 저축.push(item)
    else 투자.push(item)
  }
  return { 투자, 저축 }
}

const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`

/** 템플릿 기본 급여 행(가상 id 또는 DB 급여 행)이면 'A' | 'B', 아니면 null */
function defaultSalaryPersonSlot(row: IncomeRow, defaultAId?: string, defaultBId?: string): 'A' | 'B' | null {
  if (row.category !== '급여' || (row.person !== 'A' && row.person !== 'B')) return null
  if (row.id === 'virtual-a' || (defaultAId != null && row.id === defaultAId)) return 'A'
  if (row.id === 'virtual-b' || (defaultBId != null && row.id === defaultBId)) return 'B'
  return null
}

function SectionCard(props: {
  emoji: string
  title: string
  total: number
  children: React.ReactNode
  right?: React.ReactNode
  /** 헤더 합계 금액 색 (기본: PRIMARY) */
  totalColor?: string
}) {
  const { emoji, title, total, children, right, totalColor } = props
  return (
    <div style={{ ...jellyCardStyle, borderRadius: JELLY.radiusLg, overflow: 'hidden' }}>
      <div
        style={{
          padding: '16px 20px',
          borderBottom: JELLY.innerBorderSoft,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}
      >
        <span style={{ fontSize: 18 }}>{emoji}</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: JELLY.text }}>{title}</span>
        <span style={{ marginLeft: 6, fontWeight: 700, color: totalColor ?? PRIMARY }}>{fmt(total)}</span>
        <div style={{ marginLeft: 'auto' }}>{right}</div>
      </div>
      <div style={{ padding: '8px 8px 10px' }}>{children}</div>
    </div>
  )
}

// ── Income Card ────────────────────────────────────────────────────────────────

function IncomeCard(props: {
  rows: IncomeRow[]
  onAdd: (row: Omit<IncomeRow, 'id'>) => void
  onUpdate: (id: string, patch: Partial<IncomeRow>) => void
  onRemove: (id: string) => void
  useTextFields?: boolean
  defaultSalaryExcluded?: Partial<Record<'A' | 'B', boolean>>
  onToggleDefaultSalaryExcluded?: (person: 'A' | 'B') => void
  defaultAIncomeId?: string
  defaultBIncomeId?: string
}) {
  const {
    rows,
    onAdd,
    onUpdate,
    onRemove,
    useTextFields,
    defaultSalaryExcluded,
    onToggleDefaultSalaryExcluded,
    defaultAIncomeId,
    defaultBIncomeId,
  } = props
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ person: Exclude<Person, '공금'>; category: string; description: string; amount: string }>({
    person: 'A',
    category: '급여',
    description: '',
    amount: '',
  })

  const incomeExcludeBtnStyle = (excluded: boolean) =>
    excluded
      ? {
          ...planRowActionButtonLayout,
          fontSize: 11 as const,
          padding: '6px 8px' as const,
          borderRadius: JELLY.radiusControl,
          border: `1px solid ${PRIMARY}`,
          background: PRIMARY,
          color: '#fff',
          cursor: 'pointer' as const,
        }
      : {
          ...planRowActionButtonLayout,
          fontSize: 11 as const,
          padding: '6px 8px' as const,
          borderRadius: JELLY.radiusControl,
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
          color: '#6b7280',
          cursor: 'pointer' as const,
        }

  const total = rows.reduce((s, r) => {
    const slot = defaultSalaryPersonSlot(r, defaultAIncomeId, defaultBIncomeId)
    if (slot && defaultSalaryExcluded?.[slot]) return s
    return s + r.amount
  }, 0)

  const handleAdd = () => {
    if (!form.description || !form.amount) return
    onAdd({
      person: form.person,
      category: form.category || '기타',
      description: form.description,
      amount: Number(form.amount.replace(/,/g, '')) || 0,
    })
    setForm({ person: 'A', category: '급여', description: '', amount: '' })
    setOpen(false)
  }

  const updateRow = (id: string, patch: Partial<IncomeRow>) => onUpdate(id, patch)
  const removeRow = (id: string) => onRemove(id)

  return (
    <>
      <SectionCard
        emoji="💵"
        title="수입"
        total={total}
        right={
          <button
            type="button"
            onClick={() => setOpen(true)}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              cursor: 'pointer',
            }}
          >
            + 항목 추가
          </button>
        }
      >
        {rows.length === 0 && (
          <div style={{ padding: 18, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
            수입 항목을 추가해주세요.
          </div>
        )}
        {rows.map((row, idx) => {
          const salarySlot = defaultSalaryPersonSlot(row, defaultAIncomeId, defaultBIncomeId)
          const isDefaultSalary = salarySlot != null
          const excluded = !!(salarySlot && defaultSalaryExcluded?.[salarySlot])
          return (
            <div
              key={row.id}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '8px 10px',
                borderBottom: idx === rows.length - 1 ? 'none' : '1px solid #f3f4f6',
                minWidth: 0,
                opacity: excluded ? 0.6 : 1,
              }}
            >
              <span style={{ flexShrink: 0 }}>
                <PersonBadge person={row.person} />
              </span>
              <span style={{ minWidth: 80, flexShrink: 0, fontSize: 12, color: '#6b7280' }}>{row.category}</span>
              {!isDefaultSalary && (
                <span style={{ flex: 1, minWidth: 0, overflow: 'hidden', fontSize: 13, color: '#111827' }}>
                  {useTextFields ? (
                    <input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, { description: e.target.value })}
                      placeholder="항목명"
                      style={{ ...inputBaseStyle, width: '100%', minWidth: 0 }}
                    />
                  ) : (
                    <InlineEdit
                      value={row.description}
                      onSave={(v) => updateRow(row.id, { description: v })}
                      placeholder="항목명"
                    />
                  )}
                </span>
              )}
              {isDefaultSalary && <span style={{ flex: 1, minWidth: 0 }} />}
              <div style={{ width: 150, minWidth: 150, flexShrink: 0 }}>
                <AmountInput
                  value={String(row.amount)}
                  disabled={excluded}
                  onChange={(v) => {
                    if (excluded) return
                    updateRow(row.id, { amount: Number(String(v).replace(/,/g, '')) || 0 })
                  }}
                />
              </div>
              {isDefaultSalary && salarySlot && onToggleDefaultSalaryExcluded ? (
                <button
                  type="button"
                  onClick={() => onToggleDefaultSalaryExcluded(salarySlot)}
                  style={incomeExcludeBtnStyle(excluded)}
                >
                  {excluded ? '이번달 포함' : '이번달만 제외'}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => removeRow(row.id)}
                  style={{
                    minWidth: 76,
                    flexShrink: 0,
                    fontSize: 12,
                    padding: '6px 0',
                    borderRadius: JELLY.radiusControl,
                    border: '1px solid #e5e7eb',
                    background: '#f9fafb',
                    color: '#6b7280',
                    cursor: 'pointer',
                  }}
                >
                  삭제
                </button>
              )}
            </div>
          )
        })}
      </SectionCard>

      <Modal open={open} title="수입 추가" onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>구분</div>
            <PersonToggle value={form.person} onChange={(p) => setForm({ ...form, person: p as Exclude<Person, '공금'> })} options={['A', 'B']} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리</div>
            <input
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              placeholder="예: 급여, 부수입"
              style={{ width: '100%', ...inputBaseStyle }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>항목명</div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="예: 월급"
              style={{ width: '100%', ...inputBaseStyle }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>금액</div>
            <div style={{ width: 150, minWidth: 150 }}>
              <AmountInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button
            onClick={() => setOpen(false)}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleAdd}
            disabled={!form.description || !form.amount}
            style={{
              padding: '8px 16px',
              borderRadius: JELLY.radiusControl,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: !form.description || !form.amount ? 'not-allowed' : 'pointer',
              background: !form.description || !form.amount ? '#e5e7eb' : PRIMARY,
              color: !form.description || !form.amount ? '#9ca3af' : '#fff',
            }}
          >
            추가
          </button>
        </div>
      </Modal>
    </>
  )
}

// ── Fixed Expense Card ─────────────────────────────────────────────────────────

const FIXED_CAT_ORDER: Record<string, number> = { 주거: 0, 통신: 1, 보험: 2, 구독: 3, 교통: 4, 식비: 5, 의료: 6, 교육: 7, 문화: 8, 관리비: 9, 기타: 10 }

/** FixedExpenseRow 별도 정산 칩과 동일 높이 */
const MODAL_SEPARATE_CHIP_H = 26

/** 카테고리별 보기: 같은 카테고리 안 행 순서 — 공금 → 유저1(A) → 유저2(B) */
const FIXED_ROW_PERSON_RANK: Record<Person, number> = { 공금: 0, A: 1, B: 2 }

function sortFixedRowsByPersonInCategory(list: FixedRow[]): FixedRow[] {
  return [...list].sort(
    (a, b) => (FIXED_ROW_PERSON_RANK[a.person] ?? 9) - (FIXED_ROW_PERSON_RANK[b.person] ?? 9),
  )
}

type FixedCardProps = {
  rows: FixedRow[]
  onAdd: (row: Omit<FixedRow, 'id'>) => void
  onUpdate: (id: string, patch: Partial<FixedRow>) => void
  onRemove: (id: string) => void
  onExcludeThisMonth: (templateId: string) => void
  onUpdateTemplate: (templateId: string, patch: Partial<FixedRow>) => void
  /** 설정에 남아 있는 고정지출 템플릿 id (정산 완료 달에서 스냅샷 전용 행 구분) */
  globalTemplateIds: Set<string>
  planState: 'draft' | 'settled' | 'none'
  onRemoveOrphanSnapshotTemplate: (templateId: string) => void
  useTextFields?: boolean
  sectionEmoji?: string
  sectionTitle?: string
  emptyMessage?: string
  addModalTitle?: string
  /** 별도 지출 등: 행에서 입금일 숨김 */
  showPayDayOnRows?: boolean
  /** 추가 모달에서 입금일 블록 숨김 */
  hidePayDayInModal?: boolean
  /** 별도 지출 카드: 행 앞줄에서 구분(공금/A/B) 편집 */
  leadPlanPersonEditable?: boolean
}

function FixedExpenseCard(props: FixedCardProps) {
  const {
    rows,
    onAdd,
    onUpdate,
    onRemove,
    onExcludeThisMonth,
    onUpdateTemplate,
    globalTemplateIds,
    planState,
    onRemoveOrphanSnapshotTemplate,
    useTextFields,
    sectionEmoji = '🏠',
    sectionTitle = '고정지출',
    emptyMessage = '고정지출 항목을 추가해주세요.',
    addModalTitle = '고정지출 항목 추가',
    showPayDayOnRows = true,
    hidePayDayInModal = false,
    leadPlanPersonEditable = false,
  } = props
  const settings = useAppStore((s) => s.settings)
  const personAName = settings.personAName || '유저1'
  const personBName = settings.personBName || '유저2'
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState<{ person: Person; category: string; description: string; amount: string; isSeparate: boolean; separatePerson: 'A' | 'B'; payDay?: number }>({
    person: '공금',
    category: '관리비',
    description: '',
    amount: '',
    isSeparate: false,
    separatePerson: 'A',
  })

  const total = rows.filter((r) => !r.isExcluded).reduce((s, r) => s + r.amount, 0)
  const grouped = useMemo(() => {
    const map = new Map<string, FixedRow[]>()
    for (const r of rows) {
      const list = map.get(r.category) ?? []
      list.push(r)
      map.set(r.category, list)
    }
    return [...map.entries()]
      .sort((a, b) => (FIXED_CAT_ORDER[a[0]] ?? 99) - (FIXED_CAT_ORDER[b[0]] ?? 99))
      .map(([cat, list]) => [cat, sortFixedRowsByPersonInCategory(list)] as const)
  }, [rows])

  const isTemplate = (id: string) => id.startsWith('ft-tpl-')
  const getTemplateId = (id: string) => id.replace(/^ft-tpl-/, '')

  const updateRow = (id: string, patch: Partial<FixedRow>) => {
    if (isTemplate(id)) onUpdateTemplate(getTemplateId(id), patch)
    else onUpdate(id, patch)
  }

  const handleAdd = () => {
    if (!form.description || !form.amount) return
    const separatePerson = form.isSeparate && form.person === '공금' ? form.separatePerson : (form.person === 'A' || form.person === 'B' ? form.person : 'A')
    onAdd({
      person: form.person,
      category: form.category || '기타',
      description: form.description,
      amount: Number(form.amount.replace(/,/g, '')) || 0,
      isSeparate: form.isSeparate,
      separatePerson: form.isSeparate ? separatePerson : undefined,
      payDay: hidePayDayInModal ? undefined : form.payDay,
    })
    setForm({ person: '공금', category: '관리비', description: '', amount: '', isSeparate: false, separatePerson: 'A' })
    setOpen(false)
  }

  const actionBtnStyle = (excluded: boolean) =>
    excluded
      ? {
          ...planRowActionButtonLayout,
          fontSize: 11 as const,
          padding: '6px 8px' as const,
          borderRadius: JELLY.radiusControl,
          border: `1px solid ${PRIMARY}`,
          background: PRIMARY,
          color: '#fff',
          cursor: 'pointer' as const,
        }
      : {
          ...planRowActionButtonLayout,
          fontSize: 11 as const,
          padding: '6px 8px' as const,
          borderRadius: JELLY.radiusControl,
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
          color: '#6b7280',
          cursor: 'pointer' as const,
        }

  const planRowDeleteButtonStyle = {
    ...planRowActionButtonLayout,
    fontSize: 11,
    padding: '6px 8px',
    borderRadius: JELLY.radiusControl,
    border: '1px solid #fecaca',
    background: '#fef2f2',
    color: '#b91c1c',
    cursor: 'pointer' as const,
  }

  return (
    <>
      <SectionCard
        emoji={sectionEmoji}
        title={sectionTitle}
        total={total}
        totalColor={FIXED_EXPENSE_SUMMARY_COLOR}
        right={
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={() => setOpen(true)}
              style={{
                fontSize: 12,
                padding: '6px 12px',
                borderRadius: JELLY.radiusControl,
                border: '1px solid #e5e7eb',
                background: '#f9fafb',
                cursor: 'pointer',
              }}
            >
              + 항목 추가
            </button>
          </div>
        }
      >
        {rows.length === 0 && (
          <div style={{ padding: 18, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
            {emptyMessage}
          </div>
        )}
        {grouped.map(([cat, list, personKey]) => (
          <div key={cat} style={{ marginBottom: 12 }}>
            {(() => {
              const groupTotal = list.filter((r) => !r.isExcluded).reduce((s, r) => s + r.amount, 0)
              return (
                <GroupHeaderChip
                  label={cat}
                  total={groupTotal}
                  totalColor={FIXED_EXPENSE_SUMMARY_COLOR}
                  {...(personKey
                    ? {
                        color:
                          personKey === '공금'
                            ? '#111827'
                            : personKey === 'A'
                              ? (settings.user1Color ?? '#FFADAD')
                              : (settings.user2Color ?? '#9BF6FF'),
                        useUserChipStyle: personKey !== '공금',
                      }
                    : { color: '#111827' })}
                />
              )
            })()}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {list.map((row) => {
                const isTpl = isTemplate(row.id)
                const tplId = getTemplateId(row.id)
                const isSettledOrphan =
                  planState === 'settled' && isTpl && !globalTemplateIds.has(tplId)
                const useExcludeForTpl = isTpl && !isSettledOrphan
                const excluded = row.isExcluded
                const rowData: FixedExpenseRowData = {
                  id: row.id,
                  person: row.person,
                  category: row.category,
                  description: row.description,
                  amount: row.amount,
                  isSeparate: row.isSeparate,
                  separatePerson: row.separatePerson ?? 'A',
                  payDay: row.payDay,
                  isExcluded: row.isExcluded,
                }
                const actionSlot = (
                  <button
                    type="button"
                    onClick={() => {
                      if (isSettledOrphan) onRemoveOrphanSnapshotTemplate(tplId)
                      else if (isTpl) onExcludeThisMonth(tplId)
                      else onRemove(row.id)
                    }}
                    style={useExcludeForTpl ? actionBtnStyle(excluded) : planRowDeleteButtonStyle}
                  >
                    {useExcludeForTpl ? (excluded ? '이번달 포함' : '이번달만 제외') : '삭제'}
                  </button>
                )
                return (
                  <div key={row.id} style={{ opacity: excluded ? 0.6 : 1 }}>
                    <FixedExpenseRow
                      row={rowData}
                      onUpdate={(patch) => {
                        if ('isExcluded' in patch) updateRow(row.id, { isExcluded: patch.isExcluded })
                        if (!excluded) {
                          if ('person' in patch) {
                            const next: Partial<FixedRow> = { person: patch.person }
                            if ('separatePerson' in patch) next.separatePerson = patch.separatePerson
                            updateRow(row.id, next)
                          }
                          if ('category' in patch) updateRow(row.id, { category: patch.category })
                          if ('description' in patch) updateRow(row.id, { description: patch.description! })
                          if ('amount' in patch) updateRow(row.id, { amount: patch.amount! })
                          if ('isSeparate' in patch) updateRow(row.id, { isSeparate: patch.isSeparate })
                          if ('separatePerson' in patch && !('person' in patch)) {
                            updateRow(row.id, { separatePerson: patch.separatePerson })
                          }
                          if ('payDay' in patch) updateRow(row.id, { payDay: patch.payDay })
                        }
                      }}
                      actionSlot={actionSlot}
                      disabled={excluded}
                      personAName={personAName}
                      personBName={personBName}
                      useTextFields={useTextFields}
                      showSeparatePersonSelect={row.person === '공금'}
                      showPayDay={showPayDayOnRows}
                      planPerson={row.person}
                      categoryViewLeadUserFirst
                      leadPlanPersonEditable={leadPlanPersonEditable}
                    />
                  </div>
                )
              })}
            </div>
          </div>
        ))}
      </SectionCard>

      <Modal open={open} title={addModalTitle} onClose={() => setOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>구분</div>
            <PersonToggle value={form.person} onChange={(p) => setForm({ ...form, person: p as Person })} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리</div>
            <CustomSelect
              options={FIXED_CATEGORIES}
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              placeholder="카테고리 선택"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>항목명</div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="예: 관리비"
              style={{ width: '100%', ...inputBaseStyle }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>금액</div>
            <div style={{ width: 150, minWidth: 150 }}>
              <AmountInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
            </div>
          </div>
          {!hidePayDayInModal && (
            <div>
              <div style={{ fontSize: 12, marginBottom: 4 }}>입금일</div>
              <DaySelect value={form.payDay} onChange={(v) => setForm((f) => ({ ...f, payDay: v }))} />
            </div>
          )}
          {(() => {
            const sepSlot = form.separatePerson ?? 'A'
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
                {!form.isSeparate ? (
                  <>
                    <button
                      type="button"
                      title="별도 정산"
                      onClick={() => setForm((f) => ({ ...f, isSeparate: true }))}
                      style={inactiveSeparateBtnStyle}
                    >
                      ↗
                    </button>
                    {separateCaption}
                  </>
                ) : form.person === '공금' ? (
                  <>
                    <CustomSelect
                      compact
                      compactAutoWidth
                      options={[personAName, personBName]}
                      value={form.separatePerson === 'A' ? personAName : personBName}
                      onChange={(v) =>
                        setForm((f) => ({ ...f, separatePerson: v === personAName ? 'A' : 'B' }))
                      }
                      placeholder="선택"
                      customBgColor={sepChipColor}
                      customChipBg={sepChipBg}
                      compactHeight={MODAL_SEPARATE_CHIP_H}
                      title="별도 정산 담당 선택 · ↗ 누르면 해제"
                      compactLeading={<span style={{ color: '#fff', fontSize: 12, lineHeight: 1 }}>↗</span>}
                      onCompactLeadingClick={() => setForm((f) => ({ ...f, isSeparate: false }))}
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
                        onClick={() => setForm((f) => ({ ...f, isSeparate: false }))}
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
            onClick={() => setOpen(false)}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            onClick={handleAdd}
            disabled={!form.description || !form.amount}
            style={{
              padding: '8px 16px',
              borderRadius: JELLY.radiusControl,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: !form.description || !form.amount ? 'not-allowed' : 'pointer',
              background: !form.description || !form.amount ? '#e5e7eb' : '#111827',
              color: !form.description || !form.amount ? '#9ca3af' : '#fff',
            }}
          >
            추가
          </button>
        </div>
      </Modal>
    </>
  )
}

// ── Invest Card ────────────────────────────────────────────────────────────────

type InvestCardProps = {
  rows: InvestRow[]
  onAdd: (row: Omit<InvestRow, 'id'>) => void
  onUpdate: (id: string, patch: Partial<InvestRow>) => void
  onRemove: (id: string) => void
  onExcludeThisMonth: (templateId: string) => void
  onUpdateTemplate: (templateId: string, patch: Partial<InvestRow>) => void
  globalTemplateIds: Set<string>
  planState: 'draft' | 'settled' | 'none'
  onRemoveOrphanSnapshotTemplate: (templateId: string) => void
}

function InvestCard(props: InvestCardProps) {
  const {
    rows,
    onAdd,
    onUpdate,
    onRemove,
    onExcludeThisMonth,
    onUpdateTemplate,
    globalTemplateIds,
    planState,
    onRemoveOrphanSnapshotTemplate,
  } = props
  const [addOpen, setAddOpen] = useState(false)
  const addFormDateRef = useRef<HTMLInputElement>(null)
  const [form, setForm] = useState<{
    person: Exclude<Person, '공금'>
    category: string
    description: string
    amount: string
    maturityDate: string
  }>({
    person: 'A',
    category: '저축',
    description: '',
    amount: '',
    maturityDate: '',
  })

  const settings = useAppStore((s) => s.settings)
  const total = rows.filter((r) => !r.isExcluded).reduce((s, r) => s + r.amount, 0)
  const grouped = useMemo(() => {
    const map = new Map<string, typeof rows>()
    for (const r of rows) {
      const list = map.get(r.category) ?? []
      list.push(r)
      map.set(r.category, list)
    }
    const catOrder: Record<string, number> = { 저축: 0, 투자: 1 }
    return [...map.entries()]
      .sort((a, b) => (catOrder[a[0]] ?? 99) - (catOrder[b[0]] ?? 99))
      .map(([cat, list]) => [cat, list] as const)
  }, [rows])

  const isTemplate = (id: string) => id.startsWith('inv-tpl-')
  const getTemplateId = (id: string) => id.replace(/^inv-tpl-/, '')

  const updateRow = (id: string, patch: Partial<InvestRow>) => {
    if (isTemplate(id)) onUpdateTemplate(getTemplateId(id), patch)
    else onUpdate(id, patch)
  }

  const removeOrExclude = (id: string) => {
    if (!isTemplate(id)) {
      onRemove(id)
      return
    }
    const tplId = getTemplateId(id)
    if (planState === 'settled' && !globalTemplateIds.has(tplId)) {
      onRemoveOrphanSnapshotTemplate(tplId)
      return
    }
    onExcludeThisMonth(tplId)
  }

  const handleAdd = () => {
    if (!form.description || !form.amount) return
    onAdd({
      person: form.person,
      category: (INVEST_CATEGORIES.includes(form.category) ? form.category : '투자') as '투자' | '저축',
      description: form.description,
      amount: Number(form.amount.replace(/,/g, '')) || 0,
      maturityDate: form.maturityDate || undefined,
    })
    setForm({ person: 'A', category: '저축', description: '', amount: '', maturityDate: '' })
    setAddOpen(false)
  }

  const excludeBtnStyle = (excluded: boolean) =>
    excluded
      ? {
          ...planRowActionButtonLayout,
          fontSize: 11 as const,
          padding: '6px 8px' as const,
          borderRadius: JELLY.radiusControl,
          border: `1px solid ${PRIMARY}`,
          background: PRIMARY,
          color: '#fff',
          cursor: 'pointer' as const,
        }
      : {
          ...planRowActionButtonLayout,
          fontSize: 11 as const,
          padding: '6px 8px' as const,
          borderRadius: JELLY.radiusControl,
          border: '1px solid #e5e7eb',
          background: '#f9fafb',
          color: '#6b7280',
          cursor: 'pointer' as const,
        }

  return (
    <>
    <div style={{ ...settingsSectionCardStyle }}>
      {/* 고정지출 SectionCard 헤더와 동일한 타이틀 행(이모지·제목·합계·구분선) */}
      <div
        style={{
          paddingBottom: 14,
          marginBottom: 14,
          borderBottom: '1px solid #f3f4f6',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          flexWrap: 'wrap',
        }}
      >
        <span style={{ fontSize: 18 }}>📈</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: '#111827' }}>투자·저축</span>
        <span style={{ marginLeft: 6, fontWeight: 700, color: INVEST_GROUP_TOGGLE_COLOR }}>{fmt(total)}</span>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            style={{
              fontSize: 12,
              padding: '6px 12px',
              borderRadius: JELLY.radiusControl,
              border: '1px solid #e5e7eb',
              background: '#f9fafb',
              cursor: 'pointer',
            }}
          >
            + 항목 추가
          </button>
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
        {rows.length === 0 && (
          <div style={{ padding: 18, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
            투자·저축 항목을 추가해주세요.
          </div>
        )}
        {grouped.map(([cat, list]) => {
          const groupTotal = list.filter((r) => !r.isExcluded).reduce((s, r) => s + r.amount, 0)
          return (
            <div key={cat}>
              <GroupHeaderChip
                label={cat}
                total={groupTotal}
                totalColor={INVEST_GROUP_TOGGLE_COLOR}
                color="#111827"
              />
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {list.map((row) => {
                  const isTpl = isTemplate(row.id)
                  const tplId = getTemplateId(row.id)
                  const isSettledOrphan =
                    planState === 'settled' && isTpl && !globalTemplateIds.has(tplId)
                  const useExcludeForTpl = isTpl && !isSettledOrphan
                  const excluded = row.isExcluded
                  const actionSlot = (
                    <button
                      type="button"
                      onClick={() => removeOrExclude(row.id)}
                      style={
                        useExcludeForTpl
                          ? excludeBtnStyle(excluded)
                          : { ...planRowActionButtonLayout, ...settingsTemplateDeleteButtonStyle }
                      }
                    >
                      {useExcludeForTpl ? (excluded ? '이번달 포함' : '이번달만 제외') : '삭제'}
                    </button>
                  )
                  return (
                    <div key={row.id} style={{ opacity: excluded ? 0.6 : 1 }}>
                      <InvestRow
                        row={{
                          id: row.id,
                          category: row.category,
                          description: row.description,
                          amount: row.amount,
                          maturityDate: row.maturityDate,
                        }}
                        compactMaturityDate
                        onUpdate={(patch) => {
                          if (!excluded) {
                            if ('category' in patch) updateRow(row.id, { category: patch.category })
                            if ('description' in patch) updateRow(row.id, { description: patch.description! })
                            if ('amount' in patch) updateRow(row.id, { amount: patch.amount! })
                            if ('maturityDate' in patch) updateRow(row.id, { maturityDate: patch.maturityDate })
                          }
                        }}
                        actionSlot={actionSlot}
                        disabled={excluded}
                      />
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 10, fontSize: 11, color: '#6b7280' }}>
        이 달에만 적용되는 추가 항목은 상단「+ 항목 추가」로 등록할 수 있습니다.
      </div>
    </div>

      <Modal open={addOpen} title="투자·저축 추가" onClose={() => setAddOpen(false)}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>구분</div>
            <PersonToggle value={form.person} onChange={(p) => setForm({ ...form, person: p as Exclude<Person, '공금'> })} options={['A', 'B']} />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>카테고리</div>
            <CustomSelect
              options={INVEST_CATEGORIES}
              value={form.category}
              onChange={(v) => setForm({ ...form, category: v })}
              placeholder="카테고리"
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>항목명</div>
            <input
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="예: 적금, ETF"
              style={{ width: '100%', ...inputBaseStyle }}
            />
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>금액</div>
            <div style={{ width: 150, minWidth: 150 }}>
              <AmountInput value={form.amount} onChange={(v) => setForm({ ...form, amount: v })} />
            </div>
          </div>
          <div>
            <div style={{ fontSize: 12, marginBottom: 4 }}>만기일 (선택)</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', position: 'relative' }}>
              <input
                ref={addFormDateRef}
                type="date"
                value={form.maturityDate}
                onChange={(e) => setForm({ ...form, maturityDate: e.target.value })}
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
              {form.maturityDate && (
                <span style={{ fontSize: 13, color: '#111827' }}>{formatInvestMaturityLabel(form.maturityDate)}</span>
              )}
              {form.maturityDate && (
                <button
                  type="button"
                  onClick={() => setForm({ ...form, maturityDate: '' })}
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
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
          <button
            type="button"
            onClick={() => setAddOpen(false)}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!form.description || !form.amount}
            style={{
              padding: '8px 16px',
              borderRadius: JELLY.radiusControl,
              border: 'none',
              fontSize: 13,
              fontWeight: 600,
              cursor: !form.description || !form.amount ? 'not-allowed' : 'pointer',
              background: !form.description || !form.amount ? '#e5e7eb' : PRIMARY,
              color: !form.description || !form.amount ? '#9ca3af' : '#fff',
            }}
          >
            추가
          </button>
        </div>
      </Modal>
    </>
  )
}

// ── Allowance (용돈) ───────────────────────────────────────────────────────────

type AllowanceSharedSettings = {
  sharedLivingCostRatioMode?: '50:50' | 'custom' | 'income'
  sharedLivingCostRatio?: [number, number]
}

type SeparateCard5090 = NonNullable<ReturnType<typeof computeSeparateExpenseCard5090>>

type AllowanceBreakdown = {
  total: number
  allowanceA: number
  allowanceB: number
  halfFixedRegular: number
  halfFixedSeparate: number
  /** 별도 지출 카드 50:50 송금 안내 */
  separateExpenseCard5090: SeparateCard5090 | null
  investA: number
  investB: number
  incomeA: number
  incomeB: number
  sharedLivingA: number
  sharedLivingB: number
  rows: Array<{
    person: 'A' | 'B'
    allowance: number
    income: number
    incomeDay: number
    sharedLiving: number
    invest: number
  }>
}

function computeAllowanceBreakdown(
  incomes: IncomeRow[],
  fixedRegular: FixedRow[],
  fixedSeparate: FixedRow[],
  invests: InvestRow[],
  incomeDayA: number,
  incomeDayB: number,
  sharedLivingCost: number,
  settings: AllowanceSharedSettings
): AllowanceBreakdown {
  const totalFixedRegular = fixedRegular.filter((r) => !r.isExcluded).reduce((s, i) => s + i.amount, 0)
  const totalFixedSeparate = fixedSeparate.filter((r) => !r.isExcluded).reduce((s, i) => s + i.amount, 0)
  const activeInvest = invests.filter((r) => !r.isExcluded)
  const investA = activeInvest.filter((r) => r.person === 'A').reduce((s, i) => s + i.amount, 0)
  const investB = activeInvest.filter((r) => r.person === 'B').reduce((s, i) => s + i.amount, 0)
  const incomeA = incomes.filter((i) => i.person === 'A').reduce((s, i) => s + i.amount, 0)
  const incomeB = incomes.filter((i) => i.person === 'B').reduce((s, i) => s + i.amount, 0)
  const halfFixedRegular = Math.round(totalFixedRegular / 2)
  const halfFixedSeparate = Math.round(totalFixedSeparate / 2)
  const separateExpenseCard5090 = computeSeparateExpenseCard5090(fixedSeparate)
  const sharedLivingByPerson = getSharedLivingByPerson(sharedLivingCost, settings, { A: incomeA, B: incomeB })
  const allowanceA = incomeA - halfFixedRegular - halfFixedSeparate - sharedLivingByPerson.A - investA
  const allowanceB = incomeB - halfFixedRegular - halfFixedSeparate - sharedLivingByPerson.B - investB
  return {
    total: allowanceA + allowanceB,
    allowanceA,
    allowanceB,
    halfFixedRegular,
    halfFixedSeparate,
    separateExpenseCard5090,
    investA,
    investB,
    incomeA,
    incomeB,
    sharedLivingA: sharedLivingByPerson.A,
    sharedLivingB: sharedLivingByPerson.B,
    rows: [
      {
        person: 'A',
        allowance: allowanceA,
        income: incomeA,
        incomeDay: incomeDayA,
        sharedLiving: sharedLivingByPerson.A,
        invest: investA,
      },
      {
        person: 'B',
        allowance: allowanceB,
        income: incomeB,
        incomeDay: incomeDayB,
        sharedLiving: sharedLivingByPerson.B,
        invest: investB,
      },
    ],
  }
}

function AllowanceCard(props: { breakdown: AllowanceBreakdown; personAName: string; personBName: string }) {
  const { breakdown, personAName, personBName } = props
  const { total, rows, halfFixedRegular, halfFixedSeparate, separateExpenseCard5090 } = breakdown

  return (
    <div style={{ ...jellyCardStyle, borderRadius: JELLY.radiusLg, overflow: 'hidden' }}>
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 20px',
          borderBottom: JELLY.innerBorderSoft,
          gap: 8,
        }}
      >
        <span style={{ fontSize: 18 }}>💰</span>
        <span style={{ fontWeight: 700, fontSize: 15, color: JELLY.text }}>용돈</span>
        <span style={{ marginLeft: 6, fontWeight: 700, color: allowanceValueColor(total) }}>{fmt(total)}</span>
        <span style={{ marginLeft: 6, fontSize: 11, color: '#6b7280' }}>자동 계산</span>
      </div>
      {separateExpenseCard5090 && separateExpenseCard5090.transferAmount > 0 && (
        <div
          style={{
            margin: '0 8px 8px',
            padding: '10px 12px',
            borderRadius: JELLY.radiusControl,
            background: 'rgba(14, 165, 233, 0.08)',
            border: '1px solid rgba(14, 165, 233, 0.25)',
            fontSize: 12,
            color: JELLY.text,
            lineHeight: 1.5,
          }}
        >
          <strong>별도 지출 50:50 정산</strong>
          <span style={{ color: JELLY.textMuted, fontWeight: 500 }}>
            {' '}
            — 적게 낸 쪽이 차액의 절반을 상대에게 송금합니다.
          </span>
          <div style={{ marginTop: 6, fontWeight: 600 }}>
            {separateExpenseCard5090.transferFrom === 'A' ? personAName : personBName} →{' '}
            {separateExpenseCard5090.transferTo === 'A' ? personAName : personBName}{' '}
            <span style={{ color: PRIMARY }}>{fmt(separateExpenseCard5090.transferAmount)}</span>
          </div>
        </div>
      )}
      <div style={{ padding: '8px 8px 10px' }}>
        {rows.map((row, idx) => (
          <div
            key={row.person}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 10,
              padding: '8px 10px',
              borderBottom: idx === 1 ? 'none' : '1px solid #f3f4f6',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
              <PersonBadge person={row.person} />
              <span style={{ fontSize: 12, color: '#6b7280' }}>({row.incomeDay}일)</span>
            </div>
            <span style={{ flex: 1, fontSize: 11, color: '#6b7280' }}>
              {fmt(row.income)} − 고정지출 {fmt(halfFixedRegular)} − 별도지출 {fmt(halfFixedSeparate)} − 공동생활비{' '}
              {fmt(row.sharedLiving)} − 투자·저축 {fmt(row.invest)}
            </span>
            <span
              style={{
                width: AMOUNT_INPUT_MIN_WIDTH,
                minWidth: AMOUNT_INPUT_MIN_WIDTH,
                textAlign: 'right',
                fontSize: 13,
                fontWeight: 700,
                color: allowanceValueColor(row.allowance),
              }}
            >
              {fmt(row.allowance)}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────


export function ExpensePlanPage() {
  const {
    currentYearMonth,
    settings,
    setYearMonth,
    startMonth,
    removeStartedMonth,
    settleMonth,
    unsetSettleMonth,
    isMonthStarted,
    isMonthSettled,
  } = useAppStore()
  const startedMonths = useAppStore((s) => s.startedMonths)
  const settledMonths = useAppStore((s) => s.settledMonths)
  const getSortedTemplates = useFixedTemplateStore((s) => s.getSortedTemplates)
  const fixedTemplates = useMemo(() => getSortedTemplates(), [getSortedTemplates])
  const globalFixedTemplateIds = useMemo(() => new Set(fixedTemplates.map((t) => t.id)), [fixedTemplates])
  const fixedExclusions = useFixedTemplateStore((s) => s.exclusions)
  const fixedMonthlyAmounts = useFixedTemplateStore((s) => s.monthlyAmounts)
  const getActiveFixedTemplates = useFixedTemplateStore((s) => s.getActiveTemplates)
  const getFixedMonthlyAmount = useFixedTemplateStore((s) => s.getMonthlyAmount)
  const setFixedMonthlyAmount = useFixedTemplateStore((s) => s.setMonthlyAmount)
  const toggleFixedExclusion = useFixedTemplateStore((s) => s.toggleExclusion)
  const isFixedSeparated = useFixedTemplateStore((s) => s.isSeparated)
  const toggleFixedSeparation = useFixedTemplateStore((s) => s.toggleSeparation)
  const monthlySeparations = useFixedTemplateStore((s) => s.monthlySeparations)
  const clearFixedMonth = useFixedTemplateStore((s) => s.clearMonthForYearMonth)

  const getSortedInvestTemplates = useInvestTemplateStore((s) => s.getSortedTemplates)
  const investTemplates = useMemo(() => getSortedInvestTemplates(), [getSortedInvestTemplates])
  const globalInvestTemplateIds = useMemo(() => new Set(investTemplates.map((t) => t.id)), [investTemplates])
  const investExclusions = useInvestTemplateStore((s) => s.exclusions)
  const investMonthlyAmounts = useInvestTemplateStore((s) => s.monthlyAmounts)
  const getActiveInvestTemplates = useInvestTemplateStore((s) => s.getActiveTemplates)
  const getInvestMonthlyAmount = useInvestTemplateStore((s) => s.getMonthlyAmount)
  const setInvestMonthlyAmount = useInvestTemplateStore((s) => s.setMonthlyAmount)
  const toggleInvestExclusion = useInvestTemplateStore((s) => s.toggleExclusion)
  const clearInvestMonth = useInvestTemplateStore((s) => s.clearMonthForYearMonth)

  const { items: incomeItems, hasLoaded: incomesLoaded, create: createIncome, update: updateIncome, remove: removeIncome } = useIncomes(currentYearMonth)
  const seededMonthsRef = useRef<Set<string>>(new Set())
  const [incomeOverrides, setIncomeOverrides] = useState<Record<string, Partial<IncomeRow>>>({})
  useEffect(() => {
    setIncomeOverrides({})
  }, [currentYearMonth])

  const extraRowsByMonth = usePlanExtraStore((s) => s.extraRowsByMonth)
  const templateSnapshotsByMonth = usePlanExtraStore((s) => s.templateSnapshotsByMonth)
  const setFixedForMonth = usePlanExtraStore((s) => s.setFixedForMonth)
  const setInvestForMonth = usePlanExtraStore((s) => s.setInvestForMonth)
  const separateExpenseRowsByMonth = usePlanExtraStore((s) => s.separateExpenseRowsByMonth)
  const setSeparateExpenseForMonth = usePlanExtraStore((s) => s.setSeparateExpenseForMonth)
  const setTemplateSnapshot = usePlanExtraStore((s) => s.setTemplateSnapshot)
  const updateFixedTemplateInSnapshot = usePlanExtraStore((s) => s.updateFixedTemplateInSnapshot)
  const updateInvestTemplateInSnapshot = usePlanExtraStore((s) => s.updateInvestTemplateInSnapshot)
  const removeFixedTemplateFromSnapshot = usePlanExtraStore((s) => s.removeFixedTemplateFromSnapshot)
  const removeInvestTemplateFromSnapshot = usePlanExtraStore((s) => s.removeInvestTemplateFromSnapshot)
  const clearMonth = usePlanExtraStore((s) => s.clearMonth)
  const toggleDefaultSalaryExcluded = usePlanExtraStore((s) => s.toggleDefaultSalaryExcluded)
  const defaultSalaryExcludedMap = usePlanExtraStore((s) => {
    const m = s.defaultSalaryExcludedByMonth[currentYearMonth]
    return m ?? EMPTY_DEFAULT_SALARY_EXCLUDED
  })

  const cancelSettlement = useSettlementStore((s) => s.cancelSettlement)

  const [leaveConfirmOpen, setLeaveConfirmOpen] = useState(false)
  const [pendingSwitchYm, setPendingSwitchYm] = useState<string | null>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [otherMonthModalOpen, setOtherMonthModalOpen] = useState(false)
  const [otherMonthSelected, setOtherMonthSelected] = useState<string>(() => {
    const n = new Date()
    const y = Math.max(YEAR_PICKER_MIN, n.getFullYear())
    return `${y}-${String(n.getMonth() + 1).padStart(2, '0')}`
  })
  const [settleDeleteConfirmOpen, setSettleDeleteConfirmOpen] = useState(false)

  useEffect(() => {
    if (!otherMonthModalOpen) return
    setOtherMonthSelected((prev) => {
      const [ys, ms] = prev.split('-')
      const yn = Number(ys)
      const m = ms && /^\d{1,2}$/.test(ms) ? ms.padStart(2, '0') : '01'
      if (yn >= YEAR_PICKER_MIN) return prev
      return `${YEAR_PICKER_MIN}-${m}`
    })
  }, [otherMonthModalOpen])
  const [viewMode, setViewMode] = useState<'edit' | 'result'>('edit')
  const [settlementSummary, setSettlementSummary] = useState<ReturnType<typeof calcSettlementSummary> | null>(null)
  const resultScrollRef = useRef<HTMLDivElement>(null)
  /** true면 정산 완료 달이라도 자동으로 결과 화면을 덮어쓰지 않음(수정하기로 연 편집 유지) */
  const skipSettledAutoResultRef = useRef(false)

  const fixedExtraRows: FixedRow[] = (extraRowsByMonth[currentYearMonth]?.fixed ?? []).map((r) => ({ ...r, isExcluded: false }))
  const investExtraRows: InvestRow[] = (extraRowsByMonth[currentYearMonth]?.invest ?? []).map((r) => ({ ...r, isExcluded: false }))
  const separateExpenseExtraRows: FixedRow[] = (separateExpenseRowsByMonth[currentYearMonth] ?? []).map((r) => ({
    ...r,
    isExcluded: false,
  }))

  const setFixedExtraRows = (updater: (prev: FixedRow[]) => FixedRow[]) =>
    setFixedForMonth(currentYearMonth, (prev) => updater(prev.map((r) => ({ ...r, isExcluded: false }))).map(({ isExcluded, ...r }) => r))
  const setInvestExtraRows = (updater: (prev: InvestRow[]) => InvestRow[]) =>
    setInvestForMonth(currentYearMonth, (prev) => updater(prev.map((r) => ({ ...r, isExcluded: false }))).map(({ isExcluded, ...r }) => r))
  const setSeparateExpenseExtraRows = (updater: (prev: FixedRow[]) => FixedRow[]) =>
    setSeparateExpenseForMonth(currentYearMonth, (prev) => {
      const lifted: FixedRow[] = (prev ?? []).map((r) => ({ ...r, isExcluded: false }))
      return updater(lifted).map(({ isExcluded: _e, ...rest }) => rest)
    })

  const planState = useMemo(() => {
    const started = startedMonths.includes(currentYearMonth)
    const settled = settledMonths.includes(currentYearMonth)
    if (!started) return 'none' as const
    if (settled) return 'settled' as const
    return 'draft' as const
  }, [currentYearMonth, startedMonths, settledMonths])

  useEffect(() => {
    skipSettledAutoResultRef.current = false
  }, [currentYearMonth])

  /** 작성 중인 달은 항상 편집 화면. 이전 달 정산 결과(viewMode/summary)가 남아 신규 달에서 결과만 보이는 현상 방지 */
  useEffect(() => {
    if (planState !== 'draft') return
    setViewMode('edit')
    setSettlementSummary(null)
  }, [currentYearMonth, planState])

  /** draft이거나, 정산 완료 후 상단「수정하기」로 편집 화면일 때 수입·고정지출 입력 필드 사용 */
  const planFieldsEditable = planState === 'draft' || (planState === 'settled' && viewMode === 'edit')

  const useSnapshot = (planState === 'draft' || planState === 'settled') && !!templateSnapshotsByMonth[currentYearMonth]
  const effectiveFixedTemplates = useSnapshot ? templateSnapshotsByMonth[currentYearMonth].fixed : fixedTemplates
  const effectiveInvestTemplates = useSnapshot ? templateSnapshotsByMonth[currentYearMonth].invest : investTemplates

  const hasUnsavedExtra =
    (fixedExtraRows?.length ?? 0) > 0 ||
    (investExtraRows?.length ?? 0) > 0 ||
    (separateExpenseExtraRows?.length ?? 0) > 0

  const handleBeforeMonthChange = (newYm: string): boolean => {
    /** 정산 결과만 보는 중에는 월 이동 시「저장하지 않고 나가기」모달 없이 전환 */
    if (viewMode === 'result') return true
    if (!hasUnsavedExtra) return true
    setPendingSwitchYm(newYm)
    setLeaveConfirmOpen(true)
    return false
  }

  const handleLeaveWithoutSave = () => {
    if (currentYearMonth && pendingSwitchYm) {
      clearMonth(currentYearMonth)
      setYearMonth(pendingSwitchYm)
    }
    setPendingSwitchYm(null)
    setLeaveConfirmOpen(false)
  }

  const handleLeaveCancel = () => {
    setPendingSwitchYm(null)
    setLeaveConfirmOpen(false)
  }

  const handleDeletePlan = async () => {
    if (!currentYearMonth) return
    for (const i of incomeItems) {
      await removeIncome(i.id)
    }
    clearMonth(currentYearMonth)
    clearFixedMonth(currentYearMonth)
    clearInvestMonth(currentYearMonth)
    removeStartedMonth(currentYearMonth)
    unsetSettleMonth(currentYearMonth)
    cancelSettlement(currentYearMonth)
    setDeleteConfirmOpen(false)
  }

  // 수입: 작성이 시작된 달만 해당 월 기준 유저1/2 기본 수입 2건 시드(설정값 사용). 초기 로드 완료 후에만 실행(설정 갔다 왔을 때 기존 데이터 유지)
  useEffect(() => {
    if (!currentYearMonth || !isMonthStarted(currentYearMonth) || !incomesLoaded || incomeItems.length > 0) return
    if (seededMonthsRef.current.has(currentYearMonth)) return
    seededMonthsRef.current.add(currentYearMonth)
    const run = async () => {
      await createIncome({
        yearMonth: currentYearMonth,
        person: 'A',
        category: '급여',
        description: settings.personAName || '유저 1',
        amount: settings.personAIncome ?? 0,
      })
      await createIncome({
        yearMonth: currentYearMonth,
        person: 'B',
        category: '급여',
        description: settings.personBName || '유저 2',
        amount: settings.personBIncome ?? 0,
      })
    }
    run()
  }, [currentYearMonth, isMonthStarted, incomesLoaded, incomeItems.length, settings.personAName, settings.personBName, settings.personAIncome, settings.personBIncome, createIncome])

  // 지출 계획의 수입 수정은 해당 월에만 반영. 설정은 변경하지 않음.
  const defaultA = incomeItems.find((i) => i.person === 'A' && i.category === '급여')
  const defaultB = incomeItems.find((i) => i.person === 'B' && i.category === '급여')
  /** 매 렌더 새 배열이면 incomeRowsEffective·buildSettlementSummary가 매번 바뀌어 정산 달에서 useEffect 무한 루프 */
  const incomeRows: IncomeRow[] = useMemo(() => {
    const da = incomeItems.find((i) => i.person === 'A' && i.category === '급여')
    const db = incomeItems.find((i) => i.person === 'B' && i.category === '급여')
    const extras = incomeItems.filter(
      (i) => !(i.person === 'A' && i.category === '급여') && !(i.person === 'B' && i.category === '급여'),
    )
    return [
      {
        id: da?.id ?? 'virtual-a',
        person: 'A' as const,
        category: '급여',
        description: settings.personAName || '유저 1',
        amount: da?.amount ?? settings.personAIncome ?? 0,
      },
      {
        id: db?.id ?? 'virtual-b',
        person: 'B' as const,
        category: '급여',
        description: settings.personBName || '유저 2',
        amount: db?.amount ?? settings.personBIncome ?? 0,
      },
      ...extras.map((i) => ({
        id: i.id,
        person: i.person as Exclude<Person, '공금'>,
        category: i.category,
        description: i.description ?? '',
        amount: i.amount,
      })),
    ]
  }, [incomeItems, settings.personAName, settings.personBName, settings.personAIncome, settings.personBIncome])

  const incomeRowsWithOverrides = useMemo(
    () => incomeRows.map((row) => ({ ...row, ...incomeOverrides[row.id] })),
    [incomeRows, incomeOverrides]
  )

  const incomeRowsEffective = useMemo(() => {
    return incomeRowsWithOverrides.map((row) => {
      const slot = defaultSalaryPersonSlot(row, defaultA?.id, defaultB?.id)
      if (slot && defaultSalaryExcludedMap[slot]) return { ...row, amount: 0 }
      return row
    })
  }, [incomeRowsWithOverrides, defaultSalaryExcludedMap, defaultA?.id, defaultB?.id])

  const isFixedExcluded = useFixedTemplateStore((s) => s.isExcluded)
  const isInvestExcluded = useInvestTemplateStore((s) => s.isExcluded)

  const fixedRows = useMemo(() => {
    if (!currentYearMonth) return fixedExtraRows
    const fromTemplates: FixedRow[] = effectiveFixedTemplates.map((tpl) => {
      const excluded = isFixedExcluded(tpl.id, currentYearMonth)
      const isSeparate = isFixedSeparated(tpl.id, currentYearMonth)
      const separatePerson: 'A' | 'B' | undefined = isSeparate
        ? (tpl.person === '공금' ? (tpl.defaultSeparatePerson ?? 'A') : tpl.person === 'A' || tpl.person === 'B' ? tpl.person : 'A')
        : undefined
      return {
        id: `ft-tpl-${tpl.id}`,
        person: tpl.person,
        category: tpl.category,
        description: tpl.description,
        amount: getFixedMonthlyAmount(tpl.id, currentYearMonth) ?? tpl.defaultAmount,
        isSeparate,
        separatePerson,
        payDay: tpl.payDay,
        isExcluded: excluded,
      }
    })
    return [...fromTemplates, ...fixedExtraRows]
  }, [currentYearMonth, effectiveFixedTemplates, getFixedMonthlyAmount, fixedExtraRows, fixedExclusions, fixedMonthlyAmounts, monthlySeparations, isFixedExcluded, isFixedSeparated])

  const fixedRowsForBudget = useMemo(
    () => [...fixedRows, ...separateExpenseExtraRows],
    [fixedRows, separateExpenseExtraRows],
  )

  const investRows = useMemo(() => {
    if (!currentYearMonth) return investExtraRows
    const fromTemplates: InvestRow[] = effectiveInvestTemplates.map((tpl) => {
      const excluded = isInvestExcluded(tpl.id, currentYearMonth)
      return {
        id: `inv-tpl-${tpl.id}`,
        person: tpl.person,
        category: tpl.category,
        description: tpl.description,
        amount: getInvestMonthlyAmount(tpl.id, currentYearMonth) ?? tpl.defaultAmount,
        isExcluded: excluded,
        maturityDate: tpl.maturityDate,
      }
    })
    return [...fromTemplates, ...investExtraRows]
  }, [currentYearMonth, effectiveInvestTemplates, getInvestMonthlyAmount, investExtraRows, investExclusions, investMonthlyAmounts, isInvestExcluded])

  const totalIncome = incomeRowsEffective.reduce((s, i) => s + i.amount, 0)
  const totalFixed = fixedRowsForBudget.filter((r) => !r.isExcluded).reduce((s, i) => s + i.amount, 0)
  const totalInvest = investRows.filter((r) => !r.isExcluded).reduce((s, i) => s + i.amount, 0)

  const allowanceBreakdown = useMemo(
    () =>
      computeAllowanceBreakdown(
        incomeRowsEffective,
        fixedRows,
        separateExpenseExtraRows,
        investRows,
        settings.personAIncomeDay,
        settings.personBIncomeDay,
        settings.sharedLivingCost ?? 0,
        settings,
      ),
    [
      incomeRowsEffective,
      fixedRows,
      separateExpenseExtraRows,
      investRows,
      settings.personAIncomeDay,
      settings.personBIncomeDay,
      settings.sharedLivingCost,
      settings.sharedLivingCostRatioMode,
      settings.sharedLivingCostRatio,
      settings,
    ],
  )

  const buildSettlementSummary = useCallback((): ReturnType<typeof calcSettlementSummary> => {
    const totalFixedRegular = fixedRows.filter((r) => !r.isExcluded).reduce((s, i) => s + i.amount, 0)
    const totalFixedSeparate = separateExpenseExtraRows.filter((r) => !r.isExcluded).reduce((s, i) => s + i.amount, 0)
    const activeInvest = investRows.filter((r) => !r.isExcluded)
    const sepPersonTemplate = (r: FixedRow) =>
      r.separatePerson ?? (r.person === 'A' || r.person === 'B' ? r.person : 'A')
    const templateSeparateItems = fixedRows.filter((r) => !r.isExcluded && r.isSeparate)
    const templateSepA = templateSeparateItems
      .filter((i) => sepPersonTemplate(i) === 'A')
      .reduce((s, i) => s + i.amount, 0)
    const templateSepB = templateSeparateItems
      .filter((i) => sepPersonTemplate(i) === 'B')
      .reduce((s, i) => s + i.amount, 0)
    const cardActive = separateExpenseExtraRows.filter((r) => !r.isExcluded)
    const cardPaidA = cardActive
      .filter((r) => payerForSeparateExpenseRow(r) === 'A')
      .reduce((s, r) => s + r.amount, 0)
    const cardPaidB = cardActive
      .filter((r) => payerForSeparateExpenseRow(r) === 'B')
      .reduce((s, r) => s + r.amount, 0)
    const separateByUserA = templateSepA + cardPaidA
    const separateByUserB = templateSepB + cardPaidB
    const separateExpenseCard5090 = computeSeparateExpenseCard5090(separateExpenseExtraRows)
    const incomeByPerson = {
      A: incomeRowsEffective.filter((r) => r.person === 'A').reduce((s, r) => s + r.amount, 0),
      B: incomeRowsEffective.filter((r) => r.person === 'B').reduce((s, r) => s + r.amount, 0),
    }
    const investByPerson = {
      A: activeInvest.filter((r) => r.person === 'A').reduce((s, r) => s + r.amount, 0),
      B: activeInvest.filter((r) => r.person === 'B').reduce((s, r) => s + r.amount, 0),
    }
    const fixedDepositByUser = {
      A: Math.round(totalFixed / 2) - separateByUserA,
      B: Math.round(totalFixed / 2) - separateByUserB,
    }
    return calcSettlementSummary(
      {
        totalIncome,
        incomeByPerson,
        totalFixed,
        fixedRegularTotal: totalFixedRegular,
        fixedSeparateTotal: totalFixedSeparate,
        fixedDepositByUser,
        totalInvest,
        investByPerson,
        investByCategoryByPerson: {
          A: investByCategoryForPerson(activeInvest, 'A'),
          B: investByCategoryForPerson(activeInvest, 'B'),
        },
        investLinesByCategoryByPerson: {
          A: investLinesByCategoryForPerson(activeInvest, 'A'),
          B: investLinesByCategoryForPerson(activeInvest, 'B'),
        },
        separateByUser: { A: separateByUserA, B: separateByUserB },
        separateExpenseCard5090,
      },
      settings,
    )
  }, [
    fixedRows,
    separateExpenseExtraRows,
    fixedRowsForBudget,
    investRows,
    incomeRowsEffective,
    totalIncome,
    totalFixed,
    totalInvest,
    settings,
  ])

  /** 정산 완료 달: 재진입·설정 복귀 시 로컬 state가 초기화돼도 결과 화면을 유지. 수정하기로 연 편집 중에는 건드리지 않음 */
  useEffect(() => {
    if (planState !== 'settled' || !currentYearMonth || !incomesLoaded) return
    if (skipSettledAutoResultRef.current) return
    setSettlementSummary(buildSettlementSummary())
    setViewMode('result')
  }, [planState, currentYearMonth, incomesLoaded, buildSettlementSummary])

  const handleSettle = async () => {
    if (!currentYearMonth) return
    const ym = currentYearMonth
    setTemplateSnapshot(ym, {
      fixed: structuredClone(effectiveFixedTemplates),
      invest: structuredClone(effectiveInvestTemplates),
    })
    const summary = buildSettlementSummary()
    setSettlementSummary(summary)
    settleMonth(ym)
    skipSettledAutoResultRef.current = false
    setViewMode('result')
    setTimeout(() => resultScrollRef.current?.scrollIntoView?.({ behavior: 'smooth' }), 50)

    if (isSupabaseConfigured) {
      await new Promise((r) => setTimeout(r, 0))
      const res = await saveAllToSupabase()
      if (!res.ok) {
        console.warn('[Supabase] 이달 정산 후 업로드 실패:', res.message)
      } else if (!res.snapshotOk && res.snapshotHint) {
        console.warn('[Supabase]', res.snapshotHint)
      }
    }
  }

  /** 정산 후 편집 화면에서 수정 반영 → 정산 결과 다시 보기 */
  const handleEditSettlementComplete = () => {
    if (!currentYearMonth) return
    skipSettledAutoResultRef.current = false
    setSettlementSummary(buildSettlementSummary())
    setViewMode('result')
    setTimeout(() => resultScrollRef.current?.scrollIntoView?.({ behavior: 'smooth' }), 50)
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1
          style={{
            fontSize: 24,
            fontWeight: 700,
            color: '#111827',
            margin: 0,
            marginBottom: 12,
          }}
        >
          지출 계획
        </h1>
        <MonthPicker onBeforeChange={handleBeforeMonthChange} />
        {/* 작성되지 않은 달: 작성하기로 진입 */}
        {planState === 'none' && (
          <div style={{ marginTop: 16, padding: 24, background: '#f9fafb', borderRadius: JELLY.radiusControl, border: '1px dashed #e5e7eb', textAlign: 'center' }}>
            <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 12px' }}>
              이 달의 지출 계획을 작성해보세요.
            </p>
            <button
              type="button"
              onClick={() => {
                startMonth(currentYearMonth)
                setTemplateSnapshot(currentYearMonth, { fixed: [...fixedTemplates], invest: [...investTemplates] })
              }}
              style={{ ...jellyPrimaryButton, fontSize: 14 }}
            >
              작성하기
            </button>
          </div>
        )}
        {(planState === 'draft' || planState === 'settled') && (
          <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {planState === 'draft' && (
              <>
                <button type="button" onClick={() => setDeleteConfirmOpen(true)} style={buttonWriteDeleteStyle}>
                  작성 삭제
                </button>
                <button
                  type="button"
                  onClick={() => void handleSettle()}
                  style={{ ...jellyPrimaryButton, fontSize: 13 }}
                >
                  이달 정산하기
                </button>
              </>
            )}
            {planState === 'settled' && viewMode === 'result' && (
              <button
                type="button"
                onClick={() => {
                  skipSettledAutoResultRef.current = true
                  setViewMode('edit')
                }}
                style={{
                  padding: '8px 14px',
                  borderRadius: JELLY.radiusControl,
                  border: `1px solid ${PRIMARY}`,
                  background: PRIMARY_LIGHT,
                  color: PRIMARY,
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                수정하기
              </button>
            )}
            {planState === 'settled' && viewMode === 'edit' && (
              <>
                <button
                  type="button"
                  onClick={handleEditSettlementComplete}
                  style={{ ...jellyPrimaryButton, fontSize: 13 }}
                >
                  수정 완료
                </button>
                <button type="button" onClick={() => setDeleteConfirmOpen(true)} style={buttonWriteDeleteStyle}>
                  작성 삭제
                </button>
              </>
            )}
          </div>
        )}
      </div>

      {/* 작성 중 다른 월 전환 시 저장 확인 모달 */}
      <Modal open={leaveConfirmOpen} title="저장하지 않고 나가시겠습니까?" onClose={handleLeaveCancel}>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
          변경 사항이 저장되지 않습니다.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={handleLeaveCancel}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleLeaveWithoutSave}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #dc2626', background: '#fff', color: '#dc2626', fontSize: 13, cursor: 'pointer' }}
          >
            저장 안 하고 나가기
          </button>
        </div>
      </Modal>

      {/* 작성 삭제 확인 모달 */}
      <Modal open={deleteConfirmOpen} title="작성 삭제" onClose={() => setDeleteConfirmOpen(false)}>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
          이 달의 지출 계획을 삭제하시겠습니까? 수입, 고정지출, 투자·저축 항목이 모두 삭제됩니다.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={() => setDeleteConfirmOpen(false)}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={handleDeletePlan}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            삭제
          </button>
        </div>
      </Modal>

      {/* 정산 삭제 확인 모달 */}
      <Modal open={settleDeleteConfirmOpen} title="정산 삭제" onClose={() => setSettleDeleteConfirmOpen(false)}>
        <p style={{ fontSize: 14, color: '#6b7280', margin: '0 0 16px' }}>
          정산을 삭제하시겠습니까? 삭제 시 수정 가능한 상태로 돌아갑니다.
        </p>
        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
          <button
            type="button"
            onClick={() => setSettleDeleteConfirmOpen(false)}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            취소
          </button>
          <button
            type="button"
            onClick={() => {
              cancelSettlement(currentYearMonth)
              unsetSettleMonth(currentYearMonth)
              setSettleDeleteConfirmOpen(false)
            }}
            style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: 'none', background: '#dc2626', color: '#fff', fontSize: 13, cursor: 'pointer' }}
          >
            삭제
          </button>
        </div>
      </Modal>

      {/* 다른 월 작성하기 모달 */}
      <Modal open={otherMonthModalOpen} title="다른 월 작성하기" onClose={() => setOtherMonthModalOpen(false)}>
        <div style={{ fontSize: 14, color: '#374151' }}>
          <p style={{ margin: '0 0 16px', color: '#6b7280' }}>작성할 달을 선택한 뒤 작성하기를 누르세요.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
            <span style={{ fontWeight: 600 }}>연도</span>
            <YearSelectDropdown
              variant="light"
              value={Number(otherMonthSelected.split('-')[0]) || YEAR_PICKER_MIN}
              onChange={(y) => {
                const m = otherMonthSelected.split('-')[1] ?? '01'
                setOtherMonthSelected(`${y}-${m}`)
              }}
            />
            <span style={{ fontWeight: 600 }}>월</span>
            <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
              {['1월','2월','3월','4월','5월','6월','7월','8월','9월','10월','11월','12월'].map((label, i) => {
                const m = i + 1
                const ym = `${otherMonthSelected.split('-')[0]}-${String(m).padStart(2, '0')}`
                const active = otherMonthSelected === ym
                return (
                  <button
                    key={m}
                    type="button"
                    onClick={() => setOtherMonthSelected(ym)}
                    style={{
                      padding: '6px 10px', borderRadius: JELLY.radiusControl, border: 'none',
                      background: active ? PRIMARY : '#f3f4f6', color: active ? '#fff' : '#374151',
                      fontSize: 12, fontWeight: active ? 600 : 400, cursor: 'pointer',
                    }}
                  >
                    {label}
                  </button>
                )
              })}
            </div>
          </div>
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8 }}>
            <button
              type="button"
              onClick={() => setOtherMonthModalOpen(false)}
              style={{ padding: '8px 14px', borderRadius: JELLY.radiusControl, border: '1px solid #e5e7eb', background: '#fff', fontSize: 13, cursor: 'pointer' }}
            >
              취소
            </button>
            <button
              type="button"
              onClick={() => {
                setYearMonth(otherMonthSelected)
                startMonth(otherMonthSelected)
                setTemplateSnapshot(otherMonthSelected, { fixed: [...fixedTemplates], invest: [...investTemplates] })
                setOtherMonthModalOpen(false)
              }}
              style={{ ...jellyPrimaryButton, fontSize: 13 }}
            >
              작성하기
            </button>
          </div>
        </div>
      </Modal>

      {/* 정산 결과 모달 */}

      {planState !== 'none' && (
        viewMode === 'result' && settlementSummary ? (
          <div ref={resultScrollRef}>
            <SettlementResultView
              summary={settlementSummary}
              personAName={settings.personAName || '유저 1'}
              personBName={settings.personBName || '유저 2'}
            />
          </div>
        ) : (
        <div key={currentYearMonth}>
          <div style={{ display: 'flex', gap: 12, marginBottom: 20, flexWrap: 'wrap' }}>
            {[
              { label: '수입 합계', value: totalIncome, color: PRIMARY },
              { label: '고정·별도 지출 합계', value: totalFixed, color: SUB_FIXED_ACCENT },
              { label: '투자·저축 합계', value: totalInvest, color: SUB_INVEST_ACCENT },
            ].map((c) => (
              <div
                key={c.label}
                style={{
                  flex: 1,
                  minWidth: 140,
                  background: '#fff',
                  borderRadius: JELLY.radiusControl,
                  padding: '14px 16px',
                  boxShadow: '0px 1px 3px rgba(15,23,42,0.12)',
                }}
              >
                <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 4 }}>{c.label}</div>
                <div style={{ fontSize: 18, fontWeight: 700, color: c.color }}>{fmt(c.value)}</div>
              </div>
            ))}
            <div
              style={{
                flex: 1,
                minWidth: 160,
                background: '#fff',
                borderRadius: JELLY.radiusControl,
                padding: '14px 16px',
                boxShadow: '0px 1px 3px rgba(15,23,42,0.12)',
              }}
            >
              <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>용돈</div>
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: '#6b7280' }}>{settings.personAName || '유저 1'} 용돈</span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: allowanceValueColor(allowanceBreakdown.allowanceA),
                  }}
                >
                  {fmt(allowanceBreakdown.allowanceA)}
                </span>
              </div>
              <div
                role="separator"
                style={{
                  height: 1,
                  background: '#e5e7eb',
                  margin: '10px 0',
                }}
              />
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 8,
                }}
              >
                <span style={{ fontSize: 12, color: '#6b7280' }}>{settings.personBName || '유저 2'} 용돈</span>
                <span
                  style={{
                    fontSize: 16,
                    fontWeight: 700,
                    color: allowanceValueColor(allowanceBreakdown.allowanceB),
                  }}
                >
                  {fmt(allowanceBreakdown.allowanceB)}
                </span>
              </div>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 40 }}>
            <IncomeCard
          rows={incomeRowsWithOverrides}
          defaultSalaryExcluded={defaultSalaryExcludedMap}
          onToggleDefaultSalaryExcluded={(person) => toggleDefaultSalaryExcluded(currentYearMonth, person)}
          defaultAIncomeId={defaultA?.id}
          defaultBIncomeId={defaultB?.id}
          onAdd={(row) => createIncome({ yearMonth: currentYearMonth, person: row.person, category: row.category, description: row.description, amount: row.amount })}
          onUpdate={async (id, patch) => {
              setIncomeOverrides((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))
              const defaultA = incomeItems.find((i) => i.person === 'A' && i.category === '급여')
              const defaultB = incomeItems.find((i) => i.person === 'B' && i.category === '급여')
              if (id === 'virtual-a') {
                if (defaultA) {
                  await updateIncome(defaultA.id, patch)
                } else if (currentYearMonth) {
                  await createIncome({
                    yearMonth: currentYearMonth,
                    person: 'A',
                    category: '급여',
                    description: ('description' in patch ? patch.description : settings.personAName) || '유저 1',
                    amount: ('amount' in patch ? patch.amount : settings.personAIncome) ?? 0,
                  })
                }
              } else if (id === 'virtual-b') {
                if (defaultB) {
                  await updateIncome(defaultB.id, patch)
                } else if (currentYearMonth) {
                  await createIncome({
                    yearMonth: currentYearMonth,
                    person: 'B',
                    category: '급여',
                    description: ('description' in patch ? patch.description : settings.personBName) || '유저 2',
                    amount: ('amount' in patch ? patch.amount : settings.personBIncome) ?? 0,
                  })
                }
              } else {
                await updateIncome(id, patch)
              }
              setTimeout(() => {
                setIncomeOverrides((prev) => {
                  const next = { ...prev }
                  delete next[id]
                  return next
                })
              }, 0)
            }}
          onRemove={(id) => {
              if (id === 'virtual-a' || id === 'virtual-b') return
              removeIncome(id)
            }}
          useTextFields={planFieldsEditable}
        />
        <FixedExpenseCard
          rows={fixedRows}
          onAdd={(row) => setFixedExtraRows((prev) => [...prev, { ...row, id: newId() }])}
          onUpdate={(id, patch) => setFixedExtraRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
          onRemove={(id) => setFixedExtraRows((prev) => prev.filter((r) => r.id !== id))}
          onExcludeThisMonth={(templateId) => toggleFixedExclusion(templateId, currentYearMonth)}
          globalTemplateIds={globalFixedTemplateIds}
          planState={planState}
          onRemoveOrphanSnapshotTemplate={(templateId) => removeFixedTemplateFromSnapshot(currentYearMonth, templateId)}
          onUpdateTemplate={(templateId, patch) => {
            if ('amount' in patch && patch.amount != null) setFixedMonthlyAmount(templateId, currentYearMonth, patch.amount)
            if (('category' in patch || 'description' in patch || 'payDay' in patch) && currentYearMonth) {
              if (!templateSnapshotsByMonth[currentYearMonth]) {
                setTemplateSnapshot(currentYearMonth, { fixed: [...fixedTemplates], invest: [...investTemplates] })
              }
              updateFixedTemplateInSnapshot(currentYearMonth, templateId, patch as Partial<{ category: string; description: string; payDay?: number }>)
            }
            if ('separatePerson' in patch && patch.separatePerson != null && currentYearMonth) {
              if (!templateSnapshotsByMonth[currentYearMonth]) {
                setTemplateSnapshot(currentYearMonth, { fixed: [...fixedTemplates], invest: [...investTemplates] })
              }
              updateFixedTemplateInSnapshot(currentYearMonth, templateId, { defaultSeparatePerson: patch.separatePerson })
            }
            if ('isSeparate' in patch && patch.isSeparate != null) {
              const current = isFixedSeparated(templateId, currentYearMonth)
              if (current !== patch.isSeparate) toggleFixedSeparation(templateId, currentYearMonth)
            }
          }}
          useTextFields={planFieldsEditable}
        />
        <FixedExpenseCard
          rows={separateExpenseExtraRows}
          onAdd={(row) =>
            setSeparateExpenseExtraRows((prev) => [...prev, { ...row, id: newId(), payDay: undefined }])
          }
          onUpdate={(id, patch) => setSeparateExpenseExtraRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
          onRemove={(id) => setSeparateExpenseExtraRows((prev) => prev.filter((r) => r.id !== id))}
          onExcludeThisMonth={() => {}}
          onUpdateTemplate={() => {}}
          globalTemplateIds={globalFixedTemplateIds}
          planState={planState}
          onRemoveOrphanSnapshotTemplate={() => {}}
          useTextFields={planFieldsEditable}
          sectionEmoji="📝"
          sectionTitle="별도 지출"
          emptyMessage="별도 지출 항목을 추가해주세요."
          addModalTitle="별도지출 추가"
          showPayDayOnRows={false}
          hidePayDayInModal
          leadPlanPersonEditable
        />
        <InvestCard
          rows={investRows}
          onAdd={(row) => setInvestExtraRows((prev) => [...prev, { ...row, id: newId() }])}
          onUpdate={(id, patch) => setInvestExtraRows((prev) => prev.map((r) => (r.id === id ? { ...r, ...patch } : r)))}
          onRemove={(id) => setInvestExtraRows((prev) => prev.filter((r) => r.id !== id))}
          onExcludeThisMonth={(templateId) => toggleInvestExclusion(templateId, currentYearMonth)}
          globalTemplateIds={globalInvestTemplateIds}
          planState={planState}
          onRemoveOrphanSnapshotTemplate={(templateId) => removeInvestTemplateFromSnapshot(currentYearMonth, templateId)}
          onUpdateTemplate={(templateId, patch) => {
            if ('amount' in patch && patch.amount != null) setInvestMonthlyAmount(templateId, currentYearMonth, patch.amount)
            if (('category' in patch || 'description' in patch || 'maturityDate' in patch) && currentYearMonth) {
              if (!templateSnapshotsByMonth[currentYearMonth]) {
                setTemplateSnapshot(currentYearMonth, { fixed: [...fixedTemplates], invest: [...investTemplates] })
              }
              updateInvestTemplateInSnapshot(currentYearMonth, templateId, patch as Partial<InvestTemplate>)
            }
          }}
        />
        <AllowanceCard
          breakdown={allowanceBreakdown}
          personAName={settings.personAName || '유저1'}
          personBName={settings.personBName || '유저2'}
        />
          </div>
        </div>
        )
      )}
    </div>
  )
}

