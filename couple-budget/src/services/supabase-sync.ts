/**
 * Supabase 정규화 테이블 ↔ 로컬(localStorage / Zustand persist) 동기화
 * - pull: 앱 부트스트랩 시 정규화 데이터 우선, 없으면 app_snapshot
 * - push: 정규화 테이블 upsert + app_snapshot 백업 (기존 saveAll 경로)
 */
import { supabase, isSupabaseConfigured } from '@/data/supabase'
import { getSyncHouseholdId } from '@/services/authHousehold'
import { rehydrateAllPersistedStores } from '@/store/rehydratePersistedStores'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { markPullSuccess, markPushSuccess, withSuppressedSyncTrackingAsync } from '@/services/syncMeta'
import { SUB_HUES, subOklch } from '@/styles/oklchSubColors'
import type { Income } from '@/types'
import type { MonthlySettlement } from '@/store/useSettlementStore'

/**
 * incomes / fixed_expenses / investments / separate_items 컬럼 규칙
 * - camelCase(기본): supabase-migration-initial-tables.sql 처럼 "yearMonth" 등 quoted camelCase
 * - snake_case: supabase-migration-normalized-full.sql 의 year_month
 */
/** 정규화 스키마(supabase-migration-normalized-full)는 snake_case. 구형 quoted camelCase DB만 `VITE_SUPABASE_REPO_COLUMNS=camelCase` */
const REPO_COLUMNS = ((import.meta.env.VITE_SUPABASE_REPO_COLUMNS as string) || 'snake_case').trim()

/**
 * 초기 스키마(supabase-migration-initial-tables)의 incomes만 "yearMonth" 컬럼인 경우가 있음.
 * 나머지 테이블은 year_month(snake)인데 incomes만 레거시면 true → upsert 시 yearMonth 키로 보냄.
 * 장기적으로는 supabase-migration-incomes-rename-year-month.sql 로 컬럼명 통일 권장.
 */
const INCOMES_LEGACY_YEAR_MONTH_COLUMN =
  import.meta.env.VITE_SUPABASE_INCOMES_LEGACY_YEAR_MONTH === 'true' ||
  import.meta.env.VITE_SUPABASE_INCOMES_LEGACY_YEAR_MONTH === '1'

/**
 * separate_items 가 예전 quoted 컬럼(yearMonth, separatePerson, isSeparate)만 있을 때.
 * snake_case 페이로드를 camel 키로 바꿔 upsert (정규화 컬럼이 이미 있으면 false 유지).
 */
const SEPARATE_ITEMS_LEGACY_CAMEL =
  import.meta.env.VITE_SUPABASE_SEPARATE_ITEMS_LEGACY_CAMEL === 'true' ||
  import.meta.env.VITE_SUPABASE_SEPARATE_ITEMS_LEGACY_CAMEL === '1'

/**
 * DB에 separate_person / is_separate 컬럼이 아직 없을 때만 임시로 true — 태그 필드는 동기화 안 됨.
 * Supabase에서 supabase-migration-separate-items-columns.sql 실행 후 끄세요.
 */
const SEPARATE_ITEMS_STRIP_EXTENDED_COLUMNS =
  import.meta.env.VITE_SUPABASE_SEPARATE_ITEMS_STRIP_EXTENDED_COLUMNS === 'true' ||
  import.meta.env.VITE_SUPABASE_SEPARATE_ITEMS_STRIP_EXTENDED_COLUMNS === '1'

/**
 * incomes upsert의 ON CONFLICT 대상 = DB의 UNIQUE/PK와 정확히 일치해야 함.
 * normalized-full·initial-tables 모두 PK는 `id`만 있음 → 기본은 id.
 * DB에 (household_id, year_month, person, category) 등 복합 유니크를 추가했다면 .env에 VITE_SUPABASE_INCOMES_ON_CONFLICT 로 지정.
 */
function incomesOnConflictColumns(): string {
  const o = (import.meta.env.VITE_SUPABASE_INCOMES_ON_CONFLICT as string)?.trim()
  if (o) return o
  return 'id'
}

/**
 * 로컬에 동일 (yearMonth, person, category) 행이 여러 개면 DB 유니크(incomes_yearmonth_person_category_unique 등)와 충돌함.
 * 한 슬롯당 하나만 남김(나중 항목 우선).
 * yearMonth가 없는 항목은 필터링하여 DB NOT NULL 제약 위반 방지
 */
