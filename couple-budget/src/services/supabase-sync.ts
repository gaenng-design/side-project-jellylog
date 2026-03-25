/**
 * Supabase 정규화 테이블 ↔ 로컬(localStorage / Zustand persist) 동기화
 * - pull: 앱 부트스트랩 시 정규화 데이터 우선, 없으면 app_snapshot
 * - push: 정규화 테이블 upsert + app_snapshot 백업 (기존 saveAll 경로)
 */
import { supabase, isSupabaseConfigured } from '@/data/supabase'
import { getSyncHouseholdId } from '@/services/authHousehold'
import { useAppStore } from '@/store/useAppStore'
import type { Income } from '@/types'
import type { MonthlySettlement } from '@/store/useSettlementStore'

/**
 * incomes / fixed_expenses / investments / separate_items 컬럼 규칙
 * - camelCase(기본): supabase-migration-initial-tables.sql 처럼 "yearMonth" 등 quoted camelCase
 * - snake_case: supabase-migration-normalized-full.sql 의 year_month
 */
const REPO_COLUMNS = (import.meta.env.VITE_SUPABASE_REPO_COLUMNS as string) || 'camelCase'

function toSnakeCaseKeys(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
    out[snake] = v
  }
  return out
}

/** 수입·월별 행 upsert 시 DB 컬럼명에 맞게 변환 */
function repoPayload(row: Record<string, unknown>): Record<string, unknown> {
  return REPO_COLUMNS === 'snake_case' ? toSnakeCaseKeys(row) : row
}

function str(r: Record<string, unknown>, snake: string, camel: string, fallback = ''): string {
  const v = r[snake] ?? r[camel]
  return v == null ? fallback : String(v)
}

function num(r: Record<string, unknown>, snake: string, camel: string, fallback = 0): number {
  const v = r[snake] ?? r[camel]
  if (v == null) return fallback
  const n = Number(v)
  return Number.isFinite(n) ? n : fallback
}

function yearMonthOf(r: Record<string, unknown>): string {
  return str(r, 'year_month', 'yearMonth')
}

const STORAGE_PREFIX = 'couple-budget'
const REPO_PREFIX = `${STORAGE_PREFIX}:repo:`

const KEY_APP = `${STORAGE_PREFIX}:app`
const KEY_FIXED_TPL = `${STORAGE_PREFIX}:fixed-templates`
const KEY_INVEST_TPL = `${STORAGE_PREFIX}:invest-templates`
const KEY_PLAN_EXTRA = `${STORAGE_PREFIX}:plan-extra`
const KEY_SETTLEMENTS = `${STORAGE_PREFIX}:settlements`
const KEY_REPO_INCOMES = `${REPO_PREFIX}incomes`

type PersistWrap<T> = { state: T; version: number }

function wrapPersist<T>(state: T): PersistWrap<T> {
  return { state, version: 0 }
}

function writePersist(key: string, state: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(wrapPersist(state)))
  } catch (e) {
    console.warn('[supabase-sync] localStorage write failed', key, e)
  }
}

function readRepoIncomes(): Income[] {
  try {
    const raw = localStorage.getItem(KEY_REPO_INCOMES)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function buildAppSnapshotBody(): Record<string, unknown> {
  const bundle: Record<string, unknown> = {}
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i)
    if (!k?.startsWith(STORAGE_PREFIX)) continue
    const v = localStorage.getItem(k)
    if (v == null) continue
    try {
      bundle[k] = JSON.parse(v)
    } catch {
      bundle[k] = v
    }
  }
  return bundle
}

async function upsertAppSnapshot(householdId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!supabase) return { ok: false, reason: 'no client' }
  const body = buildAppSnapshotBody()
  const payload = {
    household_id: householdId,
    body,
    updated_at: new Date().toISOString(),
  }
  const { error } = await supabase.from('app_snapshot').upsert(payload, { onConflict: 'household_id' })
  if (error) return { ok: false, reason: error.message }
  return { ok: true }
}

async function fetchAppSnapshotBody(householdId: string): Promise<Record<string, unknown> | null> {
  if (!supabase) return null
  const { data, error } = await supabase
    .from('app_snapshot')
    .select('body')
    .eq('household_id', householdId)
    .maybeSingle()
  if (error || !data?.body || typeof data.body !== 'object') return null
  return data.body as Record<string, unknown>
}

