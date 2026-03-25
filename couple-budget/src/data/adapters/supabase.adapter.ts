import { supabase } from '../supabase'
import { logAdapterOnSave } from '../repo-logger'
import type { IRepository } from '../types'

/** DB 스키마: 'camelCase'(yearMonth) | 'snake_case'(year_month, 기본값) */
const DB_SCHEMA = (import.meta.env.VITE_SUPABASE_DB_SCHEMA as string) || 'snake_case'

/** camelCase → snake_case (Supabase/Postgres 기본 컬럼명) */
function toSnakeCase(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const snake = k.replace(/[A-Z]/g, (c) => `_${c.toLowerCase()}`)
    out[snake] = v
  }
  return out
}

/** snake_case → camelCase (DB 응답 → 앱 타입) */
function toCamelCase(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(obj)) {
    const camel = k.replace(/_([a-z])/g, (_, c) => c.toUpperCase())
    out[camel] = v
  }
  return out
}

export class SupabaseAdapter<T extends { id: string }> implements IRepository<T> {
  constructor(private readonly tableName: string) {}

  async query(predicate: (item: T) => boolean, yearMonth?: string): Promise<T[]> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const col = DB_SCHEMA === 'camelCase' ? 'yearMonth' : 'year_month'
    let q = supabase.from(this.tableName).select('*')
    if (yearMonth != null) q = q.eq(col, yearMonth)
    const { data, error } = await q
    if (error) {
      console.log(`[Supabase] query ${this.tableName} | FAIL | code: ${error.code} | ${error.message}`)
      throw new Error(`[Supabase] query ${this.tableName}: ${error.message}`)
    }
    const raw = (data ?? []) as Record<string, unknown>[]
    const rows = raw.map((r) => (Object.keys(r).some((k) => k.includes('_')) ? toCamelCase(r) : r) as T)
    // yearMonth로 서버 필터가 이미 적용됨 → predicate 생략 (DB "2026-2" vs 앱 "2026-02" 형식 불일치 시 0 rows 되는 문제 방지)
    const filtered = yearMonth != null ? rows : rows.filter(predicate)
    console.log(`[Supabase] query ${this.tableName} | OK | ${filtered.length} rows`)
    return filtered
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newItem = { ...item, id } as T
    const payload = (DB_SCHEMA === 'camelCase' ? (newItem as Record<string, unknown>) : toSnakeCase(newItem as Record<string, unknown>))
    console.log(`[Supabase] INSERT 호출 | table: ${this.tableName} | payload:`, JSON.stringify(payload))
    const { data, error } = await supabase.from(this.tableName).insert(payload as Record<string, unknown>).select().single()
    if (error) {
      // 23505 = unique_violation: (yearMonth, person) 중복 시 기존 행 UPDATE로 전환 (저장하기/금액변경 시)
      if (error.code === '23505' && this.tableName === 'incomes' && 'yearMonth' in item && 'person' in item) {
        const col = DB_SCHEMA === 'camelCase' ? 'yearMonth' : 'year_month'
        const { data: existing } = await supabase.from(this.tableName).select('id').eq(col, (item as Record<string, unknown>).yearMonth).eq('person', (item as Record<string, unknown>).person).limit(1).single()
        if (existing?.id) {
          const updatePayload = DB_SCHEMA === 'camelCase' ? { description: (item as Record<string, unknown>).description, amount: (item as Record<string, unknown>).amount } : toSnakeCase({ description: (item as Record<string, unknown>).description, amount: (item as Record<string, unknown>).amount })
          const { data: updated, error: updErr } = await supabase.from(this.tableName).update(updatePayload).eq('id', existing.id).select().single()
          if (!updErr && updated) {
            const raw = (updated ?? {}) as Record<string, unknown>
            const result = (Object.keys(raw).some((k) => k.includes('_')) ? toCamelCase(raw) : raw) as T
            console.log(`[Supabase] INSERT→UPDATE (unique 충돌) | table: ${this.tableName} | id: ${result?.id}`)
            logAdapterOnSave(this.tableName, 'create', true)
            return result
          }
        }
      }
      const status = (error as { status?: number }).status
      console.error(`[Supabase] INSERT 실패 | table: ${this.tableName} | HTTP: ${status ?? '?'} | code: ${error.code} | message: ${error.message} | details:`, error.details, '| hint:', error.hint)
      logAdapterOnSave(this.tableName, 'create', false, `HTTP ${status ?? '?'} | ${error.code} | ${error.message}`)
      throw new Error(`[Supabase] create ${this.tableName}: ${error.message}`)
    }
    const raw = (data ?? {}) as Record<string, unknown>
    const result = (Object.keys(raw).some((k) => k.includes('_')) ? toCamelCase(raw) : raw) as T
    console.log(`[Supabase] INSERT 성공 | table: ${this.tableName} | id: ${result?.id}`)
    logAdapterOnSave(this.tableName, 'create', true)
    return result
  }

  async update(id: string, partial: Partial<T>): Promise<T> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const payload = (DB_SCHEMA === 'camelCase' ? (partial as Record<string, unknown>) : toSnakeCase(partial as Record<string, unknown>))
    const { data, error } = await supabase
      .from(this.tableName)
      .update(payload)
      .eq('id', id)
      .select()
      .single()
    if (error) {
      const status = (error as { status?: number }).status
      console.error(`[Supabase] UPDATE 실패 | table: ${this.tableName} | id: ${id} | HTTP: ${status ?? '?'} | code: ${error.code} | message: ${error.message}`)
      logAdapterOnSave(this.tableName, 'update', false, `HTTP ${status ?? '?'} | ${error.code} | ${error.message}`)
      throw new Error(`[Supabase] update ${this.tableName}: ${error.message}`)
    }
    const raw = (data ?? {}) as Record<string, unknown>
    const result = (Object.keys(raw).some((k) => k.includes('_')) ? toCamelCase(raw) : raw) as T
    logAdapterOnSave(this.tableName, 'update', true)
    return result
  }

  async remove(id: string): Promise<void> {
    if (!supabase) throw new Error('Supabase client not initialized')
    const { error } = await supabase.from(this.tableName).delete().eq('id', id)
    logAdapterOnSave(this.tableName, 'remove', !error, error ? `code: ${error.code} | ${error.message}` : undefined)
    if (error) throw new Error(`[Supabase] remove ${this.tableName}: ${error.message}`)
  }
}
