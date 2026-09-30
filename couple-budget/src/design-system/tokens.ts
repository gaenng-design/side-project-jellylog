/**
 * 디자인 토큰 — 앱 전체 색·글꼴·간격·모서리·그림자의 단일 기준(single source of truth).
 *
 * 분위기: 차분한 핀테크. 밝은 캔버스 위 흰 카드, 은은한 그림자, 대비가 분명한 회색 단계.
 * 규칙
 *  - 화면 코드에 `#RRGGBB`를 직접 쓰지 않고 이 파일의 토큰을 쓴다.
 *  - 같은 의미는 같은 색: 이익=positive, 손실=negative, 주의=warning.
 *  - 글자색은 text.*, 면 색은 bg.*, 선은 border.* 로만 고른다.
 *  - `styles/jellyGlass.ts`, `styles/formControls.ts` 는 이 토큰에서 파생된다(기존 export 이름 유지).
 */
import type { CSSProperties } from 'react'

export const DS = {
  color: {
    /** 면(배경) */
    bg: {
      /** 앱 캔버스 */
      primary: '#F5F7FA',
      /** 카드·모달 면 */
      secondary: '#FFFFFF',
      /** 입력 주변·비활성 면 */
      tertiary: '#F0F2F5',
      /** 표 머리글·보조 영역 */
      subtle: '#F9FAFB',
      /** 칩·구분 면 */
      muted: '#F3F4F6',
    },
    /** 글자 — 흰 배경 대비: primary 16.9 · body 10.3 · secondary 4.8 · muted 3.3 */
    text: {
      primary: '#1A1D1F',
      body: '#374151',
      secondary: '#6B7280',
      /** 보조 설명·축 라벨·빈 값 표시 (맑은 청회색) */
      muted: '#8590A2',
      disabled: '#A0A4A8',
      /** 색 면(버튼·배지) 위 글자 */
      inverse: '#FFFFFF',
    },
    /** 선 */
    border: {
      subtle: '#E5E7EB',
      default: '#D1D5DB',
      strong: '#B3B8C1',
    },
    /** 주 색 (포인트·CTA) */
    primary: '#4F8CFF',
    primarySoft: '#EAF2FF',
    /** 작은 글자·링크로 쓸 때 (흰 배경 대비 4.7) */
    primaryDark: '#3B6FD9',
    /** 이익·증가 */
    positive: { main: '#059669', soft: '#ECFDF5', border: '#A7F3D0' },
    /** 손실·감소·오류 */
    negative: { main: '#DC2626', strong: '#B91C1C', soft: '#FEF2F2', border: '#FCA5A5' },
    /** 주의·임박 */
    warning: { main: '#F59E0B', text: '#D97706', soft: '#FFFBEB', border: '#FED7AA' },
    /** 자산 카테고리 */
    category: { savings: '#3B82F6', invest: '#8B5CF6', realEstate: '#F59E0B' },
    /** 글로벌 내비 */
    sidebar: { bg: '#1A1D21' },
    /** 차트 강조용 (텍스트에는 positive.main 사용) */
    success: '#22C55E',
    error: '#DC2626',
    info: '#3B82F6',
    gradient: 'linear-gradient(135deg, #4F8CFF 0%, #6EA8FF 100%)',
  },
  font: {
    family: `'Inter', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif`,
    title1: { size: 24, weight: 700 as const, lineHeight: 1.25 },
    title2: { size: 20, weight: 600 as const, lineHeight: 1.3 },
    body: { size: 14, weight: 400 as const, lineHeight: 1.5 },
    caption: { size: 12, weight: 500 as const, lineHeight: 1.45 },
    /** 글자 크기 스케일 — 모바일 가독성을 위해 11px 미만은 쓰지 않는다 */
    size: { micro: 11, caption: 12, small: 13, body: 14, large: 16, title: 20, display: 26 },
  },
  space: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const,
  grid: {
    columns: 12,
    gutter: 24,
    margin: 32,
    maxWidth: 1440,
  },
  radius: {
    card: 16,
    control: 12,
    chip: 999,
  },
  shadow: {
    1: '0 2px 8px rgba(0,0,0,0.04)',
    2: '0 8px 20px rgba(0,0,0,0.06)',
    3: '0 16px 40px rgba(0,0,0,0.08)',
  },
  motion: {
    duration: 150,
    easing: 'ease-in-out' as const,
  },
  sidebar: {
    width: 80,
  },
  row: {
    transactionHeight: 64,
  },
  button: {
    height: 40,
  },
} as const

export const tabularNums: CSSProperties = { fontVariantNumeric: 'tabular-nums' }