async function hasAnyNormalizedSignal(householdId: string): Promise<boolean> {
  if (!supabase) return false
  const q = (t: string) =>
    supabase.from(t).select('id', { count: 'exact', head: true }).eq('household_id', householdId)
  const tables = ['fixed_templates', 'invest_templates', 'incomes', 'plan_snapshots'] as const
  const results = await Promise.all(tables.map((t) => q(t)))
  return results.some((r) => (r.count ?? 0) > 0)
}

// --- DB row types (스키마 컬럼명과 동일) ---

interface DbFixedTemplate {
  id: string
  household_id?: string
  person: string
  category: string
  description: string
  default_amount: number
  sort_order: number | null
  person_order: number | null
  pay_day: number | null
  default_separate: boolean | null
  default_separate_person: string | null
}

interface DbFixedOverride {
  household_id?: string
  template_id: string
  year_month: string
  amount: number | null
  is_excluded: boolean | null
  is_separate: boolean | null
}

interface DbInvestTemplate {
  id: string
  household_id?: string
  person: string
  category: string
  description: string
  default_amount: number
  sort_order: number | null
  person_order: number | null
  pay_day: number | null
  maturity_date: string | null
}

interface DbInvestOverride {
  household_id?: string
  template_id: string
  year_month: string
  amount: number | null
  is_excluded: boolean | null
}

interface DbPlanSnapshot {
  household_id?: string
  year_month: string
  fixed_snapshot: unknown
  invest_snapshot: unknown
}

interface DbSettlementRow {
  household_id?: string
  year_month: string
  summary_json: unknown
  full_settlement_json: unknown
  transfers_json: unknown
  settled_at: string | null
}

function incomePushRow(i: Income, householdId: string): Record<string, unknown> {
  const { personAName, personBName } = useAppStore.getState().settings
  const aLabel = personAName || '유저 1'
  const bLabel = personBName || '유저 2'
  let description = i.description ?? ''
  if (i.category === '급여' && i.person === 'A') description = aLabel
  if (i.category === '급여' && i.person === 'B') description = bLabel
  return {
    ...repoPayload({
      id: i.id,
      yearMonth: i.yearMonth,
      person: i.person,
      category: i.category,
      description: description || null,
      amount: i.amount,
    }),
    household_id: householdId,
  }
}

function incomeFromDbRow(r: Record<string, unknown>): Income {
  return {
    id: String(r.id ?? ''),
    yearMonth: yearMonthOf(r),
    person: str(r, 'person', 'person') as Income['person'],
    category: str(r, 'category', 'category'),
    description: str(r, 'description', 'description', ''),
    amount: num(r, 'amount', 'amount', 0),
  }
}

async function upsertChunk<T extends Record<string, unknown>>(
  table: string,
  rows: T[],
  onConflict: string,
): Promise<void> {
  if (!supabase || rows.length === 0) return
  const { error } = await supabase.from(table).upsert(rows, { onConflict })
  if (error) throw new Error(`${table}: ${error.message}`)
}

