import type { CSSProperties } from 'react'
import { JELLY, jellyCardStyle, jellyInputSurface } from '@/styles/jellyGlass'
import { SUB_FIXED_ACCENT, SUB_INVEST_ACCENT } from '@/styles/oklchSubColors'

/** 화면 상단 메인 제목 — 지출 계획과 동일(크기·굵기·색) */
export const pageTitleH1Style: CSSProperties = {
  margin: 0,
  fontSize: 24,
  fontWeight: 700,
  color: '#111827',
}

/** 단색 강조(아이콘·포커스 링 등). 본문은 JELLY.text 사용 */
export const PRIMARY = '#4F8CFF'
export const PRIMARY_LIGHT = '#EAF2FF'
export const PRIMARY_DARK = '#3B6FD9'

/** 용돈 금액·합계: 양수(블루빛 그린) / 음수(붉은 톤) */
export const ALLOWANCE_POSITIVE_COLOR = '#0d9488'
export const ALLOWANCE_NEGATIVE_COLOR = '#dc2626'

export function allowanceValueColor(value: number): string {
  return value >= 0 ? ALLOWANCE_POSITIVE_COLOR : ALLOWANCE_NEGATIVE_COLOR
}

/** 지출 계획 상단 요약 카드: 금액 강조색과 동일 계열의 연한 배경 */
export function expensePlanSummaryCardBackground(kind: 'income' | 'fixed' | 'invest' | 'allowance'): string {
  switch (kind) {
    case 'income':
      return `color-mix(in srgb, ${PRIMARY} 6%, white)`
    case 'fixed':
      return `color-mix(in oklch, ${SUB_FIXED_ACCENT} 7%, white)`
    case 'invest':
      return `color-mix(in oklch, ${SUB_INVEST_ACCENT} 7%, white)`
    case 'allowance':
      return `color-mix(in srgb, ${ALLOWANCE_POSITIVE_COLOR} 5%, white)`
  }
}
export const INPUT_HEIGHT = 40
/** 설정 > 고정·투자 템플릿 하단 행: 항목 추가 버튼·인풋·드롭다운 동일 높이 */
export const SETTINGS_TEMPLATE_ROW_HEIGHT = 34
export const INPUT_BORDER_RADIUS = JELLY.radiusControl
export const INPUT_FONT_SIZE = 14
export const INPUT_BORDER = '1px solid #E5E7EB'
export const AMOUNT_INPUT_MIN_WIDTH = 100

/** 카테고리명 `CustomSelect` 트리거 너비(설정·지출 계획·행 컴포넌트 통일) */
export const CATEGORY_SELECT_TRIGGER_WIDTH = 80

/** 입금일 `DaySelect` 트리거 너비(항목 행·모달·유저 설정 통일) */
export const DAY_SELECT_TRIGGER_WIDTH = 80

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
  borderRadius: JELLY.radiusControl,
  border: '1px solid rgba(252, 165, 165, 0.55)',
  background: 'rgba(254, 242, 242, 0.95)',
  color: '#991b1b',
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.08)',
}

/** 설정·정산 등 일반 카드 외곽 */
export const settingsSectionCardStyle: CSSProperties = {
  ...jellyCardStyle,
  padding: 16,
}

/** 설정 화면·지출계획 투자 카드: 상단 패딩 없음 — 타이틀 행(`stickySettingsSectionTitleWrapStyle`)이 상·하 여백·구분선 아래 간격 담당 */
export const settingsSectionCardWithBleedTitleStyle: CSSProperties = {
  ...jellyCardStyle,
  padding: '0 16px 16px',
}

const cardSurface = (jellyCardStyle.background ?? '#FFFFFF') as string

/**
 * 설정 카드 상단 제목 행 — 메인 스크롤 시 카드가 뷰에 있는 동안 상단에 고정.
 * 카드 `padding`과 맞추기 위해 좌우만 끝까지 배경을 깔음.
 * 타이틀 위·아래(구분선 직전) 패딩 동일, 구분선 아래 본문으로 `marginBottom`.
 */
const SETTINGS_SECTION_TITLE_PAD_Y = 16
const SETTINGS_SECTION_AFTER_TITLE_DIVIDER_GAP = 16

/** 카드(`jellyCardStyle`) 상단 곡률과 헤더 배경을 맞춤 — bleed 타이틀 행이 직각으로 잘리지 않게 */
const settingsSectionTitleWrapBaseStyle: CSSProperties = {
  background: cardSurface,
  marginLeft: -16,
  marginRight: -16,
  paddingLeft: 16,
  paddingRight: 16,
  paddingTop: SETTINGS_SECTION_TITLE_PAD_Y,
  paddingBottom: SETTINGS_SECTION_TITLE_PAD_Y,
  marginBottom: SETTINGS_SECTION_AFTER_TITLE_DIVIDER_GAP,
  boxSizing: 'border-box',
  boxShadow: '0 1px 0 rgba(15, 23, 42, 0.08)',
  borderTopLeftRadius: JELLY.radiusLg,
  borderTopRightRadius: JELLY.radiusLg,
}

