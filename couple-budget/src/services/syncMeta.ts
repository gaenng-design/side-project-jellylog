/**
 * Local-first: 로컬 변경 추적 + 원격 hydrate 시 오탐 방지(억제 카운터).
 * pendingPush = 서버에 아직 반영 안 된 로컬 변경이 있음(부트 시 선행 업로드에 사용).
 */
const SYNC_META_KEY = 'couple-budget:sync-meta'

export type SyncMeta = {
  pendingPush: boolean
  lastLocalMutationAt: string
  lastSuccessfulPushAt?: string
  lastSuccessfulPullAt?: string
}

const defaultMeta = (): SyncMeta => ({
  pendingPush: false,
  lastLocalMutationAt: new Date(0).toISOString(),
})

let suppressMutationTracking = 0

export function readSyncMeta(): SyncMeta {
  try {
    const raw = localStorage.getItem(SYNC_META_KEY)
    if (!raw) return defaultMeta()
    const p = JSON.parse(raw) as Partial<SyncMeta>
    return {
      ...defaultMeta(),
      ...p,
      pendingPush: !!p.pendingPush,
      lastLocalMutationAt: typeof p.lastLocalMutationAt === 'string' ? p.lastLocalMutationAt : defaultMeta().lastLocalMutationAt,
    }
  } catch {
    return defaultMeta()
  }
}

function writeSyncMeta(next: SyncMeta): void {
  try {
    localStorage.setItem(SYNC_META_KEY, JSON.stringify(next))
  } catch {
    /* ignore quota */
  }
}

/** 사용자·앱이 로컬 데이터를 바꿈 → 서버에 올려야 함 */
export function markLocalMutation(): void {
  if (suppressMutationTracking > 0) return
  const cur = readSyncMeta()
  writeSyncMeta({
    ...cur,
    pendingPush: true,
    lastLocalMutationAt: new Date().toISOString(),
  })
}

/** saveAllToSupabase 성공 직후 */
export function markPushSuccess(): void {
  const cur = readSyncMeta()
  const now = new Date().toISOString()
  writeSyncMeta({
    ...cur,
    pendingPush: false,
    lastSuccessfulPushAt: now,
  })
}

/** hydrateFromSupabaseBeforeApp 성공 직후 */
export function markPullSuccess(): void {
  const cur = readSyncMeta()
  writeSyncMeta({
    ...cur,
    lastSuccessfulPullAt: new Date().toISOString(),
  })
}

export function withSuppressedSyncTracking<T>(fn: () => T): T {
  suppressMutationTracking++
  try {
    return fn()
  } finally {
    suppressMutationTracking--
  }
}

export async function withSuppressedSyncTrackingAsync<T>(fn: () => Promise<T>): Promise<T> {
  suppressMutationTracking++
  try {
    return await fn()
  } finally {
    suppressMutationTracking--
  }
}
