import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { pageTitleH1Style } from '@/styles/formControls'
import { useNarrowLayout } from '@/context/NarrowLayoutContext'

export function RealEstatePage() {
  const narrow = useNarrowLayout()

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
      <h1 style={pageTitleH1Style}>부동산</h1>
      <div
        style={{
          ...jellyCardStyle,
          padding: narrow ? '24px 16px' : '32px 28px',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 12,
          minHeight: 200,
          textAlign: 'center',
        }}
      >
        <span style={{ fontSize: 48 }}>🏡</span>
        <p style={{ fontSize: 16, color: JELLY.textMuted, margin: 0 }}>
          부동산 기능을 준비 중입니다.
        </p>
      </div>
    </div>
  )
}
