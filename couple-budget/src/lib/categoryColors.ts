/**
 * 공동 생활비 카테고리 색상 팔레트
 * - bg: 배경색 (연한 톤)
 * - fg: 텍스트/포인트 색상 (진한 톤)
 *
 * 사용자는 이 인덱스를 카테고리에 매핑할 수 있고,
 * 매핑이 없으면 카테고리 이름 해시로 자동 결정됨.
 */
export const CATEGORY_COLORS: { bg: string; fg: string }[] = [
  { bg: '#fee2e2', fg: '#dc2626' }, // 0: red
  { bg: '#ffedd5', fg: '#ea580c' }, // 1: orange
  { bg: '#fef3c7', fg: '#b45309' }, // 2: amber
  { bg: '#dcfce7', fg: '#16a34a' }, // 3: green
  { bg: '#d1fae5', fg: '#0d9488' }, // 4: teal
  { bg: '#cffafe', fg: '#0891b2' }, // 5: cyan
  { bg: '#dbeafe', fg: '#2563eb' }, // 6: blue
  { bg: '#e0e7ff', fg: '#4f46e5' }, // 7: indigo
  { bg: '#f3e8ff', fg: '#9333ea' }, // 8: purple
  { bg: '#fce7f3', fg: '#db2777' }, // 9: pink
  { bg: '#f5f5f4', fg: '#57534e' }, // 10: stone
]

/** 카테고리 이름으로 일관된 hash 기반 색상 인덱스 (사용자 지정이 없을 때 fallback) */
export function getCategoryColorIndexByHash(category: string | undefined): number {
  if (!category) return CATEGORY_COLORS.length - 1
  let hash = 0
  for (let i = 0; i < category.length; i++) {
    hash = (hash * 31 + category.charCodeAt(i)) >>> 0
  }
  return hash % CATEGORY_COLORS.length
}

/**
 * 카테고리 색상 해석기
 * @param category 카테고리 이름
 * @param customIndexMap store의 사용자 지정 매핑 (Record<name, index>)
 */
export function resolveCategoryColor(
  category: string | undefined,
  customIndexMap?: Record<string, number>,
): { bg: string; fg: string } {
  const cat = category ?? ''
  if (customIndexMap && cat in customIndexMap) {
    const idx = customIndexMap[cat]
    if (idx >= 0 && idx < CATEGORY_COLORS.length) {
      return CATEGORY_COLORS[idx]
    }
  }
  return CATEGORY_COLORS[getCategoryColorIndexByHash(cat)]
}
