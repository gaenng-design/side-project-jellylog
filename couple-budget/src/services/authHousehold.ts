import { supabase, isSupabaseConfigured, COUPLE_BUDGET_SUPABASE_AUTH_KEY } from '@/data/supabase'

const SYNC_HOUSEHOLD_KEY = 'couple-budget:sync-household-id'
/** 이 기기에만 저장. 앱 재실행·익명 세션 갱신 후 같은 가계에 다시 붙을 때 사용 */
const ACCESS_CODE_KEY = 'couple-budget:household-access-code'

/** 가계 미연결: 로컬의 월별·템플릿·설정 저장만 제거. Supabase 세션 키는 유지(직접 지우지 않음). */
export function clearCoupleBudgetLocalDataKeepAuth(): void {
  if (typeof localStorage === 'undefined') return
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (!k || k === COUPLE_BUDGET_SUPABASE_AUTH_KEY) continue
      if (k.startsWith('couple-budget')) keys.push(k)
    }
    for (const k of keys) localStorage.removeItem(k)
  } catch {
    /* ignore */
  }
}

export type EnsureSessionResult =
  | { ok: true; hadSession: boolean }
  | { ok: false; reason: string }

/**
 * Supabase JWT 세션(기본: 익명). 사용자에게는 "접속 코드"만 보이고, 여기는 백그라운드 연결입니다.
 */
export async function ensureSupabaseSessionForSync(): Promise<EnsureSessionResult> {
  if (!supabase || !isSupabaseConfigured) {
    return {
      ok: false,
      reason:
        'Supabase가 꺼져 있습니다. 프로젝트 루트 `.env`에 VITE_SUPABASE_URL·VITE_SUPABASE_ANON_KEY를 넣고, 값에 your-project-id / your-anon-key placeholder가 없어야 합니다. 저장 후 `npm run dev`를 다시 실행하세요.',
    }
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (session?.user) return { ok: true, hadSession: true }

  const { data, error } = await supabase.auth.signInAnonymously()
  if (error) {
    const msg = error.message || String(error)
    console.warn('[authHousehold] 익명 세션 생성 실패:', msg)
    return {
      ok: false,
      reason: `${msg} — 대시보드 Authentication → Sign In / Providers에서 Allow anonymous sign-ins 가 켜져 있는지, URL·anon 키가 이 프로젝트 것인지 확인하세요.`,
    }
  }
  if (!data.session?.user) {
    return {
      ok: false,
      reason:
        '연결 응답에 세션이 없습니다. 네트워크·프로젝트 설정을 확인하거나 잠시 후 다시 시도해 주세요.',
    }
  }
  return { ok: true, hadSession: false }
}

/** RPC 전에 호출. getSession()만 쓰면 auth.users 에 없는 고아 JWT로 household_members 삽입 시 FK 위반 가능 */
async function ensureFreshAuthUserForRpc(): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase 클라이언트가 없습니다.' }
  let {
    data: { user },
    error,
  } = await supabase.auth.getUser()
  if (!error && user?.id) return { ok: true }
  await supabase.auth.signOut()
  const ensured = await ensureSupabaseSessionForSync()
  if (!ensured.ok) return { ok: false, error: ensured.reason }
  ;({
    data: { user },
    error,
  } = await supabase.auth.getUser())
  if (error || !user?.id) {
    return {
      ok: false,
      error:
        '인증 사용자를 확인하지 못했습니다. DB를 초기화했다면 브라우저 개발자 도구 → Application → Local Storage 에서 이 사이트의 `couple-budget-supabase-auth` 항목을 지운 뒤 새로고침해 주세요.',
    }
  }
  return { ok: true }
}

