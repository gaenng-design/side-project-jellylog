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
      // Base64 인코딩된 token을 Authorization 헤더로 사용 (CORS 문제 해결용)
      const authHeader = `token ${this.config.token}`
      const response = await fetch(`${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}`, {
        headers: {
          'Authorization': authHeader,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
        credentials: 'omit', // CORS 요청 시 credentials 미포함
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
      const data: Partial<AppData> = {}

      // List of data files to pull
      const files = ['assets.json', 'expenses.json', 'incomes.json', 'settlements.json', 'metadata.json']

      for (const file of files) {
        try {
          const content = await this.getFileContent(`data/${file}`)
          if (content) {
            const key = file.replace('.json', '') as keyof AppData
            data[key] = JSON.parse(content)
          }
        } catch (error) {
          console.warn(`Failed to load ${file}:`, error)
          // Continue loading other files even if one fails
        }
      }

      this.updateLastSyncTime()
      return {
        ok: true,
        message: 'Data pulled from GitHub',
        data,
      }
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
    const maxRetries = 3
    let lastError: Error | null = null

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const files = [
          { name: 'assets.json', key: 'assets' },
          { name: 'expenses.json', key: 'expenses' },
          { name: 'incomes.json', key: 'incomes' },
          { name: 'settlements.json', key: 'settlements' },
          { name: 'metadata.json', key: 'metadata' },
        ] as const

        console.log(`[GitHub] Push attempt ${attempt}/${maxRetries}`)

        for (let i = 0; i < files.length; i++) {
          const file = files[i]
          const key = file.key as keyof AppData
          if (data[key]) {
            // 파일 간 1초 간격 추가 (GitHub API 동시성 문제 방지)
            if (i > 0) {
              await new Promise(resolve => setTimeout(resolve, 1000))
            }
            try {
              await this.setFileContent(
                `data/${file.name}`,
                JSON.stringify(data[key], null, 2),
                message
              )
              console.log(`[GitHub] ${file.name} pushed successfully`)
            } catch (fileError) {
              console.warn(`[GitHub] Failed to push ${file.name}:`, fileError)
              throw fileError
            }
          }
        }

        this.updateLastSyncTime()
        console.log('[GitHub] Push completed successfully')
        return {
          ok: true,
          message: 'Data pushed to GitHub',
        }
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error))
        const errorMsg = lastError.message
        console.warn(`[GitHub] Push attempt ${attempt} failed:`, errorMsg)

        // SHA 미스매치 에러인 경우, pull을 하고 재시도
        if (errorMsg.includes('409') || errorMsg.includes('SHA')) {
          console.log('[GitHub] Conflict detected. Pulling latest data before retry...')
          try {
            await this.pull()
            // Pull 후 잠깐 대기 후 재시도
            await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
          } catch (pullError) {
            console.warn('[GitHub] Pull failed during conflict recovery:', pullError)
          }
        }

        // 마지막 시도가 아니면 계속 재시도
        if (attempt < maxRetries) {
          const delayMs = 2000 * attempt
          console.log(`[GitHub] Retrying in ${delayMs}ms...`)
          await new Promise((resolve) => setTimeout(resolve, delayMs))
        }
      }
    }

    return {
      ok: false,
      error: `Failed to push data after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
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
    const response = await fetch(
      `${this.baseUrl}/repos/${this.config.owner}/${this.config.repo}/contents/${path}?ref=${this.config.branch}`,
      {
        headers: {
          'Authorization': `token ${this.config.token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (response.status === 404) {
      return null // File doesn't exist yet
    }

    if (!response.ok) {
      throw new Error(`Failed to get file: ${response.statusText}`)
    }

    const data = await response.json() as { content?: string }
    if (!data.content) {
      return null
    }

    // GitHub returns base64 encoded content
    // Decode base64 to UTF-8 string (browser-compatible)
    return decodeURIComponent(atob(data.content).split('').map((c) => {
      return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''))
  }

  /**
   * Internal: Set file content in GitHub (with automatic retry on SHA mismatch)
   */
  private async setFileContent(path: string, content: string, message: string, retryCount = 0): Promise<void> {
    const maxRetries = 5
    const retryDelays = [1000, 2000, 3000, 4000, 5000] // 증가하는 대기 시간 (1초부터 시작)

    // Always fetch the current SHA (even on retries)
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
      const errorMsg = error.message || response.statusText

      // If SHA mismatch (409 or message contains mismatch) and retries remaining, wait and retry with fresh SHA
      const isSHAMismatch = response.status === 409 || errorMsg.includes('does not match') || errorMsg.includes('SHA')
      if (isSHAMismatch && retryCount < maxRetries) {
        const delayMs = retryDelays[retryCount] || 3000
        console.warn(`[GitHub] SHA mismatch for ${path}, retrying after ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries}): ${errorMsg}`)
        await new Promise(resolve => setTimeout(resolve, delayMs))
        return this.setFileContent(path, content, message, retryCount + 1)
      }

      throw new Error(`Failed to set file: ${response.status} - ${errorMsg}`)
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
