import type { CSSProperties } from 'react'

/**
 * 앱 전역 시각 토큰 — 소프트 핀테크 UI (밝은 캔버스 · 화이트 카드 · 은은한 섀도)
 * 기존 export 이름 유지 → 기능 변경 없이 스타일만 일괄 적용
 */

const BG = '#F5F7FA'
const CARD = '#FFFFFF'
const TEXT = '#1A1D1F'
const TEXT_MUTED = '#6B7280'
const PRIMARY_BTN = '#4F8CFF'
const PRIMARY_SOFT = '#EAF2FF'

/** 미세 지형선 패턴 (참고 UI와 유사한 밝은 배경 질감) */
const topoPattern = encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 120 120">
  <g fill="none" stroke="#94A3B8" stroke-width="0.35" opacity="0.14">
    <path d="M0 30 Q30 20 60 30 T120 30"/>
    <path d="M0 60 Q30 50 60 60 T120 60"/>
    <path d="M0 90 Q30 80 60 90 T120 90"/>
    <path d="M30 0 Q20 30 30 60 T30 120"/>
    <path d="M60 0 Q50 30 60 60 T60 120"/>
    <path d="M90 0 Q80 30 90 60 T90 120"/>
  </g>
</svg>`)

export const JELLY = {
  text: TEXT,
  textMuted: TEXT_MUTED,
  primary: PRIMARY_SOFT,
  surface: CARD,
  surfaceInput: '#F0F2F5',
  innerBorder: '1px solid rgba(0,0,0,0.06)',
  innerBorderSoft: '1px solid rgba(0,0,0,0.04)',
  /** 레거시 코드 호환: 블러 없음 */
  blur: 'blur(0px)',
  shadowFloat: '0 8px 24px rgba(0, 0, 0, 0.06)',
  shadowModal: '0 16px 48px rgba(0, 0, 0, 0.1)',
  radiusControl: 12,
  radiusUserChip: 9999,
  radiusFull: 9999,
  radiusLg: 20,
  radiusMd: 20,
} as const

export const jellyFontStack =
  "'Inter', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif"

export const jellyShellBackground: CSSProperties = {
  backgroundColor: BG,
  backgroundImage: `url("data:image/svg+xml,${topoPattern}")`,
  backgroundSize: '120px 120px',
}

/** 앱 외곽 nav 전용이 아닌 레거시 참조용 — 다크 사이드바는 App.tsx에서 별도 정의 */
export const jellySidebarShell: CSSProperties = {
  background: '#1A1D21',
  borderRight: 'none',
  boxShadow: '4px 0 24px rgba(0,0,0,0.06)',
}

export const jellyCardStyle: CSSProperties = {
  background: CARD,
  borderRadius: JELLY.radiusLg,
  border: 'none',
  boxShadow: JELLY.shadowFloat,
}

export const jellyPrimaryButton: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  padding: '11px 22px',
  border: 'none',
  background: PRIMARY_BTN,
  color: '#ffffff',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 14px rgba(79, 140, 255, 0.35)',
}

export const jellyPrimaryButtonDisabled: CSSProperties = {
  ...jellyPrimaryButton,
  opacity: 0.5,
  cursor: 'not-allowed',
  boxShadow: 'none',
}

export const jellyGhostButton: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  padding: '8px 16px',
  border: JELLY.innerBorderSoft,
  background: '#F0F2F5',
  color: TEXT_MUTED,
  fontWeight: 500,
  cursor: 'pointer',
}

export const jellyDangerButton: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  padding: '10px 18px',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  background: 'rgba(254, 242, 242, 0.95)',
  color: '#B91C1C',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
}

export const jellyInputSurface: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  border: JELLY.innerBorderSoft,
  background: '#FFFFFF',
  color: TEXT,
  boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
}

export const jellyModalOverlay: CSSProperties = {
  background: 'rgba(26, 29, 31, 0.45)',
}

export const jellyModalPanel: CSSProperties = {
  background: CARD,
  borderRadius: JELLY.radiusLg,
  boxShadow: JELLY.shadowModal,
  border: 'none',
}

export const jellyErrorBanner: CSSProperties = {
  ...jellyCardStyle,
  background: 'rgba(254, 242, 242, 0.92)',
  border: '1px solid rgba(252, 165, 165, 0.45)',
}

export const jellySuccessBanner: CSSProperties = {
  ...jellyCardStyle,
  background: 'rgba(240, 253, 244, 0.92)',
  border: '1px solid rgba(167, 243, 208, 0.5)',
}