function isHouseholdMembersUserFkError(message: string): boolean {
  return message.includes('household_members_user_id_fkey')
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function getSyncHouseholdId(): string | null {
  try {
    const v = localStorage.getItem(SYNC_HOUSEHOLD_KEY)
    if (!v || v === 'undefined' || v === 'null' || !UUID_RE.test(v)) {
      if (v) localStorage.removeItem(SYNC_HOUSEHOLD_KEY)
      return null
    }
    return v
  } catch {
    return null
  }
}

export function clearSyncHouseholdId(): void {
  try {
    localStorage.removeItem(SYNC_HOUSEHOLD_KEY)
  } catch {
    /* ignore */
  }
}

export function getSavedAccessCode(): string | null {
  try {
    const v = localStorage.getItem(ACCESS_CODE_KEY)
    return v && v.length >= 16 ? v : null
  } catch {
    return null
  }
}

function setSavedAccessCode(code: string): void {
  try {
    localStorage.setItem(ACCESS_CODE_KEY, code.trim().toUpperCase().replace(/\s/g, ''))
  } catch {
    /* ignore */
  }
}

export function clearSavedAccessCode(): void {
  try {
    localStorage.removeItem(ACCESS_CODE_KEY)
  } catch {
    /* ignore */
  }
}

function normalizeAccessCodeInput(code: string): string {
  return code.trim().toUpperCase().replace(/\s/g, '')
}

/**
 * Authentication → Users 목록에서 UUID 대신 구분되도록 user_metadata 반영.
 * `full_name`은 여러 대시보드 버전에서 "Display name" 열에 쓰이는 경우가 많음.
 * (JWT·메타데이터에 평문 코드가 포함되므로 보안 요구가 높은 서비스에서는 생략할 수 있음.)
 */
async function syncAuthUserMetadataHouseholdAccessCode(plainCode: string): Promise<void> {
  if (!supabase) return
  const code = normalizeAccessCodeInput(plainCode)
  if (code.length < 16) return
  const { error } = await supabase.auth.updateUser({
    data: {
      full_name: `가계 ${code}`,
      household_access_code: code,
    },
  })
  if (error) console.warn('[authHousehold] user_metadata(접속코드) 반영 실패:', error.message)
}

/** 세션 복원 후: 로컬에 저장된 코드가 있으면 메타데이터가 비어 있을 때만 보강 */
async function syncAuthProfileFromSavedAccessCodeIfNeeded(): Promise<void> {
  if (!supabase) return
  const saved = getSavedAccessCode()
  if (!saved || saved.length < 16) return
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) return
  const meta = session.user.user_metadata ?? {}
  if (meta.household_access_code === saved) return
  await syncAuthUserMetadataHouseholdAccessCode(saved)
}

async function joinHouseholdWithAccessCodeRpc(
  code: string,
): Promise<{ ok: true; householdId: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase 클라이언트가 없습니다.' }
  const normalized = normalizeAccessCodeInput(code)
  if (normalized.length < 16) {
    return { ok: false, error: '접속 코드는 16자(0-9, A-F)입니다.' }
  }
  for (let attempt = 0; attempt < 2; attempt++) {
    const prep = await ensureFreshAuthUserForRpc()
    if (!prep.ok) return { ok: false, error: prep.error }
    const { data, error } = await supabase.rpc('join_household_by_access_code', {
      p_code: normalized,
    })
    if (!error) {
      const hid = data as string | null
      if (!hid) return { ok: false, error: '접속 코드 응답이 비었습니다.' }
      return { ok: true, householdId: hid }
    }
    if (attempt === 0 && isHouseholdMembersUserFkError(error.message)) {
      await supabase.auth.signOut()
      await ensureSupabaseSessionForSync()
      continue
    }
    return { ok: false, error: error.message }
  }
  return { ok: false, error: '가계 참여에 실패했습니다.' }
}

/** 세션 복원 후 household_members 조회; 없으면 저장된 16자 코드로 자동 재참여 시도 */
export async function resolveSessionAndHouseholdBeforeHydrate(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) {
    clearSyncHouseholdId()
    return
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    clearSyncHouseholdId()
    return
  }
  const { data } = await supabase
    .from('household_members')
    .select('household_id')
    .eq('user_id', session.user.id)
    .maybeSingle()

  const row = data as { household_id?: string } | null
  if (row?.household_id) {
    try {
      localStorage.setItem(SYNC_HOUSEHOLD_KEY, row.household_id)
    } catch {
      /* ignore */
    }
    await syncAuthProfileFromSavedAccessCodeIfNeeded()
    const { hydrateFromSupabaseBeforeApp } = await import('@/services/supabase-sync')
    await hydrateFromSupabaseBeforeApp()
    return
  }

  const saved = getSavedAccessCode()
  if (saved) {
    const joinRes = await joinHouseholdWithAccessCodeRpc(saved)
    if (joinRes.ok) {
      try {
        localStorage.setItem(SYNC_HOUSEHOLD_KEY, joinRes.householdId)
      } catch {
        /* ignore */
      }
      await syncAuthProfileFromSavedAccessCodeIfNeeded()
      const { hydrateFromSupabaseBeforeApp } = await import('@/services/supabase-sync')
      await hydrateFromSupabaseBeforeApp()
      return
    }
  }

  clearSyncHouseholdId()
}

