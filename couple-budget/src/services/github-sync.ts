/**
 * GitHub Data Synchronization Service
 * Handles pull/push operations for JSON-based data storage in a private GitHub repository
 */

export interface GitHubConfig {
  owner: string        // GitHub username
  repo: string         // Repository name
  token: string        // Personal Access Token
  branch?: string      // Default: 'main'
}

export interface AppData {
  assets: unknown
  expenses: unknown
  incomes: unknown
  settlements: unknown
  metadata: unknown
}

export interface GitHubSyncResult {
  ok: boolean
  message?: string
  error?: string
}

export class GitHubDataSync {
  private config: GitHubConfig & { branch: string }
  private lastSyncAt: Date | null = null

  constructor(config: GitHubConfig) {
    this.config = {
      ...config,
      branch: config.branch || 'main',
    }
    this.loadLastSyncTime()
  }

  /**
   * Verify that we can access the GitHub repository with the provided token
   */
  async verifyAccess(): Promise<GitHubSyncResult> {
    try {
      const response = await fetch('/api/github/verify', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.config.token,
          owner: this.config.owner,
          repo: this.config.repo,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        return {
          ok: false,
          error: errorData.error || `GitHub API error: ${response.status}`,
        }
      }

      const data = (await response.json()) as GitHubSyncResult
      return data
    } catch (error) {
      return {
        ok: false,
        error: `Failed to verify GitHub access: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Pull data from GitHub repository
   */
  async pull(): Promise<GitHubSyncResult & { data?: Partial<AppData> }> {
    try {
      const response = await fetch('/api/github/pull', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.config.token,
          owner: this.config.owner,
          repo: this.config.repo,
          branch: this.config.branch,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }
        return {
          ok: false,
          error: errorData.error || `Failed to pull data: ${response.status}`,
        }
      }

      const result = (await response.json()) as GitHubSyncResult & { data?: Partial<AppData> }

      this.updateLastSyncTime()
      return result
    } catch (error) {
      return {
        ok: false,
        error: `Failed to pull data: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Push data to GitHub repository with conflict resolution
   */
  async push(data: Partial<AppData>, message: string): Promise<GitHubSyncResult> {
    try {
      const response = await fetch('/api/github/push', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token: this.config.token,
          owner: this.config.owner,
          repo: this.config.repo,
          branch: this.config.branch,
          data,
          message,
        }),
      })

      if (!response.ok) {
        const errorData = (await response.json()) as { error?: string }

        // If conflict, try pulling before returning error
        if (errorData.error?.includes('409') || errorData.error?.includes('SHA')) {
          console.log('[GitHub] Conflict detected. Pulling latest data...')
          try {
            await this.pull()
          } catch (pullError) {
            console.warn('[GitHub] Pull failed during conflict recovery:', pullError)
          }
        }

        return {
          ok: false,
          error: errorData.error || `Failed to push data: ${response.status}`,
        }
      }

      const result = (await response.json()) as GitHubSyncResult
      this.updateLastSyncTime()
      return result
    } catch (error) {
      return {
        ok: false,
        error: `Failed to push data: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Get the last sync time
   */
  getLastSync(): Date | null {
    return this.lastSyncAt
  }


  /**
   * Internal: Load last sync time from localStorage
   */
  private loadLastSyncTime(): void {
    const stored = localStorage.getItem('couple-budget:github-last-sync')
    if (stored) {
      try {
        this.lastSyncAt = new Date(JSON.parse(stored))
      } catch {
        this.lastSyncAt = null
      }
    }
  }

  /**
   * Internal: Update and save last sync time
   */
  private updateLastSyncTime(): void {
    this.lastSyncAt = new Date()
    localStorage.setItem('couple-budget:github-last-sync', JSON.stringify(this.lastSyncAt))
  }

  /**
   * Save GitHub config to localStorage for persistence
   */
  saveConfig(): void {
    localStorage.setItem(
      'couple-budget:github-config',
      JSON.stringify({
        owner: this.config.owner,
        repo: this.config.repo,
        token: this.config.token,
        branch: this.config.branch,
      })
    )
  }

  /**
   * Load GitHub config from localStorage
   */
  static loadConfig(): GitHubConfig | null {
    const stored = localStorage.getItem('couple-budget:github-config')
    if (!stored) return null

    try {
      return JSON.parse(stored)
    } catch {
      return null
    }
  }

  /**
   * Clear GitHub config from localStorage
   */
  static clearConfig(): void {
    localStorage.removeItem('couple-budget:github-config')
    localStorage.removeItem('couple-budget:github-last-sync')
  }
}
