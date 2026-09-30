import type { CSSProperties } from 'react'
import { DS } from '@/design-system/tokens'

/**
 * 앱 전역 스타일 프리셋 — 값은 모두 design-system/tokens.ts 에서 파생된다.
 * 기존 export 이름 유지 → 화면 코드를 바꾸지 않고 토큰만으로 일괄 조정 가능
 */

const BG = DS.color.bg.primary
const CARD = DS.color.bg.secondary
const TEXT = DS.color.text.primary
const TEXT_MUTED = DS.color.text.secondary
const PRIMARY_BTN = DS.color.primary
const PRIMARY_SOFT = DS.color.primarySoft

export const JELLY = {
  text: TEXT,
  textMuted: TEXT_MUTED,
  primary: PRIMARY_SOFT,
  surface: CARD,
  surfaceInput: DS.color.bg.tertiary,
  innerBorder: '1px solid rgba(0,0,0,0.06)',
  innerBorderSoft: '1px solid rgba(0,0,0,0.04)',
  /** 레거시 코드 호환: 블러 없음 */
  blur: 'blur(0px)',
  shadowFloat: DS.shadow[2],
  shadowModal: '0 16px 48px rgba(0, 0, 0, 0.1)',
  radiusControl: DS.radius.control,
  radiusUserChip: DS.radius.chip,
  radiusFull: DS.radius.chip,
  radiusLg: DS.radius.card,
  radiusMd: DS.radius.card,
} as const

export const jellyFontStack = DS.font.family

export const jellyShellBackground: CSSProperties = {
  background: BG,
}

/** 앱 외곽 nav 전용이 아닌 레거시 참조용 — 다크 사이드바는 App.tsx에서 별도 정의 */
export const jellySidebarShell: CSSProperties = {
  background: DS.color.sidebar.bg,
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
  fontSize: DS.font.size.body,
  fontFamily: 'inherit',
  borderRadius: JELLY.radiusControl,
  padding: '11px 22px',
  border: 'none',
  background: PRIMARY_BTN,
  color: DS.color.text.inverse,
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
  fontSize: DS.font.size.body,
  fontFamily: 'inherit',
  borderRadius: JELLY.radiusControl,
  padding: '8px 16px',
  border: JELLY.innerBorderSoft,
  background: DS.color.bg.tertiary,
  color: TEXT_MUTED,
  fontWeight: 500,
  cursor: 'pointer',
}

export const jellyDangerButton: CSSProperties = {
  fontSize: DS.font.size.body,
  fontFamily: 'inherit',
  borderRadius: JELLY.radiusControl,
  padding: '10px 18px',
  border: '1px solid rgba(239, 68, 68, 0.35)',
  background: 'rgba(254, 242, 242, 0.95)',
  color: DS.color.negative.strong,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
}

export const jellyInputSurface: CSSProperties = {
  borderRadius: JELLY.radiusControl,
  border: JELLY.innerBorderSoft,
  background: DS.color.bg.secondary,
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
