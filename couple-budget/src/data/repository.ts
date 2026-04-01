import { MemoryAdapter } from './adapters/memory.adapter'
import type { IRepository } from './types'
import type { Income, FixedExpense, Investment, SeparateItem } from '@/types'

/**
 * 일상 CRUD는 MemoryAdapter → localStorage가 즉시 소스.
 * Supabase는 debouncedCloudSync가 saveAllToSupabase로 비동기 반영(설정「전체 저장하기」도 동일 경로).
 */
function createRepository<T extends { id: string }>(tableName: string): IRepository<T> {
  return new MemoryAdapter<T>(tableName)
}

export const incomeRepo       = createRepository<Income>('incomes')
export const fixedExpenseRepo = createRepository<FixedExpense>('fixed_expenses')
export const investmentRepo   = createRepository<Investment>('investments')
export const separateItemRepo = createRepository<SeparateItem>('separate_items')
