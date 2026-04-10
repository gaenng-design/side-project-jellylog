import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/data/supabase'
import {
  createHouseholdByNameRpc,
  joinHouseholdByPasswordRpcWithHydrate,
  ensureSupabaseSessionForSync,
  resolveSessionAndHouseholdBeforeHydrate,
  leaveHouseholdAndClearLocal,
  getSyncHouseholdId,
  getSyncHouseholdName,
  getRememberHousehold,
} from '@/services/authHousehold'
import {
  JELLY,
  jellyCardStyle,
  jellyPrimaryButton,
  jellyPrimaryButtonDisabled,
  jellyDangerButton,
  jellyInputSurface,
  jellyErrorBanner,
  jellySuccessBanner,
} from '@/styles/jellyGlass'
import { PRIMARY, PRIMARY_DARK, pageTitleH1Style } from '@/styles/formControls'

export function AccountPage() {
  // Join form state
  const [householdName, setHouseholdName] = useState('')
  const [password, setPassword] = useState('')
  const [rememberHousehold, setRememberHousehold] = useState(false)

  // Create modal state
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createHouseholdName, setCreateHouseholdName] = useState('')
  const [createPassword, setCreatePassword] = useState('')
  const [createConfirmPassword, setCreateConfirmPassword] = useState('')

  // UI state
  const [sessionReady, setSessionReady] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(() => getSyncHouseholdId())
  const [connectedHouseholdName, setConnectedHouseholdName] = useState<string | null>(() => getSyncHouseholdName())
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  // Load remembered household name if checkbox was previously checked
  useEffect(() => {
    const remembered = getRememberHousehold()
    if (remembered) {
      const savedName = getSyncHouseholdName()
      if (savedName) {
        setHouseholdName(savedName)
      }
    }
  }, [])

  const refreshLocal = async () => {
    if (!isSupabaseConfigured || !supabase) {
      setSessionReady(false)
      setSessionError(null)
      return
    }
    const ensured = await ensureSupabaseSessionForSync()
    if (!ensured.ok) {
      setSessionError(ensured.reason)
      setSessionReady(false)
      setHouseholdId(null)
      setConnectedHouseholdName(null)
      return
    }
    setSessionError(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setSessionReady(!!session?.user)
    await resolveSessionAndHouseholdBeforeHydrate()
    setHouseholdId(getSyncHouseholdId())
    setConnectedHouseholdName(getSyncHouseholdName())
  }

  useEffect(() => {
    if (!isSupabaseConfigured || !supabase) return
    void refreshLocal()
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(() => {
      void refreshLocal()
    })
    return () => subscription.unsubscribe()
  }, [])

  const handleCreate = async () => {
    setMsg(null)
    if (!createHouseholdName.trim()) {
      setMsg({ tone: 'err', text: '가계 이름을 입력해 주세요.' })
      return
    }
    if (!createPassword.trim()) {
      setMsg({ tone: 'err', text: '비밀번호를 입력해 주세요.' })
      return
    }
    if (createPassword !== createConfirmPassword) {
      setMsg({ tone: 'err', text: '비밀번호가 일치하지 않습니다.' })
      return
    }
    setBusy(true)
    try {
      const res = await createHouseholdByNameRpc(createHouseholdName.trim(), createPassword)
      if (!res.ok) {
        setMsg({ tone: 'err', text: res.error })
        return
      }
      setHouseholdId(res.householdId)
      setConnectedHouseholdName(createHouseholdName.trim())
      setCreateHouseholdName('')
      setCreatePassword('')
      setCreateConfirmPassword('')
      setShowCreateModal(false)
      setMsg({
        tone: 'ok',
        text: `가계 "${createHouseholdName.trim()}"가 만들어졌습니다. 상대방과 가계 이름과 비밀번호를 공유해 주세요.`,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    setMsg(null)
    if (!householdName.trim()) {
      setMsg({ tone: 'err', text: '가계 이름을 입력해 주세요.' })
      return
    }
    if (!password.trim()) {
      setMsg({ tone: 'err', text: '비밀번호를 입력해 주세요.' })
      return
    }
    setBusy(true)
    try {
      const res = await joinHouseholdByPasswordRpcWithHydrate(householdName.trim(), password)
      if (!res.ok) {
        setMsg({ tone: 'err', text: res.error })
        return
      }
      setHouseholdId(res.householdId)
      setConnectedHouseholdName(householdName.trim())
      setMsg({
        tone: 'ok',
        text: `가계 "${householdName.trim()}"에 입장했습니다.`,
      })
    } finally {
      setBusy(false)
    }
  }

  const handleDisconnect = async () => {
    setMsg(null)
    setBusy(true)
    try {
      const res = await leaveHouseholdAndClearLocal()
      if (!res.ok) {
        setMsg({ tone: 'err', text: res.error })
        return
      }
      setMsg({
        tone: 'ok',
        text: '가계 연결이 끊겼습니다. 잠시 후 새로고침합니다.',
      })
      window.setTimeout(() => window.location.reload(), 500)
    } finally {
      setBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ ...pageTitleH1Style, marginBottom: 12 }}>계정</h1>
        <p style={{ color: JELLY.textMuted, fontSize: 14, lineHeight: 1.6 }}>
          Supabase가 설정되지 않았습니다. 프로젝트 루트 <code>.env</code>에 <code>VITE_SUPABASE_URL</code>,{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>를 넣은 뒤 앱을 다시 실행해 주세요.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 12 }}>계정</h1>

      {householdId && connectedHouseholdName ? (
        <>
          <div style={{ ...jellyCardStyle, padding: '16px', marginBottom: 20 }}>
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 12, color: JELLY.text }}>
              가계 연결됨
            </div>
            <div style={{ fontSize: 13, color: '#6b7280', marginBottom: 8 }}>
              가계 이름: <strong>{connectedHouseholdName}</strong>
            </div>
            <button
              type="button"
              disabled={busy}
              onClick={() => void handleDisconnect()}
              style={busy ? jellyPrimaryButtonDisabled : jellyDangerButton}
            >
              가계 연결 해제
            </button>
          </div>
        </>
      ) : (
        <>
          <div style={{ ...jellyCardStyle, padding: '16px', marginBottom: 20 }}>
            <div style={{ marginBottom: 16 }}>
              <input
                type="text"
                placeholder="가계 이름"
                value={householdName}
                onChange={(e) => setHouseholdName(e.target.value)}
                style={{
                  ...jellyInputSurface,
                  width: '100%',
                  marginBottom: 10,
                  padding: '12px 14px',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <input
                type="password"
                placeholder="비밀번호"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{
                  ...jellyInputSurface,
                  width: '100%',
                  marginBottom: 6,
                  padding: '12px 14px',
                  fontSize: 14,
                  boxSizing: 'border-box',
                }}
              />
              <button
                type="button"
                disabled={busy || !sessionReady}
                onClick={() => setShowCreateModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '6px 0',
                  fontSize: 13,
                  color: busy || !sessionReady ? '#9ca3af' : PRIMARY,
                  cursor: busy || !sessionReady ? 'default' : 'pointer',
                  textAlign: 'left',
                  fontWeight: 500,
                  transition: 'color 0.15s ease',
                }}
              >
                새 가계 생성
              </button>
            </div>

            <div style={{ marginBottom: 12 }}>
              <button
                type="button"
                disabled={busy || !sessionReady || !householdName.trim() || !password.trim()}
                onClick={() => void handleJoin()}
                style={{
                  width: '100%',
                  marginBottom: msg?.tone === 'err' ? 8 : 0,
                  ...(busy || !sessionReady || !householdName.trim() || !password.trim()
                    ? jellyPrimaryButtonDisabled
                    : jellyPrimaryButton)
                }}
              >
                가계 진입
              </button>
              {msg?.tone === 'err' && (
                <div style={{ fontSize: 12, color: '#dc2626', lineHeight: 1.4 }}>
                  {msg.text}
                </div>
              )}
            </div>

            <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: JELLY.text, cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={rememberHousehold}
                onChange={(e) => setRememberHousehold(e.target.checked)}
                style={{ cursor: 'pointer' }}
              />
              가계 진입 유지하기
            </label>
          </div>

          {showCreateModal && (
            <>
              <div
                role="presentation"
                onClick={() => setShowCreateModal(false)}
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0,0,0,0.35)',
                  zIndex: 1000,
                  marginBottom: 0,
                }}
              />
              <div
                role="dialog"
                aria-modal="true"
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'min(100%, 400px)',
                  zIndex: 1001,
                  ...jellyCardStyle,
                  padding: '24px',
                }}
              >
                <div style={{ marginBottom: 24 }}>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: JELLY.text, marginBottom: 16 }}>
                    새 가계 만들기
                  </h2>
                  <input
                    type="text"
                    placeholder="가계 이름"
                    value={createHouseholdName}
                    onChange={(e) => setCreateHouseholdName(e.target.value)}
                    style={{
                      ...jellyInputSurface,
                      width: '100%',
                      marginBottom: 10,
                      padding: '12px 14px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="password"
                    placeholder="비밀번호"
                    value={createPassword}
                    onChange={(e) => setCreatePassword(e.target.value)}
                    style={{
                      ...jellyInputSurface,
                      width: '100%',
                      marginBottom: 10,
                      padding: '12px 14px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                  <input
                    type="password"
                    placeholder="비밀번호 확인"
                    value={createConfirmPassword}
                    onChange={(e) => setCreateConfirmPassword(e.target.value)}
                    style={{
                      ...jellyInputSurface,
                      width: '100%',
                      marginBottom: 0,
                      padding: '12px 14px',
                      fontSize: 14,
                      boxSizing: 'border-box',
                    }}
                  />
                </div>

                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => setShowCreateModal(false)}
                    style={{
                      flex: 1,
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1px solid #e5e7eb',
                      background: '#fff',
                      color: JELLY.text,
                      cursor: 'pointer',
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    취소
                  </button>
                  <button
                    type="button"
                    disabled={busy || !createHouseholdName.trim() || !createPassword.trim() || !createConfirmPassword.trim()}
                    onClick={() => void handleCreate()}
                    style={{
                      flex: 1,
                      ...(busy || !createHouseholdName.trim() || !createPassword.trim() || !createConfirmPassword.trim()
                        ? jellyPrimaryButtonDisabled
                        : jellyPrimaryButton),
                      fontSize: 14,
                      fontWeight: 600,
                    }}
                  >
                    {busy ? '생성 중…' : '만들기'}
                  </button>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {msg && (
        <div
          style={{
            ...jellyCardStyle,
            padding: '12px 16px',
            marginBottom: 20,
            background: msg.tone === 'ok' ? jellySuccessBanner.background : jellyErrorBanner.background,
          }}
        >
          <div style={{ fontSize: 13, color: msg.tone === 'ok' ? '#065f46' : '#991b1b', lineHeight: 1.5 }}>
            {msg.text}
          </div>
        </div>
      )}

      {sessionError ? (
        <div style={{ marginBottom: 20, padding: 16, ...jellyErrorBanner }}>
          <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>연결 오류</div>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#7f1d1d', lineHeight: 1.55 }}>{sessionError}</p>
          <button
            type="button"
            disabled={busy}
            onClick={() => void refreshLocal()}
            style={busy ? jellyPrimaryButtonDisabled : jellyPrimaryButton}
          >
            다시 연결 시도
          </button>
        </div>
      ) : (
        <div style={{ marginBottom: 20, fontSize: 14, color: JELLY.text }}>
          연결 상태:{' '}
          {!sessionReady ? (
            <span style={{ color: '#b45309' }}>준비 중…</span>
          ) : (
            <span style={{ color: '#059669' }}>서버 연결됨</span>
          )}
        </div>
      )}
    </div>
  )
}
