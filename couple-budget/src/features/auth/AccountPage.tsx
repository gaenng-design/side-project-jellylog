import { useState } from 'react'
import {
  JELLY,
  jellyCardStyle,
  jellyPrimaryButton,
} from '@/styles/jellyGlass'
import { PRIMARY, pageTitleH1Style } from '@/styles/formControls'

export function AccountPage() {
  // This page will be used for GitHub settings in the future
  const [_githubToken, setGithubToken] = useState('')
  const [_msg, setMsg] = useState<{ tone: 'ok' | 'err'; text: string } | null>(null)

  return (
    <div style={{ maxWidth: 520, paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 12 }}>계정</h1>
      <div style={{ ...jellyCardStyle, padding: '16px' }}>
        <p style={{ fontSize: 14, color: JELLY.text, lineHeight: 1.6, margin: 0 }}>
          GitHub 동기화 설정은 설정(⚙️) 탭에서 관리합니다.
        </p>
      </div>
    </div>
  )
}