export async function createHouseholdRpc(): Promise<
  { ok: true; householdId: string; accessCode: string } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'Supabase 클라이언트가 없습니다.' }
  for (let attempt = 0; attempt < 2; attempt++) {
    const prep = await ensureFreshAuthUserForRpc()
    if (!prep.ok) return { ok: false, error: prep.error }
    const { data, error } = await supabase.rpc('create_household_with_access_code')
    if (error) {
      if (attempt === 0 && isHouseholdMembersUserFkError(error.message)) {
        await supabase.auth.signOut()
        await ensureSupabaseSessionForSync()
        continue
      }
      return { ok: false, error: error.message }
    }
    const row = (Array.isArray(data) ? data[0] : data) as
      | { household_id?: string; access_code?: string }
      | undefined
    if (!row?.household_id || !row?.access_code) return { ok: false, error: '가계 생성 응답이 비었습니다.' }
    setSavedAccessCode(row.access_code)
    try {
      localStorage.setItem(SYNC_HOUSEHOLD_KEY, row.household_id)
    } catch {
      /* ignore */
    }
    await syncAuthUserMetadataHouseholdAccessCode(row.access_code)
    const { hydrateFromSupabaseBeforeApp } = await import('@/services/supabase-sync')
    await hydrateFromSupabaseBeforeApp()
    return { ok: true, householdId: row.household_id, accessCode: row.access_code }
  }
  return { ok: false, error: '가계 생성에 실패했습니다.' }
}

export async function joinHouseholdRpc(
  code: string,
): Promise<{ ok: true; householdId: string } | { ok: false; error: string }> {
  const res = await joinHouseholdWithAccessCodeRpc(code)
  if (!res.ok) return res
  const normalized = normalizeAccessCodeInput(code)
  setSavedAccessCode(normalized)
  try {
    localStorage.setItem(SYNC_HOUSEHOLD_KEY, res.householdId)
  } catch {
    /* ignore */
  }
  await syncAuthUserMetadataHouseholdAccessCode(normalized)
  const { hydrateFromSupabaseBeforeApp } = await import('@/services/supabase-sync')
  await hydrateFromSupabaseBeforeApp()
  return { ok: true, householdId: res.householdId }
}

export async function signOutAndClearHousehold(): Promise<void> {
  clearSyncHouseholdId()
  clearSavedAccessCode()
  if (supabase) {
    await supabase.auth.signOut()
    const r = await ensureSupabaseSessionForSync()
    if (!r.ok) console.warn('[authHousehold] 초기화 후 백그라운드 연결 실패:', r.reason)
  }
}

/**
 * 서버: `leave_my_household_membership` — 본인 household_members 행만 제거(동기화 데이터는 유지).
 * 이 기기: 로컬 예산·설정·동기화 키 전부 제거 후 signOut → 새 익명 세션.
 * (Supabase 세션 스토리지 키만 제외 — 제거 시 400 등)
 *
 * 가계 데이터까지 서버에서 지우려면 DB의 `delete_my_household` 를 별도로 호출하는 마이그레이션/관리용 RPC 를 쓰면 됩니다.
 */
export async function leaveHouseholdAndClearLocal(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'Supabase 클라이언트가 없습니다.' }
  const { error } = await supabase.rpc('leave_my_household_membership')
  if (error) return { ok: false, error: error.message }
  clearCoupleBudgetLocalDataKeepAuth()
  await signOutAndClearHousehold()
  return { ok: true }
}
