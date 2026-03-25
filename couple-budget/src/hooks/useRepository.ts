import { useState, useCallback, useEffect } from 'react'
import { incomeRepo } from '@/data/repository'
import type { Income } from '@/types'

function useCrud<T extends { id: string; yearMonth: string }>(
  repo: { query: (p: (item: T) => boolean) => Promise<T[]>; create: (item: Omit<T, 'id'>) => Promise<T>; update: (id: string, p: Partial<T>) => Promise<T>; remove: (id: string) => Promise<void> },
  yearMonth: string,
) {
  const [items, setItems] = useState<T[]>([])
  const [hasLoaded, setHasLoaded] = useState(false)

  const refresh = useCallback(async () => {
    const data = await repo.query((i) => i.yearMonth === yearMonth)
    setItems(data)
    setHasLoaded(true)
  }, [repo, yearMonth])

  useEffect(() => {
    setHasLoaded(false)
    refresh()
  }, [refresh])

  const create = useCallback(async (item: Omit<T, 'id'>) => {
    await repo.create(item)
    await refresh()
  }, [repo, refresh])

  const update = useCallback(async (id: string, partial: Partial<T>) => {
    await repo.update(id, partial)
    await refresh()
  }, [repo, refresh])

  const remove = useCallback(async (id: string) => {
    await repo.remove(id)
    await refresh()
  }, [repo, refresh])

  return { items, hasLoaded, create, update, remove, refresh }
}

export const useIncomes = (yearMonth: string) => useCrud<Income>(incomeRepo, yearMonth)
