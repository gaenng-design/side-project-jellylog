/**
 * Application Bootstrap Service
 * Handles initialization of the app, loading persisted stores from localStorage
 */

import { rehydrateAllPersistedStores } from '@/store/rehydratePersistedStores'
import { GitHubDataSync } from './github-sync'

export interface BootResult {
  isReady: boolean
  hasPendingChanges: boolean
  lastSyncAt: Date | null
  githubConfigured: boolean
}

/**
 * Initialize the application
 * Loads all persisted stores from localStorage
 */
export async function bootApp(): Promise<BootResult> {
  try {
    // Rehydrate all Zustand stores from localStorage
    await rehydrateAllPersistedStores()

    // Check if GitHub config is available
    const githubConfig = GitHubDataSync.loadConfig()
    const lastSyncTime = localStorage.getItem('couple-budget:github-last-sync')

    return {
      isReady: true,
      hasPendingChanges: false,
      lastSyncAt: lastSyncTime ? new Date(JSON.parse(lastSyncTime)) : null,
      githubConfigured: !!githubConfig,
    }
  } catch (error) {
    console.error('[bootApp] Failed to initialize app:', error)
    return {
      isReady: false,
      hasPendingChanges: false,
      lastSyncAt: null,
      githubConfigured: false,
    }
  }
}
