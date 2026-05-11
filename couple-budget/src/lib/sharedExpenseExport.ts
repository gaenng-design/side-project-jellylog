import { useSharedExpenseStore } from '@/store/useSharedExpenseStore'
import type { SharedExpenseItem, SharedExpenseEntry } from '@/types'

/** 브라우저에서 파일 다운로드 트리거 */
function triggerDownload(filename: string, mimeType: string, content: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  document.body.removeChild(a)
  URL.revokeObjectURL(url)
}

/** CSV 셀 이스케이프 (쉼표, 줄바꿈, 따옴표 처리) */
function csvCell(v: string | number | undefined): string {
  if (v == null) return ''
  const s = String(v)
  if (/[",\n]/.test(s)) {
    return `"${s.replace(/"/g, '""')}"`
  }
  return s
}

/**
 * 공동 생활비 CSV 내보내기 (거래 단위 리스트 포맷)
 * Format: 날짜, 카테고리, 항목명, 금액, 메모
 */
export function downloadSharedExpenseCSV(year: number) {
  const { items, entries } = useSharedExpenseStore.getState()
  const itemMap = new Map(items.map((it) => [it.id, it]))

  // 해당 연도 entries만 필터링 + 날짜순 정렬
  const yearEntries = entries
    .filter((e) => e.yearMonth.startsWith(String(year)))
    .sort((a, b) => {
      if (a.yearMonth !== b.yearMonth) return a.yearMonth.localeCompare(b.yearMonth)
      return (a.day ?? 99) - (b.day ?? 99)
    })

  // CSV 헤더
  const headers = ['날짜', '카테고리', '항목명', '금액', '메모']
  const rows: string[] = [headers.join(',')]

  let total = 0
  for (const e of yearEntries) {
    const item = itemMap.get(e.itemId)
    const date = e.day != null ? `${e.yearMonth}-${String(e.day).padStart(2, '0')}` : e.yearMonth
    const cat = item?.category ?? ''
    const name = item?.name ?? ''
    rows.push([csvCell(date), csvCell(cat), csvCell(name), csvCell(e.amount), csvCell(e.memo ?? '')].join(','))
    total += e.amount
  }

  // 하단 합계 행
  rows.push('')
  rows.push(['합계', '', '', String(total), ''].join(','))

  // BOM 추가 (엑셀에서 한글 깨짐 방지)
  const csv = '﻿' + rows.join('\n')
  triggerDownload(`공동생활비_${year}년.csv`, 'text/csv;charset=utf-8', csv)
}

export function downloadSharedExpenseJSON(year?: number) {
  const { items, entries, categories } = useSharedExpenseStore.getState()
  const filteredEntries = year ? entries.filter((e) => e.yearMonth.startsWith(String(year))) : entries

  const data = {
    version: 2,
    exportedAt: new Date().toISOString(),
    year: year ?? null,
    categories,
    items,
    entries: filteredEntries,
  }

  const json = JSON.stringify(data, null, 2)
  const filename = year ? `공동생활비_${year}년.json` : `공동생활비_전체.json`
  triggerDownload(filename, 'application/json;charset=utf-8', json)
}

export async function importSharedExpenseJSON(file: File): Promise<{
  itemCount: number
  entryCount: number
}> {
  const text = await file.text()
  const data = JSON.parse(text) as {
    version?: number
    items?: SharedExpenseItem[]
    entries?: SharedExpenseEntry[]
    categories?: string[]
  }

  if (!data.items || !Array.isArray(data.items) || !data.entries || !Array.isArray(data.entries)) {
    throw new Error('유효하지 않은 공동 생활비 JSON 파일입니다.')
  }

  useSharedExpenseStore.getState().importData(data.items, data.entries, data.categories)

  return {
    itemCount: data.items.length,
    entryCount: data.entries.length,
  }
}
