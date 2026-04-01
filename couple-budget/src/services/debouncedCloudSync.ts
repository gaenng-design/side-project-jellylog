/**
 * Local-first 보조 레이어: 로컬 변경 후 debounce 업로드(saveAllToSupabase).
 * 기존 CRUD·MemoryAdapter·Zustand persist는 그대로 — 업로드만 비동기로 묶음.
 */
import { isSupabaseConfigured } from '@/data/supabase'
import { getSyncHouseholdId } from '@/services/authHousehold'
import { markLocalMutation, readSyncMeta } from '@/services/syncMeta'
import { useAppStore } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { useSyncStatusStore } from '@/store/useSyncStatusStore'

const DEBOUNCE_MS = 2800

let cloudSyncReady = false
let debounceTimer: ReturnType<typeof setTimeout> | null = null

export function setCloudSyncReady(ready: boolean): void {
  cloudSyncReady = ready
}

export function getCloudSyncReady(): boolean {
  return cloudSyncReady
}

/**
 * 가계 연결 + Supabase 설정 시에만 타이머. pendingPush는 markLocalMutation에서 설정.
 */
export function scheduleCloudSync(_reason?: string): void {
  markLocalMutation()
  if (!cloudSyncReady) return
  if (!isSupabaseConfigured || !getSyncHouseholdId()) return

  if (debounceTimer != null) clearTimeout(debounceTimer)
  debounceTimer = setTimeout(() => {
    debounceTimer = null
    void flushCloudSyncNow('debounced')
  }, DEBOUNCE_MS)
}

export async function flushCloudSyncNow(
  source: string,
): Promise<{ ok: true } | { ok: false; message: string }> {
  if (!isSupabaseConfigured || !getSyncHouseholdId()) {
    return { ok: false, message: 'Supabase 또는 가계 미연결' }
  }

  const { setSyncing, recordSyncSuccess, setSyncError } = useSyncStatusStore.getState()
  setSyncing(true)
  setSyncError(null)
  try {
    const { saveAllToSupabase } = await import('@/data/saveAllToSupabase')
    const res = await saveAllToSupabase()
    if (!res.ok) {
      const msg = res.message
      setSyncError(msg)
      console.warn(`[local-first] cloud sync failed (${source}):`, msg)
      return { ok: false, message: msg }
    }
    recordSyncSuccess()
    return { ok: true }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    setSyncError(msg)
    return { ok: false, message: msg }
  } finally {
    setSyncing(false)
  }
}

/**
 * 부트스트랩: 미전송 로컬이 있으면 한 번 즉시 업로드. 실패 시 원격 hydrate 생략(로컬 우선).
 */
export async function preflightPushDirtyLocalBeforeHydrate(): Promise<{ skipRemoteHydrate: boolean }> {
  if (!isSupabaseConfigured || !getSyncHouseholdId()) {
    return { skipRemoteHydrate: false }
  }
  if (!readSyncMeta().pendingPush) {
    return { skipRemoteHydrate: false }
  }
  const res = await flushCloudSyncNow('boot-preflight')
  if (res.ok) return { skipRemoteHydrate: false }
  return { skipRemoteHydrate: true }
}

/** 앱 마운트 후 한 번 호출: Zustand 변경 → debounce 업로드 */
export function subscribePersistedStoresToCloudSync(): () => void {
  const stores = [
    useAppStore,
    useFixedTemplateStore,
    useInvestTemplateStore,
    usePlanExtraStore,
    useSettlementStore,
  ] as const
  const unsubs = stores.map((s) =>
    s.subscribe(() => {
      scheduleCloudSync('zustand')
    }),
  )
  return () => {
    unsubs.forEach((u) => u())
  }
}
