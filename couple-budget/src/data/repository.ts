import { MemoryAdapter } from './adapters/memory.adapter'
import type { IRepository } from './types'
import type { Income, FixedExpense, Investment, SeparateItem } from '@/types'

/** Supabase 반영은 설정 화면「전체 저장하기」에서만 수행. 일상 CRUD는 로컬(localStorage)만 갱신 */
function createRepository<T extends { id: string }>(tableName: string): IRepository<T> {
  return new MemoryAdapter<T>(tableName)
}

export const incomeRepo       = createRepository<Income>('incomes')
export const fixedExpenseRepo = createRepository<FixedExpense>('fixed_expenses')
export const investmentRepo   = createRepository<Investment>('investments')
export const separateItemRepo = createRepository<SeparateItem>('separate_items')
