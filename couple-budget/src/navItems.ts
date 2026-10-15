/** 내비게이션 메뉴 목록 — 앱 내비와 설정의 메뉴 표시 관리가 함께 쓴다. 설정은 항상 표시 */
export const NAV_ITEMS = [
  { to: '/', label: '대시보드', icon: '📊' },
  { to: '/assets', label: '자산', icon: '💰' },
  { to: '/expense-plan', label: '지출 계획', icon: '📋' },
  { to: '/shared-expense', label: '공동 생활비', icon: '🏠' },
  { to: '/real-estate', label: '부동산', icon: '🏡' },
  { to: '/wedding', label: '결혼식', icon: '💍' },
  { to: '/settings', label: '설정', icon: '⚙️' },
]

/** 끌 수 없는 메뉴 */
export const ALWAYS_ON_MENU = '/settings'
