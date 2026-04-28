/**
 * 선택 연도의 지출 계획·정산 데이터를 월별 시트로 엑셀(xlsx) 다운로드
 */
import * as XLSX from 'xlsx'
import type { Income } from '@/types'
import type { FixedTemplate, InvestTemplate } from '@/types'
import { incomeRepo } from '@/data/repository'
import { useAppStore, YEAR_PICKER_MIN } from '@/store/useAppStore'
import { useFixedTemplateStore } from '@/store/useFixedTemplateStore'
import { useInvestTemplateStore } from '@/store/useInvestTemplateStore'
import { usePlanExtraStore } from '@/store/usePlanExtraStore'
import { useSettlementStore } from '@/store/useSettlementStore'
import { useAssetStore } from '@/store/useAssetStore'
import type { SettledItem } from '@/store/useSettlementStore'

type Cell = string | number | boolean | null | undefined

/** 시트 열 너비를 내용에 맞춤 (SheetJS `!cols` / wch = 대략 글자 수) */
function cellDisplayWidth(v: Cell): number {
  if (v == null || v === '') return 0
  const s = String(v)
  let w = 0
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    const wide =
      code >= 0x1100 ||
      (code >= 0x2e80 && code <= 0x9fff) ||
      (code >= 0xf900 && code <= 0xfaff) ||
      (code >= 0xff00 && code <= 0xffef)
    w += wide ? 2 : 1
  }
  return w
}

function applyColumnAutofit(ws: XLSX.WorkSheet, aoa: Cell[][]): void {
  let colCount = 0
  for (const row of aoa) {
    colCount = Math.max(colCount, row.length)
  }
  if (colCount === 0) return
  const maxW = new Array(colCount).fill(0)
  for (const row of aoa) {
    for (let c = 0; c < row.length; c++) {
      maxW[c] = Math.max(maxW[c], cellDisplayWidth(row[c]))
    }
  }
  ws['!cols'] = maxW.map((ch) => ({
    wch: Math.min(80, Math.max(5, Math.ceil(ch) + 2)),
  }))
}

function padYm(year: number, month: number): string {
  return `${year}-${String(month).padStart(2, '0')}`
}

function pushBlock(rows: Cell[][], title: string, header: string[], data: Cell[][]): void {
  rows.push([`■ ${title}`])
  rows.push(header)
  for (const r of data) rows.push(r)
  rows.push([])
}

function effectiveFixedTemplates(ym: string): FixedTemplate[] {
  const plan = usePlanExtraStore.getState().templateSnapshotsByMonth[ym]
  if (plan?.fixed?.length) return plan.fixed
  return useFixedTemplateStore.getState().getSortedTemplates()
}

function effectiveInvestTemplates(ym: string): InvestTemplate[] {
  const plan = usePlanExtraStore.getState().templateSnapshotsByMonth[ym]
  if (plan?.invest?.length) return plan.invest
  return useInvestTemplateStore.getState().getSortedTemplates()
}

function buildIncomeRows(ym: string, allIncomes: Income[]): Cell[][] {
  const settings = useAppStore.getState().settings
  const inYm = allIncomes.filter((i) => i.yearMonth === ym)
  const da = inYm.find((i) => i.person === 'A' && i.category === '급여')
  const db = inYm.find((i) => i.person === 'B' && i.category === '급여')
  const extras = inYm.filter(
    (i) => !(i.person === 'A' && i.category === '급여') && !(i.person === 'B' && i.category === '급여'),
  )
  const defEx = usePlanExtraStore.getState().defaultSalaryExcludedByMonth[ym] ?? {}
  const rows: Cell[][] = []
  const aExcluded = !!defEx.A
  const bExcluded = !!defEx.B
  const aAmt = aExcluded ? 0 : da?.amount ?? settings.personAIncome ?? 0
  const bAmt = bExcluded ? 0 : db?.amount ?? settings.personBIncome ?? 0
  rows.push([
    'A',
    '급여',
    settings.personAName || '유저 1',
    aAmt,
    da?.id ?? '(설정 기본)',
    aExcluded ? '기본급여 합계에서 제외' : '',
  ])
  rows.push([
    'B',
    '급여',
    settings.personBName || '유저 2',
    bAmt,
    db?.id ?? '(설정 기본)',
    bExcluded ? '기본급여 합계에서 제외' : '',
  ])
  for (const i of extras) {
    rows.push([i.person, i.category, i.description ?? '', i.amount, i.id, ''])
  }
  return rows
}

