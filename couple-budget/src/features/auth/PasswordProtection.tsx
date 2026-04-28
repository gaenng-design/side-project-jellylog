import { useState, useEffect } from 'react'
import { jellyCardStyle, jellyPrimaryButton } from '@/styles/jellyGlass'

export function PasswordProtection({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')

  const appPassword = import.meta.env.VITE_APP_PASSWORD || '260517'

  useEffect(() => {
    // Check if already authenticated in this session
    const authStatus = sessionStorage.getItem('couple-budget:authenticated')
    if (authStatus === 'true') {
      setIsAuthenticated(true)
    }
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (password === appPassword) {
      setIsAuthenticated(true)
      sessionStorage.setItem('couple-budget:authenticated', 'true')
    } else {
      setError('비밀번호가 올바르지 않습니다.')
      setPassword('')
    }
  }

  if (isAuthenticated) {
    return <>{children}</>
  }

  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      }}
    >
      <div style={{ ...jellyCardStyle, padding: '40px', maxWidth: '400px', width: '100%' }}>
        <h1 style={{ fontSize: 24, fontWeight: 600, marginBottom: 8, textAlign: 'center' }}>
          부부 가계부
        </h1>
        <p style={{ fontSize: 14, color: '#999', marginBottom: 32, textAlign: 'center' }}>
          접근 비밀번호를 입력해주세요
        </p>

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: 20 }}>
            <input
              type="password"
              placeholder="비밀번호"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              autoFocus
              style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: 14,
                border: '1px solid rgba(255,255,255,0.2)',
                borderRadius: 8,
                background: 'rgba(255,255,255,0.1)',
                color: '#fff',
                boxSizing: 'border-box',
              }}
              onKeyPress={(e) => {
                if (e.key === 'Enter') {
                  handleSubmit(e as any)
                }
              }}
            />
          </div>

          {error && (
            <div
              style={{
                marginBottom: 16,
                padding: '10px 12px',
                borderRadius: 8,
                fontSize: 12,
                color: '#dc2626',
                background: 'rgba(220, 38, 38, 0.1)',
              }}
            >
              {error}
            </div>
          )}

          <button
            type="submit"
            style={{
              width: '100%',
              ...jellyPrimaryButton,
            }}
          >
            입장
          </button>
        </form>
      </div>
    </div>
  )
}