function dedupeIncomesByMonthPersonCategory(incomes: Income[]): Income[] {
  const byKey = new Map<string, Income>()
  for (const inc of incomes) {
    // yearMonth가 없으면 스킵
    if (!inc.yearMonth) {
      console.warn('[supabase-sync] income without yearMonth — skipping:', inc)
      continue
    }
    const k = `${inc.yearMonth}\0${inc.person}\0${inc.category}`
    byKey.set(k, inc)
  }
  return [...byKey.values()]
}

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

/** separate_items upsert 본문: snake ↔ 레거시 camel, 또는 확장 컬럼 제거 */
function finalizeSeparateItemsPushPayload(p: Record<string, unknown>): Record<string, unknown> {
  let o = { ...p }
  if (SEPARATE_ITEMS_STRIP_EXTENDED_COLUMNS) {
    delete o.separate_person
    delete o.separatePerson
    delete o.is_separate
    delete o.isSeparate
  }
  if (SEPARATE_ITEMS_LEGACY_CAMEL && REPO_COLUMNS === 'snake_case') {
    o = { ...o }
    if ('year_month' in o) {
      o.yearMonth = o.year_month
      delete o.year_month
    }
    if ('separate_person' in o) {
      o.separatePerson = o.separate_person
      delete o.separate_person
    }
    if ('is_separate' in o) {
      o.isSeparate = o.is_separate
      delete o.is_separate
    }
  }
  return o
}

const STORAGE_PREFIX = 'couple-budget'
const REPO_PREFIX = `${STORAGE_PREFIX}:repo:`

const KEY_APP = `${STORAGE_PREFIX}:app`
const KEY_FIXED_TPL = `${STORAGE_PREFIX}:fixed-templates`
const KEY_INVEST_TPL = `${STORAGE_PREFIX}:invest-templates`
const KEY_PLAN_EXTRA = `${STORAGE_PREFIX}:plan-extra`
const KEY_SETTLEMENTS = `${STORAGE_PREFIX}:settlements`
const KEY_REPO_INCOMES = `${REPO_PREFIX}incomes`
const KEY_ASSETS = `${STORAGE_PREFIX}:assets`

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

/** Zustand persist 항목의 `state`만 읽기 (hydrate 병합용) */
function readPersistedZustandState(key: string): Record<string, unknown> | null {
  try {
    const raw = localStorage.getItem(key)
    if (!raw) return null
    const p = JSON.parse(raw) as PersistWrap<Record<string, unknown>>
    if (!p || typeof p !== 'object' || p.state == null || typeof p.state !== 'object' || Array.isArray(p.state)) return null
    return p.state
  } catch (err) {
    console.warn(`[supabase-sync] localStorage 키 "${key}" 파싱 실패 — 데이터 손상 가능:`, err)
    return null
  }
}

/** plan-extra 등 월(YYYY-MM) 키 맵에서, 작성이 끝난 달 집합 밖 키 제거 */
function pruneMonthKeyedRecord(rec: Record<string, unknown>, keepMonths: Set<string>): void {
  for (const k of Object.keys(rec)) {
    if (!keepMonths.has(k)) delete rec[k]
  }
}

function pruneLastSavedByMonth(raw: unknown, keepStarted: Set<string>): Record<string, string> {
  const out: Record<string, string> = {}
  if (raw == null || typeof raw !== 'object' || Array.isArray(raw)) return out
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) {
    if (!keepStarted.has(k)) continue
    if (typeof v === 'string') out[k] = v
  }
  return out
}

/** useAppStore.settings 초기값과 동일 — 스냅샷 누락·부분 필드 시 공동생활비·유저명 등이 0으로 초기화되지 않게 함 */
const HYDRATE_DEFAULT_APP_SETTINGS: Record<string, unknown> = {
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
  user1Color: subOklch(SUB_HUES[0]),
  user2Color: subOklch(SUB_HUES[1]),
  sharedColor: subOklch(SUB_HUES[2]),
}

/** defaults ← 로컬(스냅샷에 없는 키 보존) ← 스냅샷(서버가 보낸 키는 우선). 다기기 동기화 + 부분 스냅샷 호환 */
function mergeAppSettingsForHydrate(snapshotSettings: unknown, localSettings: unknown): Record<string, unknown> {
  const snap =
    snapshotSettings != null && typeof snapshotSettings === 'object' && !Array.isArray(snapshotSettings)
      ? (snapshotSettings as Record<string, unknown>)
      : {}
  const loc =
    localSettings != null && typeof localSettings === 'object' && !Array.isArray(localSettings)
      ? (localSettings as Record<string, unknown>)
      : {}
  return { ...HYDRATE_DEFAULT_APP_SETTINGS, ...loc, ...snap }
}

