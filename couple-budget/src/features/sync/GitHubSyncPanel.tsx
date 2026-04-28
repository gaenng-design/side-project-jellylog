import { useState, useEffect } from 'react'
import { GitHubDataSync, type GitHubConfig } from '@/services/github-sync'
import { useAppStore } from '@/store/useAppStore'

const eyeOpenIcon = 'https://www.figma.com/api/mcp/asset/7cc8e223-a6b0-4c67-9fc6-736a9bf313e9'
const eyeClosedIcon = 'https://www.figma.com/api/mcp/asset/35ae0e9c-6cce-46fb-82a4-9c7ce455e791'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { useAssetStore } from '@/store/useAssetStore'
import {
  JELLY,
  jellyCardStyle,
  jellyPrimaryButton,
  jellyPrimaryButtonDisabled,
  jellyInputSurface,
  jellyDangerButton,
} from '@/styles/jellyGlass'
import { pageTitleH1Style } from '@/styles/formControls'

export function GitHubSyncPanel() {
  const [mode, setMode] = useState<'config' | 'sync'>('sync')
  const [token, setToken] = useState('')
  const [owner, setOwner] = useState('')
  const [repo, setRepo] = useState('')
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [lastSync, setLastSync] = useState<Date | null>(null)
  const [isConfigured, setIsConfigured] = useState(false)
  const [verifying, setVerifying] = useState(false)
  const [showToken, setShowToken] = useState(false)

  // Load config on mount (from env vars or localStorage)
  useEffect(() => {
    // First try environment variables
    const envToken = import.meta.env.VITE_GITHUB_TOKEN
    const envOwner = import.meta.env.VITE_GITHUB_OWNER
    const envRepo = import.meta.env.VITE_GITHUB_REPO

    if (envToken && envOwner && envRepo) {
      // Use environment variables
      setToken(envToken)
      setOwner(envOwner)
      setRepo(envRepo)
      setIsConfigured(true)
      setMode('sync')

      const lastSyncStr = localStorage.getItem('couple-budget:github-last-sync')
      if (lastSyncStr) {
        try {
          setLastSync(new Date(JSON.parse(lastSyncStr)))
        } catch {
          // Ignore parse errors
        }
      }
    } else {
      // Fall back to localStorage config
      const config = GitHubDataSync.loadConfig()
      if (config) {
        setOwner(config.owner)
        setRepo(config.repo)
        setToken(config.token)
        setIsConfigured(true)
        setMode('sync')

        const lastSyncStr = localStorage.getItem('couple-budget:github-last-sync')
        if (lastSyncStr) {
          try {
            setLastSync(new Date(JSON.parse(lastSyncStr)))
          } catch {
            // Ignore parse errors
          }
        }
      } else {
        setMode('config')
      }
    }
  }, [])

  const handleSaveConfig = async () => {
    setMessage(null)

    if (!token.trim() || !owner.trim() || !repo.trim()) {
      setMessage({ tone: 'err', text: 'GitHub Token, Owner, Repo를 모두 입력해주세요.' })
      return
    }

    setVerifying(true)
    try {
      const sync = new GitHubDataSync({ token, owner, repo })
      const result = await sync.verifyAccess()

      if (!result.ok) {
        setMessage({ tone: 'err', text: result.error || '접근 확인 실패' })
        return
      }

      sync.saveConfig()
      setIsConfigured(true)
      setMode('sync')
      setMessage({ tone: 'ok', text: 'GitHub 설정이 저장되었습니다.' })
    } catch (error) {
      setMessage({
        tone: 'err',
        text: `오류: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setVerifying(false)
    }
  }

  const handlePull = async () => {
    setMessage(null)
    setLoading(true)

    try {
      const config = GitHubDataSync.loadConfig()
      if (!config) {
        setMessage({ tone: 'err', text: 'GitHub 설정이 없습니다.' })
        return
      }

      const sync = new GitHubDataSync(config)
      const result = await sync.pull()

      if (!result.ok) {
        setMessage({ tone: 'err', text: result.error || 'Pull 실패' })
        return
      }

      // Update stores with pulled data
      if (result.data) {
        // The data is now loaded - stores should be updated via their persist middleware
        setLastSync(new Date())
      }

      setMessage({ tone: 'ok', text: 'GitHub에서 데이터를 가져왔습니다.' })
    } catch (error) {
      setMessage({
        tone: 'err',
        text: `오류: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleCommitAndPush = async () => {
    setMessage(null)
    setLoading(true)

    try {
      const config = GitHubDataSync.loadConfig()
      if (!config) {
        setMessage({ tone: 'err', text: 'GitHub 설정이 없습니다.' })
        return
      }

      // Collect current state from all stores
      const appState = useAppStore.getState()
      const fixedState = useFixedTemplateStore.getState()
      const investState = useInvestTemplateStore.getState()
      const planState = usePlanExtraStore.getState()
      const settlementState = useSettlementStore.getState()
      const assetState = useAssetStore.getState()

      const data = {
        assets: {
          items: assetState.items,
          entries: assetState.entries,
        },
        expenses: {
          fixedTemplates: fixedState.templates,
          investTemplates: investState.templates,
          planExtra: planState,
        },
        incomes: {
          // Income data structure
        },
        settlements: {
          settlements: settlementState.settlements,
          transfers: settlementState.transfers,
        },
        metadata: {
          app: appState,
          lastUpdated: new Date().toISOString(),
        },
      }

      const sync = new GitHubDataSync(config)
      const now = new Date()
      const message = `Update from couple-budget app - ${now.toLocaleString('ko-KR')}`
      const result = await sync.push(data, message)

      if (!result.ok) {
        setMessage({ tone: 'err', text: result.error || 'Push 실패' })
        return
      }

      setLastSync(new Date())
      setMessage({ tone: 'ok', text: 'GitHub에 데이터를 저장했습니다.' })
    } catch (error) {
      setMessage({
        tone: 'err',
        text: `오류: ${error instanceof Error ? error.message : String(error)}`,
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDisconnect = () => {
    GitHubDataSync.clearConfig()
    setIsConfigured(false)
    setMode('config')
    setToken('')
    setOwner('')
    setRepo('')
    setLastSync(null)
    setMessage({ tone: 'ok', text: 'GitHub 설정이 제거되었습니다.' })
  }

  if (mode === 'config') {
    return (
      <div style={{ maxWidth: 520, paddingBottom: 40 }}>
        <h1 style={{ ...pageTitleH1Style, marginBottom: 12 }}>GitHub 동기화 설정</h1>

        <div style={{ ...jellyCardStyle, padding: '16px', marginBottom: 20 }}>
          <p style={{ fontSize: 13, color: JELLY.textMuted, marginBottom: 16, lineHeight: 1.5 }}>
            개인용 GitHub 저장소에서 데이터를 관리합니다.{' '}
            <a
              href="https://github.com/settings/tokens"
              target="_blank"
              rel="noreferrer"
              style={{ color: '#3b82f6', textDecoration: 'none' }}
            >
              GitHub Personal Access Token
            </a>
            을 만들어주세요. (repo 권한 필요)
          </p>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: JELLY.text }}>
              GitHub Token
            </label>
            <div style={{ position: 'relative' }}>
              <input
                type={showToken ? 'text' : 'password'}
                placeholder="ghp_xxxxxxxxxxxx"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                disabled={verifying}
                style={{
                  ...jellyInputSurface,
                  width: '100%',
                  padding: '10px 12px 10px 12px',
                  paddingRight: '40px',
                  fontSize: 13,
                  boxSizing: 'border-box',
                  opacity: verifying ? 0.6 : 1,
                }}
              />
              <button
                type="button"
                onClick={() => setShowToken(!showToken)}
                disabled={verifying}
                style={{
                  position: 'absolute',
                  right: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  background: 'none',
                  border: 'none',
                  cursor: verifying ? 'not-allowed' : 'pointer',
                  padding: '4px 8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: 24,
                  height: 24,
                  opacity: verifying ? 0.5 : 1,
                }}
                title={showToken ? '숨기기' : '보기'}
              >
                <img
                  src={showToken ? eyeOpenIcon : eyeClosedIcon}
                  alt={showToken ? 'token 숨기기' : 'token 보기'}
                  style={{
                    width: 24,
                    height: 24,
                    display: 'block',
                  }}
                />
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 16 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: JELLY.text }}>
              GitHub Username
            </label>
            <input
              type="text"
              placeholder="your-username"
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              disabled={verifying}
              style={{
                ...jellyInputSurface,
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                boxSizing: 'border-box',
                opacity: verifying ? 0.6 : 1,
              }}
            />
          </div>

          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontSize: 12, fontWeight: 600, marginBottom: 6, color: JELLY.text }}>
              Repository Name
            </label>
            <input
              type="text"
              placeholder="couple-budget"
              value={repo}
              onChange={(e) => setRepo(e.target.value)}
              disabled={verifying}
              style={{
                ...jellyInputSurface,
                width: '100%',
                padding: '10px 12px',
                fontSize: 13,
                boxSizing: 'border-box',
                opacity: verifying ? 0.6 : 1,
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => void handleSaveConfig()}
            disabled={verifying || !token.trim() || !owner.trim() || !repo.trim()}
            style={{
              width: '100%',
              ...(verifying || !token.trim() || !owner.trim() || !repo.trim()
                ? jellyPrimaryButtonDisabled
                : jellyPrimaryButton),
            }}
          >
            {verifying ? '확인 중…' : '설정 저장'}
          </button>

          {message && (
            <div
              style={{
                marginTop: 16,
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 12,
                color: message.tone === 'ok' ? '#059669' : '#dc2626',
                background: message.tone === 'ok' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
                lineHeight: 1.5,
              }}
            >
              {message.text}
            </div>
          )}
        </div>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 12 }}>GitHub 동기화</h1>

      <div style={{ ...jellyCardStyle, padding: '16px', marginBottom: 20 }}>
        <div style={{ marginBottom: 12 }}>
          <div style={{ fontSize: 12, fontWeight: 600, color: JELLY.text, marginBottom: 4 }}>
            저장소: {owner}/{repo}
          </div>
          <div style={{ fontSize: 12, color: JELLY.textMuted }}>
            마지막 동기화:{' '}
            {lastSync
              ? lastSync.toLocaleString('ko-KR', { dateStyle: 'short', timeStyle: 'short' })
              : '없음'}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 8, marginBottom: 16 }}>
          <button
            type="button"
            onClick={() => void handlePull()}
            disabled={loading}
            style={{
              flex: 1,
              ...(loading ? jellyPrimaryButtonDisabled : jellyPrimaryButton),
              fontSize: 13,
            }}
          >
            {loading ? '중…' : '🔄 Pull'}
          </button>
          <button
            type="button"
            onClick={() => void handleCommitAndPush()}
            disabled={loading}
            style={{
              flex: 1,
              ...(loading ? jellyPrimaryButtonDisabled : jellyPrimaryButton),
              fontSize: 13,
            }}
          >
            {loading ? '중…' : '💾 Commit & Push'}
          </button>
        </div>

        <button
          type="button"
          onClick={() => setMode('config')}
          style={{
            width: '100%',
            padding: '10px 14px',
            borderRadius: 8,
            border: '1px solid rgba(255,255,255,0.12)',
            background: 'rgba(255,255,255,0.06)',
            color: JELLY.text,
            cursor: 'pointer',
            fontSize: 13,
            fontWeight: 500,
          }}
        >
          설정 변경
        </button>

        <button
          type="button"
          onClick={() => handleDisconnect()}
          style={{
            ...jellyDangerButton,
            width: '100%',
            marginTop: 8,
            fontSize: 13,
          }}
        >
          연결 해제
        </button>
      </div>

      {message && (
        <div
          style={{
            padding: '12px 16px',
            ...jellyCardStyle,
            fontSize: 13,
            color: message.tone === 'ok' ? '#059669' : '#dc2626',
            background: message.tone === 'ok' ? 'rgba(5, 150, 105, 0.1)' : 'rgba(220, 38, 38, 0.1)',
            lineHeight: 1.5,
          }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
