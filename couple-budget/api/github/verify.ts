/**
 * Verify GitHub API access by checking repository access
 * POST /api/github/verify
 * Body: { token, owner, repo }
 */
export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' })
  }

  const { token, owner, repo } = req.body as {
    token?: string
    owner?: string
    repo?: string
  }

  if (!token || !owner || !repo) {
    return res.status(400).json({ error: 'Missing token, owner, or repo' })
  }

  try {
    const response = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      {
        headers: {
          'Authorization': `token ${token}`,
          'Accept': 'application/vnd.github.v3+json',
          'X-GitHub-Api-Version': '2022-11-28',
        },
      }
    )

    if (!response.ok) {
      let errorMsg = `GitHub API error: ${response.status} ${response.statusText}`

      try {
        const errorData = (await response.json()) as { message?: string }
        if (errorData.message) {
          errorMsg = `GitHub API error: ${errorData.message}`
        }
      } catch {
        // Use default error message
      }

      return res.status(response.status).json({
        ok: false,
        error: errorMsg,
      })
    }

    return res.status(200).json({
      ok: true,
      message: 'GitHub access verified',
    })
  } catch (error) {
    return res.status(500).json({
      ok: false,
      error: `Failed to verify GitHub access: ${error instanceof Error ? error.message : String(error)}`,
    })
  }
}
