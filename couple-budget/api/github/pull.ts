interface AppData {
  assets: unknown
  sharedExpense: unknown
  expenses: unknown
  incomes: unknown
  settlements: unknown
  metadata: unknown
}

/**
 * Pull data from GitHub repository
 * POST /api/github/pull
 * Body: { token, owner, repo, branch? }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, owner, repo, branch = 'main' } = req.body as {
    token?: string
    owner?: string
    repo?: string
    branch?: string
  }

  if (!token || !owner || !repo) {
    return res.status(400).json({ error: 'Missing token, owner, or repo' })
  }

  try {
    const data: Partial<AppData> = {}

    // List of data files to pull (filename → state key)
    const files: { name: string; key: keyof AppData }[] = [
      { name: 'assets.json', key: 'assets' },
      { name: 'shared-expense.json', key: 'sharedExpense' },
      { name: 'expenses.json', key: 'expenses' },
      { name: 'incomes.json', key: 'incomes' },
      { name: 'settlements.json', key: 'settlements' },
      { name: 'metadata.json', key: 'metadata' },
    ]

    for (const file of files) {
      try {
        const fileResponse = await fetch(
          `https://api.github.com/repos/${owner}/${repo}/contents/data/${file.name}?ref=${branch}`,
          {
            headers: {
              'Authorization': `token ${token}`,
              'Accept': 'application/vnd.github.v3+json',
            },
          }
        )

        if (fileResponse.status === 404) {
          // File doesn't exist yet, skip
          continue
        }

        if (!fileResponse.ok) {
          console.warn(`Failed to get file ${file.name}: ${fileResponse.statusText}`)
          continue
        }

        const fileData = (await fileResponse.json()) as { content?: string }
        if (!fileData.content) {
          continue
        }

        // GitHub returns base64 encoded content
        // Decode base64 to UTF-8 string
        const content = decodeURIComponent(
          atob(fileData.content)
            .split('')
            .map((c) => {
              return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
            })
            .join('')
        )

        data[file.key] = JSON.parse(content)
      } catch (error) {
        console.warn(`Failed to load ${file.name}:`, error)
        // Continue loading other files even if one fails
      }
    }

    return res.status(200).json({
      ok: true,
      message: 'Data pulled from GitHub',
      data,
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: `Failed to pull data: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}
