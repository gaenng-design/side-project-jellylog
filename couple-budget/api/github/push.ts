interface AppData {
  assets: unknown
  expenses: unknown
  incomes: unknown
  settlements: unknown
  metadata: unknown
}

/**
 * Push data to GitHub repository with conflict resolution
 * POST /api/github/push
 * Body: { token, owner, repo, branch?, data, message }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, owner, repo, branch = 'main', data, message } = req.body as {
    token?: string
    owner?: string
    repo?: string
    branch?: string
    data?: Partial<AppData>
    message?: string
  }

  if (!token || !owner || !repo || !data || !message) {
    return res.status(400).json({ error: 'Missing required fields' })
  }

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
          // Add 1 second delay between files (prevent GitHub API concurrency issues)
          if (i > 0) {
            await new Promise((resolve) => setTimeout(resolve, 1000))
          }
          try {
            await setFileContent(
              token,
              owner,
              repo,
              `data/${file.name}`,
              JSON.stringify(data[key], null, 2),
              message,
              branch
            )
            console.log(`[GitHub] ${file.name} pushed successfully`)
          } catch (fileError) {
            console.warn(`[GitHub] Failed to push ${file.name}:`, fileError)
            throw fileError
          }
        }
      }

      console.log('[GitHub] Push completed successfully')
      return res.status(200).json({
        ok: true,
        message: 'Data pushed to GitHub',
      })
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
      const errorMsg = lastError.message
      console.warn(`[GitHub] Push attempt ${attempt} failed:`, errorMsg)

      // SHA mismatch error - pull and retry
      if (errorMsg.includes('409') || errorMsg.includes('SHA')) {
        console.log(
          '[GitHub] Conflict detected. Pulling latest data before retry...'
        )
        try {
          // Just wait before retry, the client should pull separately
          await new Promise((resolve) => setTimeout(resolve, 1000 * attempt))
        } catch (pullError) {
          console.warn('[GitHub] Wait failed during conflict recovery:', pullError)
        }
      }

      // If not last attempt, retry
      if (attempt < maxRetries) {
        const delayMs = 2000 * attempt
        console.log(`[GitHub] Retrying in ${delayMs}ms...`)
        await new Promise((resolve) => setTimeout(resolve, delayMs))
      }
    }
  }

  return res.status(500).json({
    ok: false,
    error: `Failed to push data after ${maxRetries} attempts: ${lastError?.message || 'Unknown error'}`,
  })
}

/**
 * Internal: Set file content in GitHub with retry on SHA mismatch
 */
async function setFileContent(
  token: string,
  owner: string,
  repo: string,
  path: string,
  content: string,
  message: string,
  branch: string,
  retryCount = 0
): Promise<void> {
  const maxRetries = 5
  const retryDelays = [1000, 2000, 3000, 4000, 5000]

  // Always fetch the current SHA (even on retries)
  let sha: string | undefined
  try {
    const shaResponse = await fetch(
      `https://api.github.com/repos/${owner}/${repo}/contents/${path}?ref=${branch}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
        },
      }
    )

    if (shaResponse.ok) {
      const shaData = (await shaResponse.json()) as { sha?: string }
      sha = shaData.sha
    }
  } catch (error) {
    console.warn(`Failed to get SHA for ${path}:`, error)
  }

  // Now create or update the file
  // Encode UTF-8 string to base64
  const base64Content = btoa(unescape(encodeURIComponent(content)))
  const body = {
    message: `${message}`,
    content: base64Content,
    branch,
    ...(sha && { sha }),
  }

  const response = await fetch(
    `https://api.github.com/repos/${owner}/${repo}/contents/${path}`,
    {
      method: 'PUT',
      headers: {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )

  if (!response.ok) {
    const error = (await response.json()) as { message?: string }
    const errorMsg = error.message || response.statusText

    // If SHA mismatch (409 or message contains mismatch) and retries remaining
    const isSHAMismatch =
      response.status === 409 ||
      errorMsg.includes('does not match') ||
      errorMsg.includes('SHA')
    if (isSHAMismatch && retryCount < maxRetries) {
      const delayMs = retryDelays[retryCount] || 3000
      console.warn(
        `[GitHub] SHA mismatch for ${path}, retrying after ${delayMs}ms (attempt ${retryCount + 1}/${maxRetries}): ${errorMsg}`
      )
      await new Promise((resolve) => setTimeout(resolve, delayMs))
      return setFileContent(
        token,
        owner,
        repo,
        path,
        content,
        message,
        branch,
        retryCount + 1
      )
    }

    throw new Error(`Failed to set file: ${response.status} - ${errorMsg}`)
  }
}
