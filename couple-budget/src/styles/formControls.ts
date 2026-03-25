import type { CSSProperties } from 'react'

export const PRIMARY = '#2563eb'
export const PRIMARY_LIGHT = '#eff6ff'
export const PRIMARY_DARK = '#1d4ed8'

/** 용돈 금액·합계: 양수(블루빛 그린) / 음수(붉은 톤) */
export const ALLOWANCE_POSITIVE_COLOR = '#0d9488'
export const ALLOWANCE_NEGATIVE_COLOR = '#dc2626'

export function allowanceValueColor(value: number): string {
  return value >= 0 ? ALLOWANCE_POSITIVE_COLOR : ALLOWANCE_NEGATIVE_COLOR
}
export const INPUT_HEIGHT = 40
export const INPUT_BORDER_RADIUS = 10
export const INPUT_FONT_SIZE = 14
export const INPUT_BORDER = '1px solid #e5e7eb'
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
  padding: '8px 14px',
  borderRadius: 8,
  border: '1px solid #dc2626',
  background: '#fff',
  color: '#dc2626',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
}

/** 설정 > 투자·저축 템플릿 섹션과 동일한 카드 외곽 */
export const settingsSectionCardStyle: CSSProperties = {
  padding: 16,
  background: '#fff',
  borderRadius: 14,
  boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
}

/** 설정 템플릿 행 삭제 버튼과 동일 */
export const settingsTemplateDeleteButtonStyle: CSSProperties = {
  fontSize: 11,
  padding: '6px 10px',
  borderRadius: 8,
  border: '1px solid #fecaca',
  background: '#fef2f2',
  color: '#b91c1c',
  cursor: 'pointer',
  flexShrink: 0,
}

export const inputBaseStyle = {
  height: INPUT_HEIGHT,
  padding: '0 12px',
  borderRadius: INPUT_BORDER_RADIUS,
  border: INPUT_BORDER,
  fontSize: INPUT_FONT_SIZE,
  outline: 'none',
  boxSizing: 'border-box' as const,
  maxWidth: '100%',
} as const
