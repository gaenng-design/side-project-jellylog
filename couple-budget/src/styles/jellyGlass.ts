import type { CSSProperties } from 'react'

/**
 * Jelly-Glass 디자인 시스템 토큰
 * — 투명 블루 젤리 × 글래스모피즘, 직선 배제·극단적 라운딩
 */
export const JELLY = {
  text: '#1e293b',
  textMuted: '#475569',
  /** Primary Jelly Blue */
  primary: 'rgba(186, 230, 253, 0.5)',
  surface: 'rgba(255, 255, 255, 0.3)',
  surfaceInput: 'rgba(255, 255, 255, 0.22)',
  innerBorder: '1px solid rgba(255, 255, 255, 0.5)',
  innerBorderSoft: '1px solid rgba(255, 255, 255, 0.35)',
  blur: 'blur(12px)',
  shadowFloat: '0 12px 48px rgba(15, 23, 42, 0.06), 0 4px 24px rgba(99, 102, 241, 0.06)',
  shadowModal: '0 24px 64px rgba(15, 23, 42, 0.12), 0 8px 24px rgba(14, 165, 233, 0.15)',
  /** 인풋·버튼·드롭다운 등 조작 요소 */
  radiusControl: 6,
  /** 유저 구분 칩(완전 알약, CSS 100% pill) */
  radiusUserChip: 9999,
  /** 카드·모달 패널 등 큰 서피스 */
  radiusFull: 9999,
  radiusLg: 28,
  /** @deprecated prefer radiusControl */
  radiusMd: 24,
} as const

export const jellyFontStack =
  "'Nunito', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', ui-rounded, system-ui, sans-serif"

export const jellyShellBackground: CSSProperties = {
  background:
    'linear-gradient(138deg, #e8ecfc 0%, #f0e8ff 22%, #e4f2fc 48%, #eef6ff 72%, #ebe8ff 100%)',
}

export const jellySidebarShell: CSSProperties = {
  background: 'linear-gradient(180deg, rgba(255,255,255,0.5) 0%, rgba(186, 230, 253, 0.42) 55%, rgba(147, 197, 253, 0.35) 100%)',
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
  borderRight: JELLY.innerBorder,
  boxShadow: '6px 0 32px rgba(14, 165, 233, 0.08)',
}

export const jellyCardStyle: CSSProperties = {
  background: JELLY.surface,
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
  borderRadius: JELLY.radiusLg,
  border: JELLY.innerBorder,
  boxShadow: JELLY.shadowFloat,
}

/** Primary CTA — 포인트 스카이 블루 단색(그라데이션 없음), 흰 텍스트 */
export const jellyPrimaryButton: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  padding: '11px 22px',
  border: '1px solid rgba(255, 255, 255, 0.45)',
  background: '#0ea5e9',
  color: '#ffffff',
  textShadow: '0 1px 2px rgba(15, 23, 42, 0.2)',
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 20px rgba(14, 165, 233, 0.35)',
}

export const jellyPrimaryButtonDisabled: CSSProperties = {
  ...jellyPrimaryButton,
  opacity: 0.52,
  cursor: 'not-allowed',
  boxShadow: 'none',
}

export const jellyGhostButton: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  padding: '8px 16px',
  border: JELLY.innerBorderSoft,
  background: 'rgba(255,255,255,0.25)',
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
  color: JELLY.textMuted,
  fontWeight: 500,
  cursor: 'pointer',
}

export const jellyDangerButton: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  padding: '10px 18px',
  border: '1px solid rgba(252, 165, 165, 0.65)',
  background: 'linear-gradient(180deg, rgba(254, 242, 242, 0.9) 0%, rgba(254, 226, 226, 0.55) 100%)',
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
  boxShadow: '0 4px 18px rgba(239, 68, 68, 0.12)',
  color: '#991b1b',
  fontWeight: 600,
  cursor: 'pointer',
}

export const jellyInputSurface: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  border: '1px solid rgba(255, 255, 255, 0.55)',
  background: JELLY.surfaceInput,
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
  color: JELLY.text,
  boxShadow: 'inset 0 2px 10px rgba(255,255,255,0.4), 0 2px 8px rgba(15,23,42,0.04)',
}

export const jellyModalOverlay: CSSProperties = {
  background: 'rgba(30, 41, 59, 0.35)',
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
}

export const jellyModalPanel: CSSProperties = {
  ...jellyCardStyle,
  borderRadius: JELLY.radiusLg,
  boxShadow: JELLY.shadowModal,
  background: 'rgba(255, 255, 255, 0.9)',
}

export const jellyErrorBanner: CSSProperties = {
  ...jellyCardStyle,
  background: 'rgba(254, 242, 242, 0.55)',
  border: '1px solid rgba(252, 165, 165, 0.55)',
}

export const jellySuccessBanner: CSSProperties = {
  ...jellyCardStyle,
  background: 'rgba(240, 253, 244, 0.55)',
  border: '1px solid rgba(167, 243, 208, 0.6)',
}
