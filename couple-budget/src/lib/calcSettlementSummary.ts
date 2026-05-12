/** 정산 결과 유저별 투자·저축 항목(연금, 비상금 등) 표시용 */
export type SettlementInvestLineItem = { label: string; amount: number }

export interface AppSettings {
  sharedLivingCost?: number
  sharedLivingCostRatioMode?: '50:50' | 'custom' | 'income'
  sharedLivingCostRatio?: [number, number]
}

export interface SettlementInputs {
  totalIncome: number
  incomeByPerson: { A: number; B: number }
  totalFixed: number
  fixedDepositByUser: { A: number; B: number }
  totalInvest: number
  investByPerson: { A: number; B: number }
  /** 유저별 투자/저축 금액 (표시용; 합은 investByPerson과 일치) */
  investByCategoryByPerson: { A: { 투자: number; 저축: number }; B: { 투자: number; 저축: number } }
  /** 유저별 투자·저축 항목 목록 (표시용) */
  investLinesByCategoryByPerson: {
    A: { 투자: SettlementInvestLineItem[]; 저축: SettlementInvestLineItem[] }
    B: { 투자: SettlementInvestLineItem[]; 저축: SettlementInvestLineItem[] }
  }
  separateByUser?: { A: number; B: number }
  /** 용돈 차감: 고정지출 카드 합(÷2). 미주입 시 totalFixed로 간주 */
  fixedRegularTotal?: number
  /** 용돈 차감: 별도 지출 카드 합(÷2). 미주입 시 0 */
  fixedSeparateTotal?: number
  /** 고정지출 카드 안에서 「별도 정산」 표시된 항목의 유저별 합 */
  fixedTemplateSeparateByUser?: { A: number; B: number }
  /** 고정지출 카드 전체 합(별도 정산 포함). 미주입 시 fixedRegularTotal로 간주 */
  fixedTotalIncludingSeparate?: number
  /** 별도 지출 카드 50:50 송금 안내(미주입 시 null) */
  separateExpenseCard5090?: {
    total: number
    paidA: number
    paidB: number
    fairShareEach: number
    transferAmount: number
    transferFrom: 'A' | 'B' | null
    transferTo: 'A' | 'B' | null
  } | null
}

export function getSharedLivingByPerson(
  sharedLivingCost: number,
  settings: AppSettings,
  incomeByPerson: { A: number; B: number },
): { A: number; B: number } {
  const mode = settings.sharedLivingCostRatioMode ?? '50:50'
  if (sharedLivingCost <= 0) return { A: 0, B: 0 }
  if (mode === '50:50') {
    const half = Math.round(sharedLivingCost / 2)
    return { A: half, B: sharedLivingCost - half }
  }
  if (mode === 'income') {
    const totalIncome = incomeByPerson.A + incomeByPerson.B
    if (totalIncome <= 0)
      return {
        A: Math.round(sharedLivingCost / 2),
        B: sharedLivingCost - Math.round(sharedLivingCost / 2),
      }
    const ratioA = incomeByPerson.A / totalIncome
    return {
      A: Math.round(sharedLivingCost * ratioA),
      B: sharedLivingCost - Math.round(sharedLivingCost * ratioA),
    }
  }
  const [ratioA, ratioB] = settings.sharedLivingCostRatio ?? [50, 50]
  const totalRatio = ratioA + ratioB || 1
  const pctA = ratioA / totalRatio
  return {
    A: Math.round(sharedLivingCost * pctA),
    B: sharedLivingCost - Math.round(sharedLivingCost * pctA),
  }
}

export interface SettlementSummary {
  totalIncome: number
  totalFixed: number
  sharedLivingCost: number
  sharedLivingCostPerPerson: number
  sharedLivingByPerson: { A: number; B: number }
  totalInvest: number
  investByPerson: { A: number; B: number }
  allowanceByPerson: { A: number; B: number }
  fixedDepositByUser: { A: number; B: number }
  /** 고정지출 통장 입금액 내역 */
  fixedDepositBreakdown: {
    /** 통장 입금 기준 합계 (별도 정산 표시된 항목 제외) */
    totalFixed: number
    /** 1인당 입금액 = totalFixed ÷ 2 (반올림) */
    halfEach: number
    /** [구버전 호환] 별도·개별 부담 합 */
    separateByUser: { A: number; B: number }
    /** 고정지출 전체 합 (별도 정산 표시된 항목 포함) */
    totalIncludingSeparate: number
    /** 「별도 정산」 표시된 고정지출 항목의 유저별 합 */
    templateSeparateByUser: { A: number; B: number }
  }
  /** 별도 지출 카드 50:50 송금 안내 */
  separateExpenseCard5090: NonNullable<SettlementInputs['separateExpenseCard5090']> | null
  userSummary: {
    A: {
      fixedDeposit: number
      sharedLiving: number
      invest: number
      investDetail: { 투자: number; 저축: number }
      investLineItems: { 투자: SettlementInvestLineItem[]; 저축: SettlementInvestLineItem[] }
      allowance: number
      /** 공동 통장 고정 몫 + 공동 생활비 + 별도·개별 부담 + 투자·저축(용돈 제외) */
      total: number
    }
    B: {
      fixedDeposit: number
      sharedLiving: number
      invest: number
      investDetail: { 투자: number; 저축: number }
      investLineItems: { 투자: SettlementInvestLineItem[]; 저축: SettlementInvestLineItem[] }
      allowance: number
      /** 공동 통장 고정 몫 + 공동 생활비 + 별도·개별 부담 + 투자·저축(용돈 제외) */
      total: number
    }
  }
  chartData: { label: string; amount: number; pct: number }[]
}

