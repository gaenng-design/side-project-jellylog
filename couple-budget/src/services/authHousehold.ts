import { supabase, isSupabaseConfigured } from '@/data/supabase'

const SYNC_HOUSEHOLD_KEY = 'couple-budget:sync-household-id'
/** 이 기기에만 저장. 앱 재실행·익명 세션 갱신 후 같은 가계에 다시 붙을 때 사용 */
const ACCESS_CODE_KEY = 'couple-budget:household-access-code'
const APP_STORAGE_PREFIX = 'couple-budget'

function clearAllCoupleBudgetLocalStorage(): void {
  try {
    const keys: string[] = []
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i)
      if (k?.startsWith(APP_STORAGE_PREFIX)) keys.push(k)
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
  const { data, error } = await supabase.rpc('join_household_by_access_code', {
    p_code: normalized,
  })
  if (error) return { ok: false, error: error.message }
  const hid = data as string | null
  if (!hid) return { ok: false, error: '접속 코드 응답이 비었습니다.' }
  return { ok: true, householdId: hid }
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
  const { data, error } = await supabase.rpc('create_household_with_access_code')
  if (error) return { ok: false, error: error.message }
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
  return { ok: true, householdId: row.household_id, accessCode: row.access_code }
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
 * 서버: 같은 가계 UUID·접속 코드는 유지하고, 멤버십·동기화 테이블 데이터만 삭제(가계 단위 초기화).
 * 이후 동일 16자 코드로 참여하면 join → hydrate 로 서버(빈) 기준으로 다시 맞춤.
 * 이 기기: couple-budget:* localStorage 전부 제거 후 새 익명 세션.
 */
export async function deleteHouseholdOnServerAndClearLocal(): Promise<
  { ok: true } | { ok: false; error: string }
> {
  if (!supabase) return { ok: false, error: 'Supabase 클라이언트가 없습니다.' }
  const { error } = await supabase.rpc('delete_my_household')
  if (error) return { ok: false, error: error.message }
  clearAllCoupleBudgetLocalStorage()
  await signOutAndClearHousehold()
  return { ok: true }
}
