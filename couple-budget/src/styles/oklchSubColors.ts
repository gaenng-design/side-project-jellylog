/**
 * 서브 컬러 세트: 동일 OKLCH 명도·채도, hue만 변화 (그래프·유저 칩 전용)
 * L=0.7044, C=0.1047, alpha=1
 */
export const SUB_OKLCH_L = 0.7044
export const SUB_OKLCH_C = 0.1047
export const SUB_OKLCH_ALPHA = 1 as const

/** 그래프·구분선 등에 쓰는 hue(deg) 목록 */
export const SUB_HUES = [252, 330, 175, 95, 25, 288] as const

export function subOklch(hue: number): string {
  return `oklch(${SUB_OKLCH_L} ${SUB_OKLCH_C} ${hue} / ${SUB_OKLCH_ALPHA})`
}

/** 범례·막대·유저 카드 테두리 등 순환용 */
export const SUB_CHART_COLORS = SUB_HUES.map((h) => subOklch(h))

/** 지출 계획·정산에서 고정지출 계열 강조 */
export const SUB_FIXED_ACCENT = subOklch(SUB_HUES[0])

/** 투자·저축 계열 강조 */
export const SUB_INVEST_ACCENT = subOklch(SUB_HUES[1])