/** 부트스트랩: Auth 세션+가계 연결 시에만 원격 반영. 그 외 로컬만 사용 */
export async function hydrateFromSupabaseBeforeApp(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const householdId = getSyncHouseholdId()
  if (!householdId) return

  try {
    const normalized = await hasAnyNormalizedSignal(householdId)
    if (!normalized) {
      const body = await fetchAppSnapshotBody(householdId)
      if (body) {
        for (const [k, v] of Object.entries(body)) {
          if (!k.startsWith(STORAGE_PREFIX)) continue
          try {
            localStorage.setItem(k, typeof v === 'string' ? v : JSON.stringify(v))
          } catch (e) {
            console.warn('[supabase-sync] snapshot key write', k, e)
          }
        }
        return
      }
      /* 정규화 행도 app_snapshot 도 없음(가계 초기화 직후 등) → 아래 select 로 빈 서버 기준으로 로컬 덮어쓰기 */
    }

    const [
      { data: ft },
      { data: fo },
      { data: it },
      { data: io },
      { data: ps },
      { data: sd },
      { data: fx },
      { data: inv },
      { data: inc },
      { data: sep },
    ] = await Promise.all([
      supabase.from('fixed_templates').select('*').eq('household_id', householdId),
      supabase.from('fixed_template_overrides').select('*').eq('household_id', householdId),
      supabase.from('invest_templates').select('*').eq('household_id', householdId),
      supabase.from('invest_template_overrides').select('*').eq('household_id', householdId),
      supabase.from('plan_snapshots').select('*').eq('household_id', householdId),
      supabase.from('settlement_data').select('*').eq('household_id', householdId),
      supabase.from('fixed_expenses').select('*').eq('household_id', householdId),
      supabase.from('investments').select('*').eq('household_id', householdId),
      supabase.from('incomes').select('*').eq('household_id', householdId),
      supabase.from('separate_items').select('*').eq('household_id', householdId),
    ])

    const fixedTemplates = (ft ?? []) as DbFixedTemplate[]
    const fixedOverrides = (fo ?? []) as DbFixedOverride[]
    const investTemplates = (it ?? []) as DbInvestTemplate[]
    const investOverrides = (io ?? []) as DbInvestOverride[]
    const planSnaps = (ps ?? []) as DbPlanSnapshot[]
    const settlements = (sd ?? []) as DbSettlementRow[]
    const fixedExp = (fx ?? []) as unknown as Record<string, unknown>[]
    const investRows = (inv ?? []) as unknown as Record<string, unknown>[]
    const incomeRows = (inc ?? []) as unknown as Record<string, unknown>[]
    const sepRows = (sep ?? []) as unknown as Record<string, unknown>[]

    const templates = fixedTemplates.map((r) => ({
      id: r.id,
      person: r.person,
      category: r.category,
      description: r.description ?? '',
      defaultAmount: Number(r.default_amount),
      order: r.sort_order ?? undefined,
      personOrder: r.person_order ?? undefined,
      payDay: r.pay_day ?? undefined,
      defaultSeparate: !!r.default_separate,
      defaultSeparatePerson: (r.default_separate_person as 'A' | 'B' | undefined) ?? undefined,
    }))

    const exclusions: { templateId: string; yearMonth: string }[] = []
    const monthlyAmounts: Record<string, number> = {}
    const monthlySeparations: Record<string, boolean> = {}
    for (const o of fixedOverrides) {
      const or = o as unknown as Record<string, unknown>
      const tid = str(or, 'template_id', 'templateId')
      const ym = yearMonthOf(or)
      if (or.is_excluded === true || or.isExcluded === true)
        exclusions.push({ templateId: tid, yearMonth: ym })
      const key = `${tid}::${ym}`
      const amt = or.amount
      if (amt != null) monthlyAmounts[key] = Number(amt)
      const sep = or.is_separate ?? or.isSeparate
      if (sep != null) monthlySeparations[key] = !!sep
    }
    writePersist(KEY_FIXED_TPL, {
      templates,
      exclusions,
      monthlyAmounts,
      monthlySeparations,
    })

    const invTpls = investTemplates.map((r) => ({
      id: r.id,
      person: r.person,
      category: r.category,
      description: r.description ?? '',
      defaultAmount: Number(r.default_amount),
      order: r.sort_order ?? undefined,
      personOrder: r.person_order ?? undefined,
      payDay: r.pay_day ?? undefined,
      maturityDate: r.maturity_date ?? undefined,
    }))

    const invExclusions: { templateId: string; yearMonth: string }[] = []
    const invMonthlyAmounts: Record<string, number> = {}
    for (const o of investOverrides) {
      const or = o as unknown as Record<string, unknown>
      const tid = str(or, 'template_id', 'templateId')
      const ym = yearMonthOf(or)
      if (or.is_excluded === true || or.isExcluded === true)
        invExclusions.push({ templateId: tid, yearMonth: ym })
      const key = `${tid}::${ym}`
      if (or.amount != null) invMonthlyAmounts[key] = Number(or.amount)
    }
    writePersist(KEY_INVEST_TPL, {
      templates: invTpls,
      exclusions: invExclusions,
      monthlyAmounts: invMonthlyAmounts,
    })

    const templateSnapshotsByMonth: Record<string, { fixed: unknown[]; invest: unknown[] }> = {}
    for (const p of planSnaps) {
      const pr = p as unknown as Record<string, unknown>
      const pym = yearMonthOf(pr)
      const fx = pr.fixed_snapshot ?? pr.fixedSnapshot
      const iv = pr.invest_snapshot ?? pr.investSnapshot
      templateSnapshotsByMonth[pym] = {
        fixed: Array.isArray(fx) ? fx : [],
        invest: Array.isArray(iv) ? iv : [],
      }
    }

    const mapFixedRow = (r: Record<string, unknown>) => ({
      id: String(r.id),
      person: str(r, 'person', 'person'),
      category: str(r, 'category', 'category'),
      description: str(r, 'description', 'description', ''),
      amount: num(r, 'amount', 'amount'),
      isSeparate: !!(r.is_separate ?? r.isSeparate),
      separatePerson: (r.separate_person ?? r.separatePerson) as 'A' | 'B' | undefined,
      payDay: (r.pay_day ?? r.payDay) as number | undefined,
    })

    const mapInvestRow = (r: Record<string, unknown>) => ({
      id: String(r.id),
      person: str(r, 'person', 'person'),
      category: str(r, 'category', 'category'),
      description: str(r, 'description', 'description', ''),
      amount: num(r, 'amount', 'amount'),
    })

    const extraMapped: Record<
      string,
      { fixed: ReturnType<typeof mapFixedRow>[]; invest: ReturnType<typeof mapInvestRow>[] }
    > = {}
    for (const r of fixedExp) {
      if (r.is_separate ?? r.isSeparate) continue
      const ym = yearMonthOf(r)
      if (!extraMapped[ym]) extraMapped[ym] = { fixed: [], invest: [] }
      extraMapped[ym].fixed.push(mapFixedRow(r))
    }
    for (const r of investRows) {
      const ym = yearMonthOf(r)
      if (!extraMapped[ym]) extraMapped[ym] = { fixed: [], invest: [] }
      extraMapped[ym].invest.push(mapInvestRow(r))
    }

    const separateExpenseRowsByMonth: Record<string, ReturnType<typeof mapFixedRow>[]> = {}
    for (const r of fixedExp) {
      if (!(r.is_separate ?? r.isSeparate)) continue
      const ym = yearMonthOf(r)
      if (!separateExpenseRowsByMonth[ym]) separateExpenseRowsByMonth[ym] = []
      separateExpenseRowsByMonth[ym].push(mapFixedRow(r))
    }
    for (const r of sepRows) {
      const ym = yearMonthOf(r)
      if (!separateExpenseRowsByMonth[ym]) separateExpenseRowsByMonth[ym] = []
      separateExpenseRowsByMonth[ym].push({
        id: String(r.id),
        person: str(r, 'person', 'person'),
        category: str(r, 'category', 'category'),
        description: str(r, 'description', 'description', ''),
        amount: num(r, 'amount', 'amount'),
        isSeparate: true,
        separatePerson: undefined,
        payDay: undefined,
      })
    }

    let defaultSalaryExcludedByMonth: Record<string, Partial<Record<'A' | 'B', boolean>>> = {}
    const snapBody = await fetchAppSnapshotBody(householdId)
    const rawPlan = snapBody?.[KEY_PLAN_EXTRA] as PersistWrap<{
      defaultSalaryExcludedByMonth?: Record<string, Partial<Record<'A' | 'B', boolean>>>
    }> | undefined
    if (rawPlan?.state?.defaultSalaryExcludedByMonth) {
      defaultSalaryExcludedByMonth = { ...rawPlan.state.defaultSalaryExcludedByMonth }
    }

    writePersist(KEY_PLAN_EXTRA, {
      extraRowsByMonth: extraMapped,
      separateExpenseRowsByMonth,
      templateSnapshotsByMonth,
      defaultSalaryExcludedByMonth,
    })

    const monthlySettlements: MonthlySettlement[] = []
    const transfers: Record<string, boolean> = {}
    const settledMonths: string[] = []
    for (const row of settlements) {
      const sr = row as unknown as Record<string, unknown>
      const sym = yearMonthOf(sr)
      settledMonths.push(sym)
      const full = (sr.full_settlement_json ?? sr.fullSettlementJson) as MonthlySettlement | null
      if (
        full &&
        typeof full === 'object' &&
        !Array.isArray(full) &&
        'yearMonth' in full &&
        typeof (full as MonthlySettlement).yearMonth === 'string'
      ) {
        monthlySettlements.push(full as MonthlySettlement)
      }
      const tj = sr.transfers_json ?? sr.transfersJson
      if (tj && typeof tj === 'object' && !Array.isArray(tj)) {
        for (const [itemId, val] of Object.entries(tj as Record<string, boolean>)) {
          transfers[`${sym}::${itemId}`] = !!val
        }
      }
    }
    writePersist(KEY_SETTLEMENTS, {
      settlements: monthlySettlements,
      transfers,
    })

    try {
      localStorage.setItem(KEY_REPO_INCOMES, JSON.stringify(incomeRows.map(incomeFromDbRow)))
    } catch (e) {
      console.warn('[supabase-sync] repo incomes', e)
    }

    const ymSet = new Set<string>()
    for (const r of incomeRows) ymSet.add(yearMonthOf(r))
    for (const r of fixedExp) ymSet.add(yearMonthOf(r))
    for (const r of investRows) ymSet.add(yearMonthOf(r))
    for (const r of sepRows) ymSet.add(yearMonthOf(r))
    for (const p of planSnaps) ymSet.add(yearMonthOf(p as unknown as Record<string, unknown>))
    for (const s of settlements) ymSet.add(yearMonthOf(s as unknown as Record<string, unknown>))
    const inferredStarted = [...ymSet].sort()

    const rawApp = snapBody?.[KEY_APP] as PersistWrap<{
      currentYearMonth?: string
      yearPickerMaxYear?: number
      settings?: unknown
      startedMonths?: string[]
      settledMonths?: string[]
      lastSavedByMonth?: Record<string, string>
    }> | undefined

    const mergedSettled = [...new Set([...(rawApp?.state?.settledMonths ?? []), ...settledMonths])].sort()
    const mergedStarted = [...new Set([...(rawApp?.state?.startedMonths ?? []), ...inferredStarted])].sort()

    if (rawApp?.state) {
      writePersist(KEY_APP, {
        ...rawApp.state,
        startedMonths: mergedStarted.length ? mergedStarted : rawApp.state.startedMonths ?? [],
        settledMonths: mergedSettled,
      })
    } else {
      const now = new Date()
      const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
      writePersist(KEY_APP, {
        currentYearMonth: defaultYm,
        yearPickerMaxYear: Math.max(2026, now.getFullYear()),
        settings: {
          personAName: '유저 1',
          personBName: '유저 2',
          personAIncome: 0,
          personBIncome: 0,
          personAIncomeDay: 25,
          personBIncomeDay: 25,
          currency: 'KRW',
          sharedLivingCost: 0,
          sharedLivingCostRatioMode: '50:50',
          sharedLivingCostRatio: [50, 50],
          user1Color: '#FFADAD',
          user2Color: '#9BF6FF',
          sharedColor: '#065f46',
        },
        startedMonths: mergedStarted.length ? mergedStarted : [defaultYm],
        settledMonths: mergedSettled,
        lastSavedByMonth: {},
      })
    }
  } catch (e) {
    console.warn('[supabase-sync] hydrate failed, keeping local storage', e)
  }
}

