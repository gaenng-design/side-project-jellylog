import type { CSSProperties } from 'react'
import { JELLY, jellyCardStyle, jellyInputSurface } from '@/styles/jellyGlass'

/** 단색 강조(아이콘·포커스 링 등). 본문은 JELLY.text 사용 */
export const PRIMARY = '#0ea5e9'
export const PRIMARY_LIGHT = 'rgba(186, 230, 253, 0.45)'
export const PRIMARY_DARK = '#0284c7'

/** 용돈 금액·합계: 양수(블루빛 그린) / 음수(붉은 톤) */
export const ALLOWANCE_POSITIVE_COLOR = '#0d9488'
export const ALLOWANCE_NEGATIVE_COLOR = '#dc2626'

export function allowanceValueColor(value: number): string {
  return value >= 0 ? ALLOWANCE_POSITIVE_COLOR : ALLOWANCE_NEGATIVE_COLOR
}
export const INPUT_HEIGHT = 40
export const INPUT_BORDER_RADIUS = 24
export const INPUT_FONT_SIZE = 14
export const INPUT_BORDER = '1px solid rgba(255, 255, 255, 0.55)'
export const AMOUNT_INPUT_MIN_WIDTH = 100

/** 지출 계획 행: 삭제 / 이번달만 제외 / 이번달 포함 동일 너비 */
export const PLAN_ROW_ACTION_MIN_WIDTH = 80

export const planRowActionButtonLayout: Pick<
  CSSProperties,
  'minWidth' | 'width' | 'maxWidth' | 'boxSizing' | 'textAlign' | 'flexShrink'
> = {
  minWidth: PLAN_ROW_ACTION_MIN_WIDTH,
  width: PLAN_ROW_ACTION_MIN_WIDTH,
  maxWidth: PLAN_ROW_ACTION_MIN_WIDTH,
  boxSizing: 'border-box',
  textAlign: 'center',
  flexShrink: 0,
}

/** 지출 계획 · 작성 삭제 (전체 삭제) 버튼 */
export const buttonWriteDeleteStyle: CSSProperties = {
  padding: '8px 16px',
  borderRadius: JELLY.radiusFull,
  border: '1px solid rgba(252, 165, 165, 0.65)',
  background: 'linear-gradient(180deg, rgba(254, 242, 242, 0.9) 0%, rgba(254, 226, 226, 0.5) 100%)',
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
  color: '#991b1b',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 4px 16px rgba(239, 68, 68, 0.1)',
}

/** 설정 > 투자·저축 템플릿 섹션과 동일한 카드 외곽 */
export const settingsSectionCardStyle: CSSProperties = {
  ...jellyCardStyle,
  padding: 16,
}

/** 설정 템플릿 행 삭제 버튼과 동일 */
export const settingsTemplateDeleteButtonStyle: CSSProperties = {
  fontSize: 11,
  padding: '8px 14px',
  borderRadius: JELLY.radiusFull,
  border: '1px solid rgba(252, 165, 165, 0.5)',
  background: 'rgba(254, 242, 242, 0.55)',
  backdropFilter: JELLY.blur,
  WebkitBackdropFilter: JELLY.blur,
  color: '#b91c1c',
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: '0 2px 10px rgba(239, 68, 68, 0.08)',
}

export const inputBaseStyle = {
  ...jellyInputSurface,
  height: INPUT_HEIGHT,
  padding: '0 14px',
  borderRadius: INPUT_BORDER_RADIUS,
  fontSize: INPUT_FONT_SIZE,
  outline: 'none',
  boxSizing: 'border-box' as const,
  maxWidth: '100%',
} as const
