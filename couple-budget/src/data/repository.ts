import { MemoryAdapter } from './adapters/memory.adapter'
import type { IRepository } from './types'
import type { Income, FixedExpense, Investment, SeparateItem } from '@/types'

/**
 * 일상 CRUD는 MemoryAdapter → localStorage가 즉시 소스.
 * 클라우드 반영은 GitHub 동기화(설정「동기화」「저장하기」)가 담당한다.
 */
function createRepository<T extends { id: string }>(tableName: string): IRepository<T> {
  return new MemoryAdapter<T>(tableName)
}

export const incomeRepo       = createRepository<Income>('incomes')
export const fixedExpenseRepo = createRepository<FixedExpense>('fixed_expenses')
export const investmentRepo   = createRepository<Investment>('investments')
export const separateItemRepo = createRepository<SeparateItem>('separate_items')
