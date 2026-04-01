import { createClient, type SupabaseClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL as string | undefined
const key = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined

/** Auth 전용 — 앱 데이터 초기화 시 이 키는 제외해야 세션 오류(400 등) 방지 */
export const COUPLE_BUDGET_SUPABASE_AUTH_KEY = 'couple-budget-supabase-auth'

/** 환경변수가 있고 placeholder가 아니면 Supabase 사용 */
export const isSupabaseConfigured =
  !!url &&
  !!key &&
  !String(url).includes('your-project-id') &&
  !String(key).includes('your-anon-key')

let supabaseClient: SupabaseClient | null = null

if (isSupabaseConfigured && url && key) {
  try {
    supabaseClient = createClient(url, key, {
      auth: {
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: true,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        storageKey: COUPLE_BUDGET_SUPABASE_AUTH_KEY,
      },
    })
  } catch (err) {
    console.error('[Supabase] createClient 실패:', err)
  }
}

export const supabase = supabaseClient