/** 해당 연·월에 로컬에 쌓인 계획/정산 흔적이 있을 때만 월 시트 생성 */
function monthHasExportableData(ym: string, allIncomes: Income[]): boolean {
  const app = useAppStore.getState()
  if (app.startedMonths.includes(ym)) return true
  if (app.settledMonths.includes(ym)) return true
  if (useSettlementStore.getState().getSettlement(ym)) return true
  if (allIncomes.some((i) => i.yearMonth === ym)) return true

  const plan = usePlanExtraStore.getState()
  const pack = plan.extraRowsByMonth[ym]
  if ((pack?.fixed?.length ?? 0) > 0 || (pack?.invest?.length ?? 0) > 0) return true
  if ((plan.separateExpenseRowsByMonth[ym]?.length ?? 0) > 0) return true
  if (plan.templateSnapshotsByMonth[ym] != null) return true
  const defSal = plan.defaultSalaryExcludedByMonth[ym]
  if (defSal && (defSal.A || defSal.B)) return true

  const fixedS = useFixedTemplateStore.getState()
  for (const k of Object.keys(fixedS.monthlyAmounts)) {
    if (k.endsWith(`::${ym}`)) return true
  }
  if (fixedS.exclusions.some((e) => e.yearMonth === ym)) return true
  for (const k of Object.keys(fixedS.monthlySeparations)) {
    if (k.endsWith(`::${ym}`)) return true
  }

  const invS = useInvestTemplateStore.getState()
  for (const k of Object.keys(invS.monthlyAmounts)) {
    if (k.endsWith(`::${ym}`)) return true
  }
  if (invS.exclusions.some((e) => e.yearMonth === ym)) return true

  const settleTransfers = useSettlementStore.getState().transfers
  const prefix = `${ym}::`
  if (Object.keys(settleTransfers).some((k) => k.startsWith(prefix))) return true

  return false
}

