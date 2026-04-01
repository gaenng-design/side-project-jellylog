import { useEffect, useState } from 'react'
import { supabase, isSupabaseConfigured } from '@/data/supabase'
import {
  createHouseholdRpc,
  joinHouseholdRpc,
  ensureSupabaseSessionForSync,
  resolveSessionAndHouseholdBeforeHydrate,
  leaveHouseholdAndClearLocal,
  getSyncHouseholdId,
  getSavedAccessCode,
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
  jellyGhostButton,
} from '@/styles/jellyGlass'
import { PRIMARY_DARK } from '@/styles/formControls'

export function AccountPage() {
  const [accessCodeInput, setAccessCodeInput] = useState('')
  const [sessionReady, setSessionReady] = useState(false)
  const [householdId, setHouseholdId] = useState<string | null>(null)
  const [msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)
  const [busy, setBusy] = useState(false)
  const [sessionError, setSessionError] = useState<string | null>(null)

  /** 가계 연결 시 localStorage 에 저장된 16자 코드(만든 사람·참여 시 입력한 코드). 페이지를 다시 열어도 동일 */
  const persistedAccessCode = householdId ? getSavedAccessCode() : null

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
      return
    }
    setSessionError(null)
    const {
      data: { session },
    } = await supabase.auth.getSession()
    setSessionReady(!!session?.user)
    await resolveSessionAndHouseholdBeforeHydrate()
    setHouseholdId(getSyncHouseholdId())
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

  const handleCreateHousehold = async () => {
    setMsg(null)
    setBusy(true)
    try {
      const res = await createHouseholdRpc()
      if (!res.ok) {
        setMsg({ tone: 'err', text: res.error })
        return
      }
      setHouseholdId(res.householdId)
      setMsg({
        tone: 'ok',
        text: '가계가 만들어졌습니다. 아래 아이디를 상대에게 전달하면 같은 가계에 들어올 수 있습니다. 이 기기에도 저장되어 앱을 다시 켜도 이어집니다.',
      })
    } finally {
      setBusy(false)
    }
  }

  const handleJoin = async () => {
    setMsg(null)
    setBusy(true)
    try {
      const res = await joinHouseholdRpc(accessCodeInput)
      if (!res.ok) {
        setMsg({ tone: 'err', text: res.error })
        return
      }
      setHouseholdId(res.householdId)
      setAccessCodeInput('')
      setMsg({ tone: 'ok', text: '같은 가계에 연결했습니다. 서버 데이터를 이 기기에 반영했습니다.' })
    } finally {
      setBusy(false)
    }
  }

  const handleResetDevice = async () => {
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
        text: '가계 연결이 끊겼습니다. 이 기기의 월별·템플릿·설정 저장은 비웁니다. 같은 접속 코드로 다시 참여하면 서버 데이터를 불러옵니다. 잠시 후 새로고침합니다.',
      })
      window.setTimeout(() => window.location.reload(), 500)
    } finally {
      setBusy(false)
    }
  }

  if (!isSupabaseConfigured) {
    return (
      <div style={{ maxWidth: 520 }}>
        <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 12, color: JELLY.text }}>계정</h1>
        <p style={{ color: JELLY.textMuted, fontSize: 14, lineHeight: 1.6 }}>
          Supabase가 설정되지 않았습니다. 프로젝트 루트 <code>.env</code>에 <code>VITE_SUPABASE_URL</code>,{' '}
          <code>VITE_SUPABASE_ANON_KEY</code>를 넣은 뒤 앱을 다시 실행해 주세요.
        </p>
      </div>
    )
  }

  return (
    <div style={{ maxWidth: 520, paddingBottom: 40 }}>
      <h1 style={{ fontSize: 20, fontWeight: 600, marginBottom: 8, color: JELLY.text }}>계정</h1>
      <p style={{ color: JELLY.textMuted, fontSize: 13, lineHeight: 1.55, marginBottom: 20 }}>
        {householdId ? (
          <>
            가계에 연결된 상태입니다. 아래 <strong>접속 코드</strong>를 상대에게 알려 주면 같은 가계에 참여할 수 있습니다.
            동기화는 서버와 자동으로 이뤄집니다. (MVP: 사용자 2명까지)
          </>
        ) : (
          <>
            <strong style={{ color: JELLY.text }}>새 가계 만들기</strong>를 누르면 이 가계만의{' '}
            <strong>아이디(16자, 0–9·A–F)</strong>가 발급됩니다. 그 아이디가 곧 <strong>접속 코드</strong>이며, 상대
            기기에서 같은 아이디를 입력하면 같은 가계에 붙습니다. 이 기기에 저장되며 이 페이지에서 계속 확인할 수 있습니다.
            (MVP: 사용자 2명까지) 개발자 설정: Supabase 대시보드에서 <strong style={{ color: JELLY.text }}>Anonymous</strong>{' '}
            로그인을 켜 두어야 합니다.
          </>
        )}
      </p>

      {sessionError ? (
        <div style={{ marginBottom: 20, padding: 16, ...jellyErrorBanner }}>
          <div style={{ fontWeight: 700, color: '#991b1b', marginBottom: 8 }}>연결 오류</div>
          <p style={{ margin: '0 0 12px', fontSize: 13, color: '#7f1d1d', lineHeight: 1.55 }}>{sessionError}</p>
          <p style={{ margin: '0 0 12px', fontSize: 12, color: '#991b1b', lineHeight: 1.5 }}>
            콘솔에도 같은 메시지가 찍힐 수 있습니다. `.env` 수정 뒤에는 dev 서버를 재시작하세요.
          </p>
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
            <span style={{ color: '#059669' }}>서버 연결됨 · 가계 아이디로 들어오면 동기화할 수 있습니다</span>
          )}
          {getSavedAccessCode() && !householdId && sessionReady ? (
            <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: PRIMARY_DARK }}>
              이 기기에 가계 아이디가 저장되어 있습니다. 아래에서 참여하기를 누르면 같은 아이디로 다시 붙을 수 있습니다.
            </span>
          ) : null}
          {householdId ? (
            <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#6b7280' }}>
              가계 연결됨 · 내부 참고 <code style={{ fontSize: 11 }}>{householdId.slice(0, 8)}…</code>
            </span>
          ) : sessionReady ? (
            <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#b45309' }}>
              아직 가계에 속하지 않았습니다. 새로 만들거나 상대가 알려준 아이디로 참여하세요.
            </span>
          ) : null}
        </div>
      )}

      {persistedAccessCode ? (
        <div
          style={{
            marginBottom: 20,
            padding: 16,
            ...jellySuccessBanner,
            fontSize: 14,
            color: '#166534',
          }}
        >
          <div style={{ fontWeight: 700, marginBottom: 8 }}>가계 아이디 (접속 코드)</div>
          <p style={{ margin: '0 0 10px', fontSize: 12, lineHeight: 1.5, opacity: 0.95 }}>
            이 기기에 저장되어 있어, 이 페이지를 다시 열어도 아래 코드로 확인·복사할 수 있습니다. 상대에게 전달하면 같은 가계에 참여합니다.
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: 10 }}>
            <strong style={{ fontSize: 17, letterSpacing: 1, fontFamily: 'ui-monospace, monospace' }}>
              {persistedAccessCode}
            </strong>
            <button
              type="button"
              onClick={() => void navigator.clipboard.writeText(persistedAccessCode)}
              style={{
                ...jellyGhostButton,
                padding: '8px 16px',
                fontSize: 12,
                color: '#166534',
                border: '1px solid rgba(167, 243, 208, 0.75)',
                background: 'rgba(255,255,255,0.45)',
              }}
            >
              복사
            </button>
          </div>
        </div>
      ) : null}

      {!householdId ? (
        <>
          <div
            style={{
              marginBottom: 20,
              padding: 16,
              ...jellyCardStyle,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: JELLY.text }}>1. 새 가계 만들기</div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: JELLY.textMuted, lineHeight: 1.5 }}>
              가계가 생기면 <strong>아이디(접속 코드)</strong>가 발급되며, 이 페이지와 이 기기에 저장되어 계속 확인할 수
              있습니다. 상대에게 전달해 주세요.
            </p>
            <button
              type="button"
              disabled={busy || !sessionReady}
              onClick={() => void handleCreateHousehold()}
              style={busy || !sessionReady ? jellyPrimaryButtonDisabled : jellyPrimaryButton}
            >
              새 가계 만들기
            </button>
          </div>

          <div
            style={{
              marginBottom: 20,
              padding: 16,
              ...jellyCardStyle,
            }}
          >
            <div style={{ fontSize: 14, fontWeight: 600, marginBottom: 10, color: JELLY.text }}>2. 가계 아이디로 참여</div>
            <p style={{ margin: '0 0 10px', fontSize: 12, color: JELLY.textMuted, lineHeight: 1.5 }}>
              상대가 알려준 16자 아이디를 입력합니다. 새 기기에서도 같은 아이디로 들어오면 됩니다.
            </p>
            <div
              style={{
                display: 'flex',
                flexWrap: 'wrap',
                alignItems: 'center',
                gap: 12,
              }}
            >
              <input
                type="text"
                inputMode="text"
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
                value={accessCodeInput}
                onChange={(e) =>
                  setAccessCodeInput(e.target.value.toUpperCase().replace(/[^0-9A-F]/g, ''))
                }
                placeholder="16자 (0-9, A-F)"
                aria-label="가계 접속 코드 16자"
                style={{
                  ...jellyInputSurface,
                  padding: '10px 14px',
                  fontSize: 14,
                  flex: '1 1 200px',
                  minWidth: 0,
                  maxWidth: 320,
                  width: '100%',
                  boxSizing: 'border-box',
                  fontFamily: 'ui-monospace, monospace',
                }}
              />
              <button
                type="button"
                disabled={busy || !sessionReady || accessCodeInput.length < 16}
                onClick={() => void handleJoin()}
                style={{
                  flexShrink: 0,
                  ...(busy || !sessionReady || accessCodeInput.length < 16
                    ? jellyPrimaryButtonDisabled
                    : jellyPrimaryButton),
                }}
              >
                참여하기
              </button>
            </div>
          </div>
        </>
      ) : null}

      {householdId ? (
        <div>
          <button
            type="button"
            disabled={busy}
            onClick={() => void handleResetDevice()}
            style={busy ? { ...jellyDangerButton, opacity: 0.55, cursor: 'not-allowed' } : jellyDangerButton}
          >
            가계 연결 해제
          </button>
          <p style={{ margin: '8px 0 0', fontSize: 11, color: JELLY.textMuted, lineHeight: 1.45 }}>
            <strong>서버의 가계 데이터는 그대로 두고</strong> 멤버 연결만 끊습니다. 이 기기에서는 월별·기본값 저장이 모두 지워져 빈
            상태가 됩니다. 같은 접속 코드로 다시 참여하면 서버에 있는 데이터를 불러옵니다. 상대 기기도 연결이 끊기므로 같은 코드로
            다시 참여해야 합니다.
          </p>
        </div>
      ) : null}

      {msg ? (
        <div
          style={{
            marginTop: 16,
            fontSize: 13,
            color: msg.tone === 'err' ? '#b91c1c' : '#059669',
            lineHeight: 1.5,
          }}
        >
          {msg.text}
        </div>
      ) : null}
    </div>
  )
}
