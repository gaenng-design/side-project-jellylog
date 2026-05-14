/**
 * 공동 생활비 정산 사이클 헬퍼.
 *
 * 한 사이클의 "라벨"은 시작일이 속한 달(yearMonth)을 기준으로 한다.
 * 예: startDay=25 일 때
 *   - 사이클 "2026-05" → 2026/5/25 ~ 2026/6/24
 *   - 사이클 "2026-06" → 2026/6/25 ~ 2026/7/24
 *
 * 데이터 entry는 `entry.yearMonth = cycle key`, `entry.day = 실제 날짜(1~31)`로 저장한다.
 * - day가 startDay 이상이면 그 사이클의 시작 월에 속함.
 * - day가 startDay 미만이면 그 사이클의 시작 월 다음 달에 속함.
 */

export interface SharedExpenseCycle {
  /** 사이클을 식별하는 key. 시작일이 속한 yearMonth (예: "2026-05") */
  key: string
  startDate: Date
  endDate: Date
  /** 라벨용 시작/종료 표기 (예: "5/25", "6/24") */
  startLabel: string
  endLabel: string
}

function pad2(n: number) {
  return String(n).padStart(2, '0')
}

function lastDayOfMonth(year: number, monthIdx: number): number {
  // monthIdx: 0-based. Date(year, monthIdx+1, 0)이 해당 월의 마지막 날
  return new Date(year, monthIdx + 1, 0).getDate()
}

/**
 * cycle key(yearMonth) + startDay → 실제 시작/종료 날짜 계산.
 * startDay가 해당 월의 마지막 날을 초과하면 마지막 날로 클램프 (예: 2월 31일 → 28/29일).
 */
export function getCycleRange(cycleKey: string, startDay: number): SharedExpenseCycle {
  const [yearStr, monthStr] = cycleKey.split('-')
  const year = parseInt(yearStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1
  const start = Math.min(startDay, lastDayOfMonth(year, monthIdx))
  const startDate = new Date(year, monthIdx, start)

  // 종료일: 다음 달의 (startDay - 1)일
  const nextMonthIdx = monthIdx === 11 ? 0 : monthIdx + 1
  const nextYear = monthIdx === 11 ? year + 1 : year
  const endDayCandidate = start - 1 // startDay - 1
  // startDay=1이면 endDay=0이라 한 달 그대로. 일반 달력 모드.
  if (endDayCandidate <= 0) {
    // 한 달 전체 (예: startDay=1)
    const endDate = new Date(year, monthIdx, lastDayOfMonth(year, monthIdx))
    return {
      key: cycleKey,
      startDate,
      endDate,
      startLabel: `${monthIdx + 1}/${start}`,
      endLabel: `${monthIdx + 1}/${endDate.getDate()}`,
    }
  }
  const endDay = Math.min(endDayCandidate, lastDayOfMonth(nextYear, nextMonthIdx))
  const endDate = new Date(nextYear, nextMonthIdx, endDay)
  return {
    key: cycleKey,
    startDate,
    endDate,
    startLabel: `${monthIdx + 1}/${start}`,
    endLabel: `${nextMonthIdx + 1}/${endDay}`,
  }
}

/**
 * 실제 날짜(year, monthIdx, day)가 어느 사이클(cycle key)에 속하는지 판별.
 * - day >= startDay → 그 달이 cycle key
 * - day < startDay → 이전 달이 cycle key
 */
export function getCycleKeyForDate(year: number, monthIdx: number, day: number, startDay: number): string {
  if (startDay <= 1) {
    return `${year}-${pad2(monthIdx + 1)}`
  }
  if (day >= startDay) {
    return `${year}-${pad2(monthIdx + 1)}`
  }
  // 이전 달 사이클
  const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1
  const prevYear = monthIdx === 0 ? year - 1 : year
  return `${prevYear}-${pad2(prevMonthIdx + 1)}`
}

/**
 * entry의 day가 cycle key 안에 들어있다고 가정하고, 표시할 (month, day)를 반환.
 * - day >= startDay → cycle key의 시작 월/day
 * - day < startDay → cycle key의 다음 달/day
 */
export function getEntryDisplayDate(
  cycleKey: string,
  entryDay: number,
  startDay: number,
): { year: number; monthIdx: number; day: number } {
  const [yearStr, monthStr] = cycleKey.split('-')
  const year = parseInt(yearStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1
  if (startDay <= 1 || entryDay >= startDay) {
    return { year, monthIdx, day: entryDay }
  }
  const nextMonthIdx = monthIdx === 11 ? 0 : monthIdx + 1
  const nextYear = monthIdx === 11 ? year + 1 : year
  return { year: nextYear, monthIdx: nextMonthIdx, day: entryDay }
}
