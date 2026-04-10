import { supabase, isSupabaseConfigured, COUPLE_BUDGET_SUPABASE_AUTH_KEY } from '@/data/supabase'

const SYNC_HOUSEHOLD_KEY = 'couple-budget:sync-household-id'
const SYNC_HOUSEHOLD_NAME_KEY = 'couple-budget:household-name'
const SYNC_REMEMBER_HOUSEHOLD_KEY = 'couple-budget:remember-household'

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

export function getSyncHouseholdName(): string | null {
  try {
    const v = localStorage.getItem(SYNC_HOUSEHOLD_NAME_KEY)
    return v && v.length >= 2 && v.length <= 20 ? v : null
  } catch {
    return null
  }
}

function setSyncHouseholdName(name: string): void {
  try {
    localStorage.setItem(SYNC_HOUSEHOLD_NAME_KEY, name.trim())
  } catch {
    /* ignore */
  }
}

function clearSyncHouseholdName(): void {
  try {
    localStorage.removeItem(SYNC_HOUSEHOLD_NAME_KEY)
  } catch {
    /* ignore */
  }
}

export function getRememberHousehold(): boolean {
  try {
    return localStorage.getItem(SYNC_REMEMBER_HOUSEHOLD_KEY) === 'true'
  } catch {
    return false
  }
}

function setRememberHousehold(remember: boolean): void {
  try {
    if (remember) {
      localStorage.setItem(SYNC_REMEMBER_HOUSEHOLD_KEY, 'true')
    } else {
      localStorage.removeItem(SYNC_REMEMBER_HOUSEHOLD_KEY)
    }
  } catch {
    /* ignore */
  }
}

/**
 * Validate household name format: 2-20 characters
 */
function validateHouseholdName(name: string): { valid: boolean; error?: string } {
  if (!name || name.length < 2 || name.length > 20) {
    return { valid: false, error: '가계 이름은 2-20자여야 합니다' }
  }
  return { valid: true }
}

/**
 * Validate password: non-empty
 */
function validatePassword(password: string): { valid: boolean; error?: string } {
  if (!password || password.length === 0) {
    return { valid: false, error: '비밀번호를 입력해 주세요' }
  }
  return { valid: true }
}

async function joinHouseholdByPasswordRpc(
  householdName: string,
  password: string,
): Promise<{ ok: true; householdId: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase 클라이언트가 없습니다.' }

  // Validate inputs
  const nameVal = validateHouseholdName(householdName)
  if (!nameVal.valid) return { ok: false, error: `가계 이름: ${nameVal.error}` }

  const passVal = validatePassword(password)
  if (!passVal.valid) return { ok: false, error: `비밀번호: ${passVal.error}` }

  for (let attempt = 0; attempt < 2; attempt++) {
    const prep = await ensureFreshAuthUserForRpc()
    if (!prep.ok) return { ok: false, error: prep.error }

    const { data, error } = await supabase.rpc('join_household_by_password', {
      p_name: householdName,
      p_password: password,
    })

    if (!error) {
      const hid = data as string | null
      if (!hid) return { ok: false, error: '가계 ID 응답이 비었습니다.' }
      setSyncHouseholdName(householdName)
      try {
        localStorage.setItem(SYNC_HOUSEHOLD_KEY, hid)
      } catch {
        /* ignore */
      }
      return { ok: true, householdId: hid }
    }

    if (attempt === 0 && isHouseholdMembersUserFkError(error.message)) {
      await supabase.auth.signOut()
      const reauth = await ensureSupabaseSessionForSync()
      if (!reauth.ok) return { ok: false, error: reauth.reason }
      continue
    }

    return { ok: false, error: error.message }
  }

  return { ok: false, error: '가계 참여에 실패했습니다.' }
}

/** 세션 복원 후: 로컬 저장소에서 가계 ID와 이름을 복원 */
export async function resolveSessionAndHouseholdBeforeHydrate(): Promise<void> {
  if (!supabase || !isSupabaseConfigured) {
    clearSyncHouseholdId()
    clearSyncHouseholdName()
    return
  }
  const {
    data: { session },
  } = await supabase.auth.getSession()
  if (!session?.user) {
    clearSyncHouseholdId()
    clearSyncHouseholdName()
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
    return
  }

  // If not found in household, clear local references
  clearSyncHouseholdId()
  clearSyncHouseholdName()
}

export async function createHouseholdByNameRpc(
  householdName: string,
  password: string,
): Promise<{ ok: true; householdId: string } | { ok: false; error: string }> {
  if (!supabase) return { ok: false, error: 'Supabase 클라이언트가 없습니다.' }

  // Validate inputs
  const nameVal = validateHouseholdName(householdName)
  if (!nameVal.valid) return { ok: false, error: `가계 이름: ${nameVal.error}` }

  const passVal = validatePassword(password)
  if (!passVal.valid) return { ok: false, error: `비밀번호: ${passVal.error}` }

  for (let attempt = 0; attempt < 2; attempt++) {
    const prep = await ensureFreshAuthUserForRpc()
    if (!prep.ok) return { ok: false, error: prep.error }

    const { data, error } = await supabase.rpc('create_household', {
      p_name: householdName,
      p_password: password,
    })

    if (error) {
      if (attempt === 0 && isHouseholdMembersUserFkError(error.message)) {
        await supabase.auth.signOut()
        const reauth = await ensureSupabaseSessionForSync()
        if (!reauth.ok) return { ok: false, error: reauth.reason }
        continue
      }
      return { ok: false, error: error.message }
    }

    const hid = data as string | null
    if (!hid) return { ok: false, error: '가계 생성 응답이 비었습니다.' }

    setSyncHouseholdName(householdName)
    try {
      localStorage.setItem(SYNC_HOUSEHOLD_KEY, hid)
    } catch {
      /* ignore */
    }

    const { hydrateFromSupabaseBeforeApp } = await import('@/services/supabase-sync')
    await hydrateFromSupabaseBeforeApp()

    return { ok: true, householdId: hid }
  }

  return { ok: false, error: '가계 생성에 실패했습니다.' }
}

export async function joinHouseholdByPasswordRpcWithHydrate(
  householdName: string,
  password: string,
): Promise<{ ok: true; householdId: string } | { ok: false; error: string }> {
  const res = await joinHouseholdByPasswordRpc(householdName, password)
  if (!res.ok) return res

  const { hydrateFromSupabaseBeforeApp } = await import('@/services/supabase-sync')
  await hydrateFromSupabaseBeforeApp()

  return { ok: true, householdId: res.householdId }
}


export async function signOutAndClearHousehold(): Promise<void> {
  clearSyncHouseholdId()
  clearSyncHouseholdName()
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
