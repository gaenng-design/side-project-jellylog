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
  private baseUrl = 'https://api.github.com'
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
      const response = await fetch(`${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}`, {
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })

      if (!response.ok) {
        let errorMsg = `GitHub API error: ${response.status} ${response.statusText}`

        // Try to get more detail from response body
        try {
          const errorData = await response.json() as { message?: string }
          if (errorData.message) {
            errorMsg = `GitHub API error: ${errorData.message}`
          }
        } catch {
          // Use default error message
        }

        return {
          ok: false,
          error: errorMsg,
        }
      }

      return { ok: true, message: 'GitHub access verified' }
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
      console.log('[GitHub] Starting pull from', `${this.config.owner}/${this.config.repo}`)
      const data: Partial<AppData> = {}

      // List of data files to pull
      const files = ['assets.json', 'expenses.json', 'incomes.json', 'settlements.json', 'metadata.json']

      for (const file of files) {
        try {
          console.log(`[GitHub] Fetching ${file}...`)
          const content = await this.getFileContent(`data/${file}`)
          if (content) {
            console.log(`[GitHub] ${file} loaded, length:`, content.length)
            const key = file.replace('.json', '') as keyof AppData
            data[key] = JSON.parse(content)
            console.log(`[GitHub] ${file} parsed successfully`)
          } else {
            console.log(`[GitHub] ${file} is empty or missing`)
          }
        } catch (error) {
          console.warn(`[GitHub] Failed to load ${file}:`, error)
          // Continue loading other files even if one fails
        }
      }

      console.log('[GitHub] Pull complete, data keys:', Object.keys(data))
      this.updateLastSyncTime()
      return {
        ok: true,
        message: 'Data pulled from GitHub',
        data,
      }
    } catch (error) {
      console.error('[GitHub] Pull failed:', error)
      return {
        ok: false,
        error: `Failed to pull data: ${error instanceof Error ? error.message : String(error)}`,
      }
    }
  }

  /**
   * Push data to GitHub repository
   */
  async push(data: Partial<AppData>, message: string): Promise<GitHubSyncResult> {
    try {
      const files = [
        { name: 'assets.json', key: 'assets' },
        { name: 'expenses.json', key: 'expenses' },
        { name: 'incomes.json', key: 'incomes' },
        { name: 'settlements.json', key: 'settlements' },
        { name: 'metadata.json', key: 'metadata' },
      ] as const

      for (const file of files) {
        const key = file.key as keyof AppData
        if (data[key]) {
          await this.setFileContent(
            `data/${file.name}`,
            JSON.stringify(data[key], null, 2),
            message
          )
        }
      }

      this.updateLastSyncTime()
      return {
        ok: true,
        message: 'Data pushed to GitHub',
      }
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
   * Internal: Get file content from GitHub
   */
  private async getFileContent(path: string): Promise<string | null> {
    const url = `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`
    console.log(`[GitHub] Getting file: ${path}`)

    try {
      const response = await fetch(url, {
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      })

      console.log(`[GitHub] Got response for ${path}: status=${response.status}`)

      if (response.status === 404) {
        console.log(`[GitHub] File not found: ${path}`)
        return null
      }

      if (!response.ok) {
        console.error(`[GitHub] HTTP error for ${path}: ${response.status} ${response.statusText}`)
        throw new Error(`HTTP ${response.status}: ${response.statusText}`)
      }

      const data = await response.json() as { content?: string }
      if (!data.content) {
        console.log(`[GitHub] No content returned for ${path}`)
        return null
      }

      try {
        const decoded = decodeURIComponent(
          atob(data.content).split('').map((c) => {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
          }).join('')
        )
        console.log(`[GitHub] Decoded ${path}: ${decoded.length} bytes`)
        return decoded
      } catch (decodeError) {
        console.error(`[GitHub] Failed to decode ${path}:`, decodeError)
        throw decodeError
      }
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : String(error)
      console.error(`[GitHub] getFileContent failed for ${path}: ${errorMsg}`)
      throw error
    }
  }

  /**
   * Internal: Set file content in GitHub
   */
  private async setFileContent(path: string, content: string, message: string): Promise<void> {
    // First, try to get the current file to get its SHA (needed for updates)
    let sha: string | undefined
    try {
      const response = await fetch(
        `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`,
        {
          headers: {
            'Authorization': `token ${this.config.token}`,
            'Accept': 'application/vnd.github.v3+json',
          },
        }
      )

      if (response.ok) {
        const data = await response.json() as { sha?: string }
        sha = data.sha
      }
    } catch (error) {
      console.warn(`Failed to get SHA for ${path}:`, error)
    }

    // Now create or update the file
    // Encode UTF-8 string to base64 (browser-compatible)
    const base64Content = btoa(unescape(encodeURIComponent(content)))
    const body = {
      message: `${message}`,
      content: base64Content,
      branch: this.config.branch,
      ...(sha && { sha }),
    }

    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}`,
      {
        method: 'PUT',
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      }
    )

    if (!response.ok) {
      const error = await response.json() as { message?: string }
      throw new Error(`Failed to set file: ${error.message || response.statusText}`)
    }
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