function readRepoIncomes(): Income[] {
  try {
    const raw = localStorage.getItem(KEY_REPO_INCOMES)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch (err) {
    console.warn('[supabase-sync] income repo localStorage 파싱 실패 — 빈 배열로 대체:', err)
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

/**
 * persist는 대개 즉시 localStorage에 쓰지만, 일부 타이밍에서 스냅샷만 오래된 JSON을 올릴 수 있음.
 * Zustand partialize와 동일한 필드로 메모리 상태를 스냅샷 본문에 덮어씀.
 */
function overlayLiveCoupleBudgetStateOnSnapshotBundle(body: Record<string, unknown>): void {
  const app = useAppStore.getState()
  body[KEY_APP] = wrapPersist({
    currentYearMonth: app.currentYearMonth,
    yearPickerMaxYear: app.yearPickerMaxYear,
    settings: app.settings,
    startedMonths: app.startedMonths,
    settledMonths: app.settledMonths,
    lastSavedByMonth: app.lastSavedByMonth,
  })
  const fixed = useFixedTemplateStore.getState()
  body[KEY_FIXED_TPL] = wrapPersist({
    templates: fixed.templates,
    exclusions: fixed.exclusions,
    monthlyAmounts: fixed.monthlyAmounts,
    monthlySeparations: fixed.monthlySeparations,
  })
  const invest = useInvestTemplateStore.getState()
  body[KEY_INVEST_TPL] = wrapPersist({
    templates: invest.templates,
    exclusions: invest.exclusions,
    monthlyAmounts: invest.monthlyAmounts,
  })
  const plan = usePlanExtraStore.getState()
  body[KEY_PLAN_EXTRA] = wrapPersist({
    extraRowsByMonth: plan.extraRowsByMonth,
    separateExpenseRowsByMonth: plan.separateExpenseRowsByMonth,
    templateSnapshotsByMonth: plan.templateSnapshotsByMonth,
    defaultSalaryExcludedByMonth: plan.defaultSalaryExcludedByMonth,
  })
  const settle = useSettlementStore.getState()
  body[KEY_SETTLEMENTS] = wrapPersist({
    settlements: settle.settlements,
    transfers: settle.transfers,
  })
}

async function upsertAppSnapshot(householdId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  if (!supabase) return { ok: false, reason: 'no client' }
  const body = buildAppSnapshotBody()
  overlayLiveCoupleBudgetStateOnSnapshotBundle(body)
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
    supabase.from(t).select('household_id', { count: 'exact', head: true }).eq('household_id', householdId)
  const tables = ['fixed_templates', 'invest_templates', 'incomes'] as const
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
  const p = repoPayload({
    id: i.id,
    yearMonth: i.yearMonth,
    person: i.person,
    category: i.category,
    description: description || null,
    amount: i.amount,
  }) as Record<string, unknown>
  if (INCOMES_LEGACY_YEAR_MONTH_COLUMN && REPO_COLUMNS === 'snake_case') {
    const ym = p.year_month
    if (ym != null) {
      delete p.year_month
      p.yearMonth = ym
    }
  }
  return {
    ...p,
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

/** delete().in() 한 번에 넣을 id 개수 상한 */
const DELETE_ID_CHUNK = 80

/**
 * 로컬 스토어에서 제거된 템플릿은 upsert만으로는 DB에 남음 → 다음 hydrate 시 부활함.
 * 고정/투자 각각: 월별 override 먼저 지운 뒤 템플릿 행 삭제.
 */
async function deleteOrphanFixedTemplates(householdId: string, keepIds: Set<string>): Promise<void> {
  if (!supabase) return
  const { data: rows, error: selErr } = await supabase
    .from('fixed_templates')
    .select('id')
    .eq('household_id', householdId)
  if (selErr) throw new Error(`fixed_templates(select id): ${selErr.message}`)
  const toRemove = (rows ?? [])
    .map((r) => String((r as { id: unknown }).id))
    .filter((id) => id && !keepIds.has(id))
  if (toRemove.length === 0) return
  for (let i = 0; i < toRemove.length; i += DELETE_ID_CHUNK) {
    const slice = toRemove.slice(i, i + DELETE_ID_CHUNK)
    const { error: oErr } = await supabase
      .from('fixed_template_overrides')
      .delete()
      .eq('household_id', householdId)
      .in('template_id', slice)
    if (oErr) throw new Error(`fixed_template_overrides(delete): ${oErr.message}`)
  }
  for (let i = 0; i < toRemove.length; i += DELETE_ID_CHUNK) {
    const slice = toRemove.slice(i, i + DELETE_ID_CHUNK)
    const { error: tErr } = await supabase
      .from('fixed_templates')
      .delete()
      .eq('household_id', householdId)
      .in('id', slice)
    if (tErr) throw new Error(`fixed_templates(delete): ${tErr.message}`)
  }
}

async function deleteOrphanInvestTemplates(householdId: string, keepIds: Set<string>): Promise<void> {
  if (!supabase) return
  const { data: rows, error: selErr } = await supabase
    .from('invest_templates')
    .select('id')
    .eq('household_id', householdId)
  if (selErr) throw new Error(`invest_templates(select id): ${selErr.message}`)
  const toRemove = (rows ?? [])
    .map((r) => String((r as { id: unknown }).id))
    .filter((id) => id && !keepIds.has(id))
  if (toRemove.length === 0) return
  for (let i = 0; i < toRemove.length; i += DELETE_ID_CHUNK) {
    const slice = toRemove.slice(i, i + DELETE_ID_CHUNK)
    const { error: oErr } = await supabase
      .from('invest_template_overrides')
      .delete()
      .eq('household_id', householdId)
      .in('template_id', slice)
    if (oErr) throw new Error(`invest_template_overrides(delete): ${oErr.message}`)
  }
  for (let i = 0; i < toRemove.length; i += DELETE_ID_CHUNK) {
    const slice = toRemove.slice(i, i + DELETE_ID_CHUNK)
    const { error: tErr } = await supabase
      .from('invest_templates')
      .delete()
      .eq('household_id', householdId)
      .in('id', slice)
    if (tErr) throw new Error(`invest_templates(delete): ${tErr.message}`)
  }
}

/**
 * `startedMonths` / `settledMonths`에서 빠진 월은 로컬에서만 지워도 DB·hydrate 시 `inferredStarted`로 부활함.
 * 전체 저장 시 가계 기준으로 해당 월의 계획·정산 행을 제거한다.
 */
async function deleteOrphanHouseholdPlanMonths(
  householdId: string,
  startedMonths: string[],
  settledMonths: string[],
): Promise<void> {
  if (!supabase) return
  const started = new Set(startedMonths)
  const settled = new Set(settledMonths)
  if (started.size === 0) return

  const delIdsChunked = async (table: string, ids: string[]) => {
    for (let i = 0; i < ids.length; i += DELETE_ID_CHUNK) {
      const slice = ids.slice(i, i + DELETE_ID_CHUNK)
      const { error } = await supabase.from(table).delete().in('id', slice)
      if (error) throw new Error(`${table}(delete orphan): ${error.message}`)
    }
  }

  const orphanIds = (rows: Record<string, unknown>[]) => {
    const ids: string[] = []
    for (const r of rows) {
      const ym = yearMonthOf(r)
      if (!ym || started.has(ym)) continue
      const id = r.id
      if (id != null && String(id).length > 0) ids.push(String(id))
    }
    return ids
  }

  for (const table of ['incomes', 'fixed_expenses', 'investments', 'separate_items'] as const) {
    const { data, error } = await supabase.from(table).select('*').eq('household_id', householdId)
    if (error) throw new Error(`${table}(select orphan): ${error.message}`)
    const ids = orphanIds((data ?? []) as Record<string, unknown>[])
    if (ids.length) await delIdsChunked(table, ids)
  }

  const { data: sdRows, error: sdErr } = await supabase
    .from('settlement_data')
    .select('year_month')
    .eq('household_id', householdId)
  if (sdErr) throw new Error(`settlement_data(select orphan): ${sdErr.message}`)
  for (const row of sdRows ?? []) {
    const ym = yearMonthOf(row as Record<string, unknown>)
    if (!ym || settled.has(ym)) continue
    const { error: dErr } = await supabase
      .from('settlement_data')
      .delete()
      .eq('household_id', householdId)
      .eq('year_month', ym)
    if (dErr) throw new Error(`settlement_data(delete orphan): ${dErr.message}`)
  }
}

/**
 * 작성 삭제 후에도 fixed/invest template_overrides 행이 DB에 남으면 다음 저장·hydrate에서 월 데이터가 되살아날 수 있음.
 */
async function deleteOrphanTemplateOverrides(householdId: string, startedMonths: string[]): Promise<void> {
  if (!supabase) return
  const started = new Set(startedMonths)
  if (started.size === 0) return

  for (const table of ['fixed_template_overrides', 'invest_template_overrides'] as const) {
    const { data, error } = await supabase
      .from(table)
      .select('template_id, year_month')
      .eq('household_id', householdId)
    if (error) throw new Error(`${table}(select orphan ym): ${error.message}`)
    const orphans: { templateId: string; ym: string }[] = []
    for (const r of data ?? []) {
      const row = r as Record<string, unknown>
      const ym = str(row, 'year_month', 'yearMonth')
      const templateId = str(row, 'template_id', 'templateId')
      if (!ym || !templateId || started.has(ym)) continue
      orphans.push({ templateId, ym })
    }
    for (const { templateId, ym } of orphans) {
      const { error: dErr } = await supabase
        .from(table)
        .delete()
        .eq('household_id', householdId)
        .eq('template_id', templateId)
        .eq('year_month', ym)
      if (dErr) throw new Error(`${table}(delete orphan ym): ${dErr.message}`)
    }
  }
}

/** 부트스트랩: Auth 세션+가계 연결 시에만 원격 반영. 그 외 로컬만 사용 */
export async function hydrateFromSupabaseBeforeApp(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return

  const householdId = getSyncHouseholdId()
  if (!householdId) return

  await withSuppressedSyncTrackingAsync(async () => {
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
        await rehydrateAllPersistedStores()
        markPullSuccess()
        return
      }
      /* 정규화 행도 app_snapshot 도 없음(가계 초기화 직후 등) → 아래 select 로 빈 서버 기준으로 로컬 덮어쓰기 */
    }

    const [
      { data: ft },
      { data: fo },
      { data: it },
      { data: io },
      { data: sd },
      { data: fx },
      { data: inv },
      { data: inc },
      { data: sep },
      { data: assetItemsData },
      { data: assetEntriesData },
    ] = await Promise.all([
      supabase.from('fixed_templates').select('*').eq('household_id', householdId),
      supabase.from('fixed_template_overrides').select('*').eq('household_id', householdId),
      supabase.from('invest_templates').select('*').eq('household_id', householdId),
      supabase.from('invest_template_overrides').select('*').eq('household_id', householdId),
      supabase.from('settlement_data').select('*').eq('household_id', householdId),
      supabase.from('fixed_expenses').select('*').eq('household_id', householdId),
      supabase.from('investments').select('*').eq('household_id', householdId),
      supabase.from('incomes').select('*').eq('household_id', householdId),
      supabase.from('separate_items').select('*').eq('household_id', householdId),
      supabase.from('asset_items').select('*').eq('household_id', householdId).order('sort_order'),
      supabase.from('asset_entries').select('*').eq('household_id', householdId),
    ])

    const fixedTemplates = (ft ?? []) as DbFixedTemplate[]
    const fixedOverrides = (fo ?? []) as DbFixedOverride[]
    const investTemplates = (it ?? []) as DbInvestTemplate[]
    const investOverrides = (io ?? []) as DbInvestOverride[]
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

    // templateSnapshotsByMonth is recalculated on-the-fly from template data by the client
    // No longer fetched from plan_snapshots table (removed in Phase 1 optimization)
    const templateSnapshotsByMonth: Record<string, { fixed: unknown[]; invest: unknown[] }> = {}

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

    /** 같은 id가 fixed_expenses(is_separate)와 separate_items 둘 다에 있으면 중복 행이 생겨 편집이 되돌아가는 것처럼 보임 → id당 하나만 유지, 나중(separate_items)이 우선 */
    const separateByMonthId = new Map<string, Map<string, ReturnType<typeof mapFixedRow>>>()
    const putSeparate = (ym: string, row: ReturnType<typeof mapFixedRow>) => {
      if (!separateByMonthId.has(ym)) separateByMonthId.set(ym, new Map())
      separateByMonthId.get(ym)!.set(row.id, row)
    }
    for (const r of fixedExp) {
      if (!(r.is_separate ?? r.isSeparate)) continue
      putSeparate(yearMonthOf(r), { ...mapFixedRow(r), person: '공금' })
    }
    for (const r of sepRows) {
      const ym = yearMonthOf(r)
      const sp = r.separate_person ?? r.separatePerson
      const sepFlag = r.is_separate ?? r.isSeparate
      putSeparate(ym, {
        id: String(r.id),
        person: '공금',
        category: str(r, 'category', 'category'),
        description: str(r, 'description', 'description', ''),
        amount: num(r, 'amount', 'amount'),
        isSeparate: sepFlag == null ? true : !!sepFlag,
        separatePerson:
          sp === 'A' || sp === 'B' ? sp : undefined,
        payDay: undefined,
      })
    }
    const separateExpenseRowsByMonth: Record<string, ReturnType<typeof mapFixedRow>[]> = {}
    for (const [ym, idMap] of separateByMonthId) {
      separateExpenseRowsByMonth[ym] = [...idMap.values()]
    }

    let defaultSalaryExcludedByMonth: Record<string, Partial<Record<'A' | 'B', boolean>>> = {}
    const snapBody = await fetchAppSnapshotBody(householdId)
    const rawPlan = snapBody?.[KEY_PLAN_EXTRA] as PersistWrap<{
      defaultSalaryExcludedByMonth?: Record<string, Partial<Record<'A' | 'B', boolean>>>
    }> | undefined
    if (rawPlan?.state?.defaultSalaryExcludedByMonth) {
      defaultSalaryExcludedByMonth = { ...rawPlan.state.defaultSalaryExcludedByMonth }
    }

    /** 서버에 아직 없는 월의 로컬 추가·별도 지출이 hydrate 한 번에 사라지지 않도록 병합 */
    const localPlan = readPersistedZustandState(KEY_PLAN_EXTRA)
    const localExtra = localPlan?.extraRowsByMonth
    const localSep = localPlan?.separateExpenseRowsByMonth
    const localTpl = localPlan?.templateSnapshotsByMonth
    const localDefEx = localPlan?.defaultSalaryExcludedByMonth
    const mergedExtraRowsByMonth: Record<string, unknown> = {
      ...(localExtra != null && typeof localExtra === 'object' && !Array.isArray(localExtra)
        ? (localExtra as Record<string, unknown>)
        : {}),
    }
    for (const [ym, pack] of Object.entries(extraMapped)) {
      mergedExtraRowsByMonth[ym] = pack
    }
    const mergedSeparateExpenseRowsByMonth: Record<string, unknown> = {
      ...(localSep != null && typeof localSep === 'object' && !Array.isArray(localSep)
        ? (localSep as Record<string, unknown>)
        : {}),
    }
    for (const [ym, rows] of Object.entries(separateExpenseRowsByMonth)) {
      mergedSeparateExpenseRowsByMonth[ym] = rows
    }
    const mergedTemplateSnapshotsByMonth: Record<string, unknown> = {
      ...(localTpl != null && typeof localTpl === 'object' && !Array.isArray(localTpl)
        ? (localTpl as Record<string, unknown>)
        : {}),
    }
    for (const [ym, snap] of Object.entries(templateSnapshotsByMonth)) {
      mergedTemplateSnapshotsByMonth[ym] = snap
    }
    const mergedDefaultSalaryExcluded: Record<string, unknown> = {
      ...(localDefEx != null && typeof localDefEx === 'object' && !Array.isArray(localDefEx)
        ? (localDefEx as Record<string, unknown>)
        : {}),
      ...defaultSalaryExcludedByMonth,
    }

    const monthlySettlements: MonthlySettlement[] = []
    const transfersFull: Record<string, boolean> = {}
    const settledYmsFromDb: string[] = []
    for (const row of settlements) {
      const sr = row as unknown as Record<string, unknown>
      const sym = yearMonthOf(sr)
      settledYmsFromDb.push(sym)
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
          transfersFull[`${sym}::${itemId}`] = !!val
        }
      }
    }

    const ymSet = new Set<string>()
    for (const r of incomeRows) ymSet.add(yearMonthOf(r))
    for (const r of fixedExp) ymSet.add(yearMonthOf(r))
    for (const r of investRows) ymSet.add(yearMonthOf(r))
    for (const r of sepRows) ymSet.add(yearMonthOf(r))
    for (const s of settlements) ymSet.add(yearMonthOf(s as unknown as Record<string, unknown>))
    const inferredStarted = [...ymSet].sort()
    const inferredStartedSet = new Set(inferredStarted)

    const rawApp = snapBody?.[KEY_APP] as PersistWrap<{
      currentYearMonth?: string
      yearPickerMaxYear?: number
      settings?: unknown
      startedMonths?: string[]
      settledMonths?: string[]
      lastSavedByMonth?: Record<string, string>
    }> | undefined

    const localAppState = readPersistedZustandState(KEY_APP)

    const locStarted = Array.isArray(localAppState?.startedMonths) ? (localAppState.startedMonths as string[]) : []
    const srvStarted = Array.isArray(rawApp?.state?.startedMonths) ? (rawApp.state.startedMonths as string[]) : []
    /** app_snapshot만 오래된 경우: 스냅샷의 startedMonths ∪ 로컬 이 삭제 월을 되살림 → 서버 월은 DB에 실제 행이 있을 때만 채택 */
    const srvStartedWithRows = srvStarted.filter((m) => inferredStartedSet.has(m))
    let mergedStarted = [...new Set([...locStarted, ...srvStartedWithRows])].sort()
    if (mergedStarted.length === 0) mergedStarted = [...new Set(inferredStarted)].sort()

    const locSettled = Array.isArray(localAppState?.settledMonths) ? (localAppState.settledMonths as string[]) : []
    const srvSettled = Array.isArray(rawApp?.state?.settledMonths) ? (rawApp.state.settledMonths as string[]) : []
    const settledFromDbSet = new Set(settledYmsFromDb)
    const srvSettledWithRows = srvSettled.filter((m) => settledFromDbSet.has(m))
    let mergedSettled = [...new Set([...locSettled, ...srvSettledWithRows])].sort()
    if (mergedSettled.length === 0) mergedSettled = [...settledFromDbSet].sort()

    const mergedStartedSet = new Set(mergedStarted)
    const mergedSettledSet = new Set(mergedSettled)
    pruneMonthKeyedRecord(mergedExtraRowsByMonth, mergedStartedSet)
    pruneMonthKeyedRecord(mergedSeparateExpenseRowsByMonth, mergedStartedSet)
    pruneMonthKeyedRecord(mergedTemplateSnapshotsByMonth, mergedStartedSet)
    pruneMonthKeyedRecord(mergedDefaultSalaryExcluded, mergedStartedSet)

    writePersist(KEY_PLAN_EXTRA, {
      extraRowsByMonth: mergedExtraRowsByMonth,
      separateExpenseRowsByMonth: mergedSeparateExpenseRowsByMonth,
      templateSnapshotsByMonth: mergedTemplateSnapshotsByMonth,
      defaultSalaryExcludedByMonth: mergedDefaultSalaryExcluded,
    })

    const persistedSettlements = monthlySettlements.filter((s) => mergedSettledSet.has(s.yearMonth))
    const persistedTransfers: Record<string, boolean> = {}
    for (const [k, v] of Object.entries(transfersFull)) {
      const ym = k.split('::')[0] ?? ''
      if (mergedSettledSet.has(ym)) persistedTransfers[k] = v
    }
    writePersist(KEY_SETTLEMENTS, {
      settlements: persistedSettlements,
      transfers: persistedTransfers,
    })

    try {
      localStorage.setItem(KEY_REPO_INCOMES, JSON.stringify(incomeRows.map(incomeFromDbRow)))
    } catch (e) {
      console.warn('[supabase-sync] repo incomes', e)
    }

    // Assets hydration
    if (assetItemsData && assetItemsData.length > 0) {
      const pulledItems = (assetItemsData as Record<string, unknown>[]).map((r) => ({
        id: r.id as string,
        name: r.name as string,
        category: r.category as string,
        order: (r.sort_order as number) ?? 0,
        source: (r.source as 'invest' | 'manual' | undefined) ?? 'manual',
      }))
      const pulledEntries = (assetEntriesData ?? []).map((r) => {
        const row = r as Record<string, unknown>
        return {
          id: row.id as string,
          itemId: row.item_id as string,
          yearMonth: row.year_month as string,
          amount: Number(row.amount),
        }
      })
      writePersist(KEY_ASSETS, { items: pulledItems, entries: pulledEntries })
    }
    const now = new Date()
    const defaultYm = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`

    if (rawApp?.state && typeof rawApp.state === 'object') {
      const st = rawApp.state as Record<string, unknown>
      const mergedSettings = mergeAppSettingsForHydrate(st.settings, localAppState?.settings)
      const sm = mergedStarted.length ? mergedStarted : ((st.startedMonths as string[]) ?? [])
      const startedSetForLsb = new Set(sm)
      writePersist(KEY_APP, {
        ...st,
        settings: mergedSettings,
        startedMonths: sm,
        settledMonths: mergedSettled,
        lastSavedByMonth: pruneLastSavedByMonth(st.lastSavedByMonth, startedSetForLsb),
      })
    } else if (localAppState) {
      const mergedSettings = mergeAppSettingsForHydrate(undefined, localAppState.settings)
      const sm = mergedStarted.length ? mergedStarted : ((localAppState.startedMonths as string[]) ?? [defaultYm])
      const startedSetForLsb = new Set(sm)
      writePersist(KEY_APP, {
        ...localAppState,
        settings: mergedSettings,
        startedMonths: sm,
        settledMonths: mergedSettled,
        lastSavedByMonth: pruneLastSavedByMonth(localAppState.lastSavedByMonth, startedSetForLsb),
      })
    } else {
      const sm = mergedStarted.length ? mergedStarted : [defaultYm]
      writePersist(KEY_APP, {
        currentYearMonth: defaultYm,
        yearPickerMaxYear: Math.max(2026, now.getFullYear()),
        settings: { ...HYDRATE_DEFAULT_APP_SETTINGS },
        startedMonths: sm,
        settledMonths: mergedSettled,
        lastSavedByMonth: {},
      })
    }

    await rehydrateAllPersistedStores()
    markPullSuccess()
  } catch (e) {
    console.warn('[supabase-sync] hydrate failed, keeping local storage', e)
  }
  })
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
      { useAssetStore },
    ] = await Promise.all([
      import('@/store/useAppStore'),
      import('@/store/useFixedTemplateStore'),
      import('@/store/useInvestTemplateStore'),
      import('@/store/usePlanExtraStore'),
      import('@/store/useSettlementStore'),
      import('@/store/useAssetStore'),
    ])

    const fixedS = useFixedTemplateStore.getState()
    const investS = useInvestTemplateStore.getState()
    const planS = usePlanExtraStore.getState()
    const appS = useAppStore.getState()
    const settleS = useSettlementStore.getState()

    await deleteOrphanHouseholdPlanMonths(householdId, appS.startedMonths ?? [], appS.settledMonths ?? [])
    await deleteOrphanTemplateOverrides(householdId, appS.startedMonths ?? [])

    await deleteOrphanFixedTemplates(householdId, new Set(fixedS.templates.map((t) => t.id)))

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

    await deleteOrphanInvestTemplates(householdId, new Set(investS.templates.map((t) => t.id)))

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

    // plan_snapshots table removed in Phase 1 optimization
    // Snapshots are now recalculated on-the-fly from template data by the client

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

    const incomes = dedupeIncomesByMonthPersonCategory(readRepoIncomes()).map((i) =>
      incomePushRow(i, householdId),
    )
    await upsertChunk('incomes', incomes, incomesOnConflictColumns())

    const separateOnly: Record<string, unknown>[] = []
    for (const [ym, rows] of Object.entries(planS.separateExpenseRowsByMonth ?? {})) {
      for (const r of rows) {
        separateOnly.push(
          finalizeSeparateItemsPushPayload({
            ...repoPayload({
              id: r.id,
              yearMonth: ym,
              person: r.person,
              category: r.category,
              description: r.description ?? null,
              amount: r.amount,
              isSeparate: r.isSeparate ?? true,
              separatePerson: r.separatePerson ?? null,
            }),
            household_id: householdId,
          }),
        )
      }
    }
    await upsertChunk('separate_items', separateOnly, 'id')

    // Asset items & entries
    const assetS = useAssetStore.getState()
    const assetItemRows = assetS.items.map((item) => ({
      id: item.id,
      household_id: householdId,
      name: item.name,
      category: item.category,
      sort_order: item.order,
      source: item.source ?? null,
    }))
    if (assetItemRows.length > 0) {
      await upsertChunk('asset_items', assetItemRows as unknown as Record<string, unknown>[], 'id')
    }
    const assetEntryRows = assetS.entries.map((entry) => ({
      id: entry.id,
      household_id: householdId,
      item_id: entry.itemId,
      year_month: entry.yearMonth,
      amount: entry.amount,
    }))
    if (assetEntryRows.length > 0) {
      await upsertChunk('asset_entries', assetEntryRows as unknown as Record<string, unknown>[], 'id')
    }

    const snap = await upsertAppSnapshot(householdId)
    if (!snap.ok) {
      markPushSuccess()
      return {
        ok: true,
        snapshotOk: false,
        snapshotHint: `정규화 테이블은 반영되었습니다. app_snapshot 백업만 실패했습니다. (${snap.reason})`,
      }
    }
    markPushSuccess()
    return { ok: true, snapshotOk: true }
  } catch (e) {
    const message = e instanceof Error ? e.message : String(e)
    return { ok: false, message }
  }
}
