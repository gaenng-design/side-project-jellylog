import { create } from 'zustand'

/** UI·설정용 동기화 상태(비영속). 실제 dirty 플래그는 syncMeta(localStorage). */
type SyncStatusState = {
  isSyncing: boolean
  lastSyncedAt: string | null
  syncError: string | null
  setSyncing: (v: boolean) => void
  recordSyncSuccess: () => void
  setSyncError: (msg: string | null) => void
}

export const useSyncStatusStore = create<SyncStatusState>((set) => ({
  isSyncing: false,
  lastSyncedAt: null,
  syncError: null,
  setSyncing: (v) => set({ isSyncing: v }),
  recordSyncSuccess: () =>
    set({ lastSyncedAt: new Date().toISOString(), syncError: null }),
  setSyncError: (msg) => set({ syncError: msg }),
}))