export function calcSettlementSummary(
  inputs: SettlementInputs,
  settings: AppSettings,
): SettlementSummary {
  const {
    totalIncome,
    incomeByPerson,
    totalFixed,
    fixedDepositByUser,
    totalInvest,
    investByPerson,
    investByCategoryByPerson,
    investLinesByCategoryByPerson,
  } = inputs
  const separateByUser = inputs.separateByUser ?? { A: 0, B: 0 }
  const sharedLivingCost = settings.sharedLivingCost ?? 0
  const sharedLivingByPerson = getSharedLivingByPerson(sharedLivingCost, settings, incomeByPerson)
  const sharedLivingCostPerPerson = Math.round((sharedLivingByPerson.A + sharedLivingByPerson.B) / 2)
  const fixedRegularTotal = inputs.fixedRegularTotal ?? inputs.totalFixed
  // 고정지출 통장 기준: 별도지출 제외한 순수 고정지출만의 절반
  const halfEach = Math.round(fixedRegularTotal / 2)
  const fixedSeparateTotal = inputs.fixedSeparateTotal ?? 0
  const allowanceFixedPerPerson = Math.round(fixedRegularTotal / 2) + Math.round(fixedSeparateTotal / 2)
  const allowanceA = incomeByPerson.A - allowanceFixedPerPerson - sharedLivingByPerson.A - investByPerson.A
  const allowanceB = incomeByPerson.B - allowanceFixedPerPerson - sharedLivingByPerson.B - investByPerson.B
  const userSummary = {
    A: {
      fixedDeposit: fixedDepositByUser.A,
      sharedLiving: sharedLivingByPerson.A,
      invest: investByPerson.A,
      investDetail: investByCategoryByPerson.A,
      investLineItems: investLinesByCategoryByPerson.A,
      allowance: allowanceA,
      total:
        fixedDepositByUser.A +
        sharedLivingByPerson.A +
        separateByUser.A +
        investByPerson.A,
    },
    B: {
      fixedDeposit: fixedDepositByUser.B,
      sharedLiving: sharedLivingByPerson.B,
      invest: investByPerson.B,
      investDetail: investByCategoryByPerson.B,
      investLineItems: investLinesByCategoryByPerson.B,
      allowance: allowanceB,
      total:
        fixedDepositByUser.B +
        sharedLivingByPerson.B +
        separateByUser.B +
        investByPerson.B,
    },
  }
  const totalAllowance = allowanceA + allowanceB
  const chartData: { label: string; amount: number; pct: number }[] = []
  if (totalIncome > 0) {
    chartData.push({ label: '고정지출', amount: fixedRegularTotal, pct: (fixedRegularTotal / totalIncome) * 100 })
    chartData.push({ label: '별도지출', amount: fixedSeparateTotal, pct: (fixedSeparateTotal / totalIncome) * 100 })
    chartData.push({
      label: '공동생활비',
      amount: sharedLivingCost,
      pct: (sharedLivingCost / totalIncome) * 100,
    })
    chartData.push({ label: '투자·저축', amount: totalInvest, pct: (totalInvest / totalIncome) * 100 })
    chartData.push({ label: '용돈', amount: totalAllowance, pct: (totalAllowance / totalIncome) * 100 })
  }
  const templateSeparateByUser = inputs.fixedTemplateSeparateByUser ?? { A: 0, B: 0 }
  const totalIncludingSeparate =
    inputs.fixedTotalIncludingSeparate ??
    fixedRegularTotal + templateSeparateByUser.A + templateSeparateByUser.B
  return {
    totalIncome,
    totalFixed,
    sharedLivingCost,
    sharedLivingCostPerPerson,
    sharedLivingByPerson,
    totalInvest,
    investByPerson,
    allowanceByPerson: { A: allowanceA, B: allowanceB },
    fixedDepositByUser,
    fixedDepositBreakdown: {
      // 통장 입금 기준: 별도 정산 제외 고정지출 합
      totalFixed: fixedRegularTotal,
      halfEach,
      // [구버전 호환]
      separateByUser: {
        A: halfEach - fixedDepositByUser.A,
        B: halfEach - fixedDepositByUser.B,
      },
      totalIncludingSeparate,
      templateSeparateByUser,
    },
    separateExpenseCard5090: inputs.separateExpenseCard5090 ?? null,
    userSummary,
    chartData,
  }
}