export type SaveAllToSupabaseResult =
  | { ok: true; snapshotOk: boolean; snapshotHint?: string }
  | { ok: false; message: string }

export async function saveAllToSupabase(): Promise<SaveAllToSupabaseResult> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: 'Supabase가 설정되어 있지 않습니다. .env에 URL·anon 키를 넣어 주세요.' }
  }
  if (!supabase) {
    return { ok: false, message: 'Supabase 클라이언트를 초기화할 수 없습니다.' }
  }

  try {
    const {
      data: { session },
    } = await supabase.auth.getSession()
    if (!session) {
      return {
        ok: false,
        message:
          '클라우드 저장을 하려면 Supabase 세션과 가계 연결이 필요합니다. 계정 메뉴에서 서버 연결 후 가계 아이디로 참여했는지 확인해 주세요.',
      }
    }
    const householdId = getSyncHouseholdId()
    if (!householdId) {
      return {
        ok: false,
        message: '가계에 연결되어 있지 않습니다. 계정에서 가계 만들기 또는 초대 코드로 참여한 뒤 다시 시도해 주세요.',
      }
    }

    const [
      { useAppStore },
      { useFixedTemplateStore },
      { useInvestTemplateStore },
      { usePlanExtraStore },
      { useSettlementStore },
    ] = await Promise.all([
      import('@/store/useAppStore'),
      import('@/store/useFixedTemplateStore'),
      import('@/store/useInvestTemplateStore'),
      import('@/store/usePlanExtraStore'),
      import('@/store/useSettlementStore'),
    ])

    const fixedS = useFixedTemplateStore.getState()
    const investS = useInvestTemplateStore.getState()
    const planS = usePlanExtraStore.getState()
    const appS = useAppStore.getState()
    const settleS = useSettlementStore.getState()

    const fixedTplRows: DbFixedTemplate[] = fixedS.templates.map((t) => ({
      id: t.id,
      household_id: householdId,
      person: t.person,
      category: t.category,
      description: t.description ?? '',
      default_amount: t.defaultAmount,
      sort_order: t.order ?? 0,
      person_order: t.personOrder ?? 0,
      pay_day: t.payDay ?? null,
      default_separate: !!t.defaultSeparate,
      default_separate_person: t.defaultSeparatePerson ?? null,
    }))
    await upsertChunk('fixed_templates', fixedTplRows as unknown as Record<string, unknown>[], 'id')

    const fixedOverrideKeys = new Set<string>()
    for (const e of fixedS.exclusions) {
      fixedOverrideKeys.add(`${e.templateId}::${e.yearMonth}`)
    }
    for (const k of Object.keys(fixedS.monthlyAmounts)) {
      if (k.includes('::')) fixedOverrideKeys.add(k)
    }
    for (const k of Object.keys(fixedS.monthlySeparations)) {
      if (k.includes('::')) fixedOverrideKeys.add(k)
    }
    const fixedOvRows: DbFixedOverride[] = [...fixedOverrideKeys].map((compound) => {
      const idx = compound.lastIndexOf('::')
      const templateId = compound.slice(0, idx)
      const yearMonth = compound.slice(idx + 2)
      const isExcluded = fixedS.exclusions.some((e) => e.templateId === templateId && e.yearMonth === yearMonth)
      const amt = fixedS.monthlyAmounts[compound]
      const sepKey = compound
      const sep =
        fixedS.monthlySeparations[sepKey] !== undefined ? !!fixedS.monthlySeparations[sepKey] : null
      return {
        household_id: householdId,
        template_id: templateId,
        year_month: yearMonth,
        amount: amt !== undefined ? amt : null,
        is_excluded: isExcluded,
        is_separate: sep === null ? false : sep,
      }
    })
    await upsertChunk(
      'fixed_template_overrides',
      fixedOvRows as unknown as Record<string, unknown>[],
      'household_id,template_id,year_month',
    )

    const invTplRows: DbInvestTemplate[] = investS.templates.map((t) => ({
      id: t.id,
      household_id: householdId,
      person: t.person,
      category: t.category,
      description: t.description ?? '',
      default_amount: t.defaultAmount,
      sort_order: t.order ?? 0,
      person_order: t.personOrder ?? 0,
      pay_day: t.payDay ?? null,
      maturity_date: t.maturityDate ?? null,
    }))
    await upsertChunk('invest_templates', invTplRows as unknown as Record<string, unknown>[], 'id')

    const investOverrideKeys = new Set<string>()
    for (const e of investS.exclusions) {
      investOverrideKeys.add(`${e.templateId}::${e.yearMonth}`)
    }
    for (const k of Object.keys(investS.monthlyAmounts)) {
      if (k.includes('::')) investOverrideKeys.add(k)
    }
    const invOvRows: DbInvestOverride[] = [...investOverrideKeys].map((compound) => {
      const idx = compound.lastIndexOf('::')
      const templateId = compound.slice(0, idx)
      const yearMonth = compound.slice(idx + 2)
      const isExcluded = investS.exclusions.some((e) => e.templateId === templateId && e.yearMonth === yearMonth)
      const amt = investS.monthlyAmounts[compound]
      return {
        household_id: householdId,
        template_id: templateId,
        year_month: yearMonth,
        amount: amt !== undefined ? amt : null,
        is_excluded: isExcluded,
      }
    })
    await upsertChunk(
      'invest_template_overrides',
      invOvRows as unknown as Record<string, unknown>[],
      'household_id,template_id,year_month',
    )

    const planRows: DbPlanSnapshot[] = Object.entries(planS.templateSnapshotsByMonth).map(([ym, snap]) => ({
      household_id: householdId,
      year_month: ym,
      fixed_snapshot: snap.fixed,
      invest_snapshot: snap.invest,
    }))
    await upsertChunk('plan_snapshots', planRows as unknown as Record<string, unknown>[], 'household_id,year_month')

    const settledMonths = appS.settledMonths ?? []
    const settlementByYm = new Map(settleS.settlements.map((s) => [s.yearMonth, s]))
    const sdRows: Record<string, unknown>[] = settledMonths.map((ym) => {
      const ms = settlementByYm.get(ym)
      const transfersSlice: Record<string, boolean> = {}
      for (const [k, v] of Object.entries(settleS.transfers)) {
        if (k.startsWith(`${ym}::`)) {
          transfersSlice[k.slice(`${ym}::`.length)] = v
        }
      }
      return {
        household_id: householdId,
        year_month: ym,
        summary_json: { version: 1 },
        full_settlement_json: ms ?? null,
        transfers_json: transfersSlice,
        settled_at: ms?.settledAt ?? new Date().toISOString(),
      }
    })
    await upsertChunk('settlement_data', sdRows, 'household_id,year_month')

    const fixedExpenseRows: Record<string, unknown>[] = []
    for (const [ym, pack] of Object.entries(planS.extraRowsByMonth ?? {})) {
      for (const r of pack.fixed ?? []) {
        fixedExpenseRows.push({
          ...repoPayload({
            id: r.id,
            yearMonth: ym,
            person: r.person,
            category: r.category,
            description: r.description ?? null,
            amount: r.amount,
            isSeparate: !!r.isSeparate,
            separatePerson: r.separatePerson ?? null,
            payDay: r.payDay ?? null,
          }),
          household_id: householdId,
        })
      }
    }
    await upsertChunk('fixed_expenses', fixedExpenseRows, 'id')

    const investExtraRows: Record<string, unknown>[] = []
    for (const [ym, pack] of Object.entries(planS.extraRowsByMonth ?? {})) {
      for (const r of pack.invest ?? []) {
        investExtraRows.push({
          ...repoPayload({
            id: r.id,
            yearMonth: ym,
            person: r.person,
            category: r.category,
            description: r.description ?? null,
            amount: r.amount,
          }),
          household_id: householdId,
        })
      }
    }
    await upsertChunk('investments', investExtraRows, 'id')

    const incomes = readRepoIncomes().map((i) => incomePushRow(i, householdId))
    await upsertChunk('incomes', incomes, 'id')

    const separateOnly: Record<string, unknown>[] = []
    for (const [ym, rows] of Object.entries(planS.separateExpenseRowsByMonth ?? {})) {
      for (const r of rows) {
        separateOnly.push({
          ...repoPayload({
            id: r.id,
            yearMonth: ym,
            person: r.person,
            category: r.category,
            description: r.description ?? null,
            amount: r.amount,
          }),
          household_id: householdId,
        })
      }
    }
    await upsertChunk('separate_items', separateOnly, 'id')

    const snap = await upsertAppSnapshot(householdId)
    if (!snap.ok) {
      return {
        ok: true,
        snapshotOk: false,
        snapshotHint:
          '정규화 테이블은 반영되었습니다. app_snapshot 백업은 스키마·오류로 건너뛰었습니다.',
      }
    }
    return { ok: true, snapshotOk: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, message }
  }
}
