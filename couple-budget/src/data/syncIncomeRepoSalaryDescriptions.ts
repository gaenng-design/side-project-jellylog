import type { Income } from '@/types'

const KEY_REPO_INCOMES = 'couple-budget:repo:incomes'

/** 설정의 유저 표시 이름과 급여 행 description 을 맞춤 (로컬 repo + 이후 Supabase upsert 일치) */
export function syncIncomeRepoSalaryDescriptions(personAName: string, personBName: string): void {
  const aLabel = personAName || '유저 1'
  const bLabel = personBName || '유저 2'
  try {
    const raw = localStorage.getItem(KEY_REPO_INCOMES)
    if (!raw) return
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return
    let changed = false
    const next: Income[] = parsed.map((row) => {
      const r = row as Income
      if (r.person === 'A' && r.category === '급여' && r.description !== aLabel) {
        changed = true
        return { ...r, description: aLabel }
      }
      if (r.person === 'B' && r.category === '급여' && r.description !== bLabel) {
        changed = true
        return { ...r, description: bLabel }
      }
      return r
    })
    if (changed) localStorage.setItem(KEY_REPO_INCOMES, JSON.stringify(next))
  } catch {
    /* ignore */
  }
}