function buildMonthSheet(
  year: number,
  month: number,
  allIncomes: Income[],
): Cell[][] {
  const ym = padYm(year, month)
  const app = useAppStore.getState()
  const fixedS = useFixedTemplateStore.getState()
  const investS = useInvestTemplateStore.getState()
  const planS = usePlanExtraStore.getState()
  const settleS = useSettlementStore.getState()

  const started = app.startedMonths.includes(ym)
  const settled = app.settledMonths.includes(ym)
  const settlement = settleS.getSettlement(ym)

  const out: Cell[][] = []
  out.push([`Jelly log · ${year}년 ${month}월`, ym])
  out.push(['지출계획 시작', started ? '예' : '아니오'])
  out.push(['정산 완료', settled ? '예' : '아니오'])
  out.push([])

  const incomeRows = buildIncomeRows(ym, allIncomes)
  pushBlock(out, '수입', ['구분', '카테고리', '항목', '금액(원)', 'id', '비고'], incomeRows)

  const fixedTpl = effectiveFixedTemplates(ym)
  const fixedTplData: Cell[][] = fixedTpl.map((tpl) => {
    const excluded = fixedS.isExcluded(tpl.id, ym)
    const isSep = fixedS.isSeparated(tpl.id, ym)
    const sepPerson =
      tpl.person === '공금' && isSep ? (tpl.defaultSeparatePerson ?? 'A') : tpl.person === 'A' || tpl.person === 'B' ? tpl.person : ''
    const amt = fixedS.getMonthlyAmount(tpl.id, ym) ?? tpl.defaultAmount
    return [
      tpl.person,
      tpl.category,
      tpl.description,
      amt,
      tpl.payDay ?? '',
      excluded ? '이번달 제외' : '',
      isSep ? '별도정산' : '',
      isSep ? sepPerson : '',
      tpl.id,
    ]
  })
  pushBlock(
    out,
    '고정지출(템플릿)',
    ['구분', '카테고리', '항목', '금액(원)', '입금일', '제외', '별도정산', '별도담당', '템플릿id'],
    fixedTplData,
  )

  const fixedExtra = planS.extraRowsByMonth[ym]?.fixed ?? []
  pushBlock(
    out,
    '고정지출(월 추가)',
    ['구분', '카테고리', '항목', '금액(원)', '별도정산', '별도담당', 'id'],
    fixedExtra.map((r) => [
      r.person,
      r.category,
      r.description,
      r.amount,
      r.isSeparate ? '예' : '아니오',
      r.separatePerson ?? '',
      r.id,
    ]),
  )

  const separateRows = planS.separateExpenseRowsByMonth[ym] ?? []
  pushBlock(
    out,
    '별도 지출',
    ['카테고리', '항목', '금액(원)', '별도정산', '별도담당', 'id'],
    separateRows.map((r) => [
      r.category,
      r.description,
      r.amount,
      r.isSeparate ? '예' : '아니오',
      r.separatePerson ?? '',
      r.id,
    ]),
  )

  const invTpl = effectiveInvestTemplates(ym)
  const invTplData: Cell[][] = invTpl.map((tpl) => {
    const excluded = investS.isExcluded(tpl.id, ym)
    const amt = investS.getMonthlyAmount(tpl.id, ym) ?? tpl.defaultAmount
    return [tpl.person, tpl.category, tpl.description, amt, tpl.maturityDate ?? '', excluded ? '이번달 제외' : '', tpl.id]
  })
  pushBlock(out, '투자·저축(템플릿)', ['구분', '카테고리', '항목', '금액(원)', '만기일', '제외', '템플릿id'], invTplData)

  const invExtra = planS.extraRowsByMonth[ym]?.invest ?? []
  pushBlock(
    out,
    '투자·저축(월 추가)',
    ['구분', '카테고리', '항목', '금액(원)', 'id'],
    invExtra.map((r) => [r.person, r.category, r.description, r.amount, r.id]),
  )

  out.push(['■ 정산 스냅샷'])
  if (!settlement) {
    out.push(['(정산 완료 기록 없음)'])
  } else {
    out.push(['정산일시', settlement.settledAt])
    const pushItems = (label: string, items: SettledItem[]) => {
      out.push([label])
      out.push(['구분', '카테고리', '항목', '금액(원)', '템플릿'])
      for (const it of items) {
        out.push([
          it.person,
          it.category,
          it.description,
          it.amount,
          it.isTemplate ? (it.templateId ?? '') : '아니오',
        ])
      }
      out.push([])
    }
    pushItems('수입(정산 시점)', settlement.incomes)
    pushItems('고정지출(정산 시점)', settlement.fixedExpenses)
    pushItems('투자·저축(정산 시점)', settlement.investments)
    pushItems('별도 항목(정산 시점)', settlement.separateItems)
  }
  out.push([])

  out.push(['■ 송금 체크(정산 UI)'])
  const prefix = `${ym}::`
  const transfers = settleS.transfers
  const tkeys = Object.keys(transfers).filter((k) => k.startsWith(prefix))
  if (tkeys.length === 0) out.push(['(없음)'])
  else {
    out.push(['항목id', '송금완료체크'])
    for (const k of tkeys.sort()) {
      out.push([k.slice(prefix.length), transfers[k] ? '예' : '아니오'])
    }
  }

  return out
}

function buildSettingsSheet(year: number): Cell[][] {
  const s = useAppStore.getState().settings
  const app = useAppStore.getState()
  const rows: Cell[][] = [
    ['Jelly log 연도보내기', year],
    [],
    ['항목', '값'],
    ['유저1 이름', s.personAName],
    ['유저2 이름', s.personBName],
    ['유저1 기본 월수입(설정)', s.personAIncome],
    ['유저2 기본 월수입(설정)', s.personBIncome],
    ['유저1 입금일', s.personAIncomeDay],
    ['유저2 입금일', s.personBIncomeDay],
    ['통화', s.currency],
    ['월 공동 생활비(원)', s.sharedLivingCost],
    ['공동생활비 분담 모드', s.sharedLivingCostRatioMode],
    ['공동생활비 비율(사용자설정)', `${s.sharedLivingCostRatio?.[0] ?? 50}:${s.sharedLivingCostRatio?.[1] ?? 50}`],
    ['유저1 색', s.user1Color],
    ['유저2 색', s.user2Color],
    ['공금 색', s.sharedColor],
    [],
    ['이 연도 지출계획 시작 월', app.startedMonths.filter((m) => m.startsWith(`${year}-`)).join(', ') || '(없음)'],
    ['이 연도 정산 완료 월', app.settledMonths.filter((m) => m.startsWith(`${year}-`)).join(', ') || '(없음)'],
  ]
  return rows
}