export const stickySettingsSectionTitleWrapStyle: CSSProperties = {
  ...settingsSectionTitleWrapBaseStyle,
  position: 'sticky',
  top: 0,
  zIndex: 6,
}

/** PC(넓은 뷰) 설정: 타이틀 행을 일반 흐름으로 — sticky 없음 */
export const settingsSectionTitleWrapNonStickyStyle: CSSProperties = {
  ...settingsSectionTitleWrapBaseStyle,
  position: 'relative',
}

/** 설정 화면: 모바일만 타이틀 sticky, PC는 일반 레이아웃 */
export function settingsSectionTitleWrapForViewport(narrowViewport: boolean): CSSProperties {
  return narrowViewport ? stickySettingsSectionTitleWrapStyle : settingsSectionTitleWrapNonStickyStyle
}

const settingsTemplateGroupHeaderBaseStyle: CSSProperties = {
  background: cardSurface,
  paddingTop: 2,
  paddingBottom: 2,
}

/** 설정 > 고정·투자 템플릿: 섹션 제목(한 줄) 아래에 붙는 공금/A/B 그룹 헤더 */
export const stickySettingsTemplateGroupHeaderStyle: CSSProperties = {
  ...settingsTemplateGroupHeaderBaseStyle,
  position: 'sticky',
  top: 54,
  zIndex: 5,
}

export function settingsTemplateGroupHeaderForViewport(narrowViewport: boolean): CSSProperties {
  return narrowViewport ? stickySettingsTemplateGroupHeaderStyle : settingsTemplateGroupHeaderBaseStyle
}

/** 지출 계획 SectionCard: 이모지·제목·합계 헤더 아래 그룹 헤더 */
export const stickyPlanSectionGroupHeaderStyle: CSSProperties = {
  position: 'sticky',
  top: 62,
  zIndex: 5,
  background: cardSurface,
  paddingTop: 2,
  paddingBottom: 2,
}

/**
 * 지출 계획 > 투자 카드(settingsSectionCardWithBleedTitleStyle): 타이틀 행이 더 높을 수 있어 그룹 헤더 오프셋을 조금 크게 잡음.
 */
export const stickyPlanInvestCardGroupHeaderStyle: CSSProperties = {
  ...stickySettingsTemplateGroupHeaderStyle,
  /** 투자 카드 타이틀 행(이모지·합계·버튼)이 더 높음 */
  top: 76,
}

/** 설정 템플릿 행 삭제 버튼과 동일 */
export const settingsTemplateDeleteButtonStyle: CSSProperties = {
  fontSize: 11,
  padding: '8px 14px',
  borderRadius: JELLY.radiusControl,
  border: '1px solid rgba(252, 165, 165, 0.45)',
  background: 'rgba(254, 242, 242, 0.9)',
  color: '#b91c1c',
  cursor: 'pointer',
  flexShrink: 0,
  boxShadow: '0 2px 8px rgba(239, 68, 68, 0.06)',
}

/** 드롭다운 트리거 공통 스타일 토큰 */
export const DROPDOWN_PADDING_REGULAR = '0 12px'
export const DROPDOWN_PADDING_COMPACT = '0 8px'
export const DROPDOWN_CARET_COLOR = '#6b7280'
export const DROPDOWN_CARET_FONT_SIZE_REGULAR = 12
export const DROPDOWN_CARET_FONT_SIZE_COMPACT = 10
export const DROPDOWN_ITEM_PADDING_REGULAR = '0 14px'
export const DROPDOWN_ITEM_PADDING_COMPACT = '0 12px'

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

/** 설정 템플릿 하단 행 전용 인풋(금액 제외 시각 스타일은 `AmountInput`의 height prop과 함께 사용) */
export const settingsTemplateAddRowInputStyle: CSSProperties = {
  ...jellyInputSurface,
  height: SETTINGS_TEMPLATE_ROW_HEIGHT,
  minHeight: SETTINGS_TEMPLATE_ROW_HEIGHT,
  padding: '0 12px',
  borderRadius: INPUT_BORDER_RADIUS,
  fontSize: INPUT_FONT_SIZE,
  outline: 'none',
  boxSizing: 'border-box',
  maxWidth: '100%',
}

/** 설정 템플릿 「+ 항목 추가」 공통 버튼 골격(enabled 시 배경·색만 덮어씀) */
export const settingsTemplateAddItemButtonBase: CSSProperties = {
  fontSize: 12,
  height: SETTINGS_TEMPLATE_ROW_HEIGHT,
  minHeight: SETTINGS_TEMPLATE_ROW_HEIGHT,
  padding: '0 14px',
  borderRadius: JELLY.radiusControl,
  border: 'none',
  fontWeight: 500,
  fontFamily: 'inherit',
  boxSizing: 'border-box',
  display: 'inline-flex',
  alignItems: 'center',
  justifyContent: 'center',
  flexShrink: 0,
  cursor: 'pointer',
}
