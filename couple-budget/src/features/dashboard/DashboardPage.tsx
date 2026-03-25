import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'

export function DashboardPage() {
  return (
    <div>
      <header style={{ marginBottom: 28 }}>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            color: JELLY.text,
            margin: '0 0 8px',
            letterSpacing: '-0.03em',
            lineHeight: 1.15,
          }}
        >
          대시보드
        </h1>
        <p style={{ margin: 0, fontSize: 15, color: JELLY.textMuted, lineHeight: 1.5, maxWidth: 520 }}>
          월 정산과 지출 계획을 한곳에서 관리합니다. 왼쪽 메뉴에서 화면을 이동할 수 있습니다.
        </p>
      </header>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: 18,
        }}
      >
        <div style={{ ...jellyCardStyle, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: JELLY.textMuted, marginBottom: 8 }}>지출 계획</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: JELLY.text, lineHeight: 1.45 }}>
            수입·고정지출·투자·용돈을 월별로 입력하고 정산합니다.
          </div>
        </div>
        <div style={{ ...jellyCardStyle, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: JELLY.textMuted, marginBottom: 8 }}>설정</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: JELLY.text, lineHeight: 1.45 }}>
            템플릿·유저 이름·칩 색·Supabase 저장을 다룹니다.
          </div>
        </div>
        <div style={{ ...jellyCardStyle, padding: 22 }}>
          <div style={{ fontSize: 13, fontWeight: 700, color: JELLY.textMuted, marginBottom: 8 }}>계정 · 동기화</div>
          <div style={{ fontSize: 15, fontWeight: 600, color: JELLY.text, lineHeight: 1.45 }}>
            가계 연결, 접속 코드, 서버와의 동기화 상태를 확인합니다.
          </div>
        </div>
      </div>
    </div>
  )
}