function safeSheetName(name: string): string {
  const cleaned = name.replace(/[:\\/?*[\]]/g, '-').slice(0, 31)
  return cleaned || 'Sheet'
}

/**
 * GitHub 데이터를 JSON 시트로 추가
 */
function addGitHubDataSheets(wb: XLSX.WorkBook): void {
  const assetStore = useAssetStore.getState()
  const fixedStore = useFixedTemplateStore.getState()
  const investStore = useInvestTemplateStore.getState()
  const settlementStore = useSettlementStore.getState()
  const appStore = useAppStore.getState()

  // Assets 시트
  const assetsData = JSON.stringify({ items: assetStore.items, entries: assetStore.entries }, null, 2)
  const assetsAoA = [['자산 (JSON)'], [assetsData]]
  const wsAssets = XLSX.utils.aoa_to_sheet(assetsAoA)
  wsAssets['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsAssets, '자산')

  // Expenses 시트
  const expensesData = JSON.stringify({
    fixedTemplates: fixedStore.templates,
    investTemplates: investStore.templates,
  }, null, 2)
  const expensesAoA = [['지출 (JSON)'], [expensesData]]
  const wsExpenses = XLSX.utils.aoa_to_sheet(expensesAoA)
  wsExpenses['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsExpenses, '지출')

  // Settlements 시트
  const settlementsData = JSON.stringify({
    settlements: settlementStore.settlements,
    transfers: settlementStore.transfers,
  }, null, 2)
  const settlementsAoA = [['정산 (JSON)'], [settlementsData]]
  const wsSettlements = XLSX.utils.aoa_to_sheet(settlementsAoA)
  wsSettlements['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsSettlements, '정산')

  // Metadata 시트
  const metadataData = JSON.stringify(appStore.settings, null, 2)
  const metadataAoA = [['메타데이터 (JSON)'], [metadataData]]
  const wsMetadata = XLSX.utils.aoa_to_sheet(metadataAoA)
  wsMetadata['!cols'] = [{ wch: 80 }]
  XLSX.utils.book_append_sheet(wb, wsMetadata, '메타데이터')
}

/**
 * @param year 예: 2026
 */
export async function downloadYearBudgetExcel(year: number): Promise<void> {
  if (!Number.isFinite(year) || year < YEAR_PICKER_MIN) {
    throw new Error(`연도는 ${YEAR_PICKER_MIN} 이상으로 선택해 주세요.`)
  }

  const allIncomes = await incomeRepo.query(() => true)
  const wb = XLSX.utils.book_new()

  const settingsAoA = buildSettingsSheet(year)
  const ws0 = XLSX.utils.aoa_to_sheet(settingsAoA)
  applyColumnAutofit(ws0, settingsAoA)
  XLSX.utils.book_append_sheet(wb, ws0, safeSheetName('00_공통설정'))

  for (let m = 1; m <= 12; m++) {
    const ym = padYm(year, m)
    if (!monthHasExportableData(ym, allIncomes)) continue
    const data = buildMonthSheet(year, m, allIncomes)
    const ws = XLSX.utils.aoa_to_sheet(data)
    applyColumnAutofit(ws, data)
    XLSX.utils.book_append_sheet(wb, ws, safeSheetName(`${m}월`))
  }

  // GitHub 데이터 시트 추가
  addGitHubDataSheets(wb)

  const fileName = `jellylog_${year}.xlsx`
  XLSX.writeFile(wb, fileName)
}
