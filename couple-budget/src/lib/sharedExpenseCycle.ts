/**
 * 공동 생활비 정산 사이클 헬퍼.
 *
 * 한 사이클의 "라벨(key)"은 사이클이 **끝나는** 달(yearMonth) 기준이다.
 * (탭 이름과 일치하도록 — 사용자가 6/25~7/24 사이클을 "7월"에서 입력한다는 멘탈모델)
 *
 * 예: startDay=25 일 때
 *   - 사이클 "2026-07" → 2026/6/25 ~ 2026/7/24
 *   - 사이클 "2026-08" → 2026/7/25 ~ 2026/8/24
 *   - startDay=1 인 경우 → "YYYY-MM" 는 그 달 1일 ~ 말일 (일반 달력 모드)
 *
 * 데이터 entry는 `entry.yearMonth = cycle key`, `entry.day = 실제 날짜(1~31)`로 저장한다.
 * - day가 startDay 미만이면 그 사이클의 종료 월(= cycle key 의 month)에 속함
 * - day가 startDay 이상이면 그 사이클의 종료 월의 직전 달에 속함
 */

export interface SharedExpenseCycle {
  /** 사이클을 식별하는 key. 사이클이 끝나는 yearMonth (예: "2026-07") */
  key: string
  startDate: Date
  endDate: Date
  /** 라벨용 시작/종료 표기 (예: "6/25", "7/24") */
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
 * cycle key(종료 월) + startDay → 실제 시작/종료 날짜 계산.
 * 시작: 직전 달 startDay, 종료: 이번 달 startDay - 1.
 * startDay <= 1 이면 한 달 그대로(1일 ~ 말일).
 */
export function getCycleRange(cycleKey: string, startDay: number): SharedExpenseCycle {
  const [yearStr, monthStr] = cycleKey.split('-')
  const year = parseInt(yearStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1

  if (startDay <= 1) {
    const startDate = new Date(year, monthIdx, 1)
    const endDate = new Date(year, monthIdx, lastDayOfMonth(year, monthIdx))
    return {
      key: cycleKey,
      startDate,
      endDate,
      startLabel: `${monthIdx + 1}/1`,
      endLabel: `${monthIdx + 1}/${endDate.getDate()}`,
    }
  }

  // 시작: 직전 달 startDay (해당 달 마지막 날을 초과하면 클램프)
  const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1
  const prevYear = monthIdx === 0 ? year - 1 : year
  const startDayClamped = Math.min(startDay, lastDayOfMonth(prevYear, prevMonthIdx))
  const startDate = new Date(prevYear, prevMonthIdx, startDayClamped)

  // 종료: 이번 달 (startDay - 1) (해당 달 마지막 날을 초과하면 클램프)
  const endDay = Math.min(startDay - 1, lastDayOfMonth(year, monthIdx))
  const endDate = new Date(year, monthIdx, endDay)

  return {
    key: cycleKey,
    startDate,
    endDate,
    startLabel: `${prevMonthIdx + 1}/${startDayClamped}`,
    endLabel: `${monthIdx + 1}/${endDay}`,
  }
}

/**
 * 실제 날짜(year, monthIdx, day)가 어느 사이클(cycle key, 종료 월)에 속하는지 판별.
 * - day < startDay → 그 달이 종료 월 → cycle key = 그 달
 * - day >= startDay → 다음 달이 종료 월 → cycle key = 다음 달
 */
export function getCycleKeyForDate(year: number, monthIdx: number, day: number, startDay: number): string {
  if (startDay <= 1) {
    return `${year}-${pad2(monthIdx + 1)}`
  }
  if (day < startDay) {
    return `${year}-${pad2(monthIdx + 1)}`
  }
  // 다음 달이 종료 월
  const nextMonthIdx = monthIdx === 11 ? 0 : monthIdx + 1
  const nextYear = monthIdx === 11 ? year + 1 : year
  return `${nextYear}-${pad2(nextMonthIdx + 1)}`
}

/**
 * entry의 day가 cycle key 안에 들어있다고 가정하고, 표시할 (year, monthIdx, day)를 반환.
 * - day < startDay → cycle key 달이 그대로 표시 월
 * - day >= startDay → cycle key 달의 직전 달이 표시 월
 */
export function getEntryDisplayDate(
  cycleKey: string,
  entryDay: number,
  startDay: number,
): { year: number; monthIdx: number; day: number } {
  const [yearStr, monthStr] = cycleKey.split('-')
  const year = parseInt(yearStr, 10)
  const monthIdx = parseInt(monthStr, 10) - 1
  if (startDay <= 1 || entryDay < startDay) {
    return { year, monthIdx, day: entryDay }
  }
  // 직전 달
  const prevMonthIdx = monthIdx === 0 ? 11 : monthIdx - 1
  const prevYear = monthIdx === 0 ? year - 1 : year
  return { year: prevYear, monthIdx: prevMonthIdx, day: entryDay }
}
