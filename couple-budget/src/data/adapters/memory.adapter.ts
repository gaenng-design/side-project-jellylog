import type { IRepository } from '../types'

const STORAGE_PREFIX = 'couple-budget:repo:'

function loadFromStorage<T>(key: string): T[] {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function saveToStorage<T>(key: string, items: T[]): void {
  try {
    localStorage.setItem(key, JSON.stringify(items))
  } catch (e) {
    console.warn('Failed to persist to localStorage:', e)
  }
}

export class MemoryAdapter<T extends { id: string }> implements IRepository<T> {
  private store: Map<string, T> = new Map()
  private storageKey: string

  constructor(storageKey: string) {
    this.storageKey = STORAGE_PREFIX + storageKey
    const items = loadFromStorage<T>(this.storageKey)
    for (const item of items) {
      if (item?.id) this.store.set(item.id, item)
    }
  }

  private persist(): void {
    const items = Array.from(this.store.values())
    saveToStorage(this.storageKey, items)
    void import('@/services/debouncedCloudSync').then((m) => m.scheduleCloudSync('memory-repo'))
  }

  async query(predicate: (item: T) => boolean, _yearMonth?: string): Promise<T[]> {
    return Array.from(this.store.values()).filter(predicate)
  }

  async create(item: Omit<T, 'id'>): Promise<T> {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const newItem = { ...item, id } as T
    this.store.set(id, newItem)
    this.persist()
    return newItem
  }

  async update(id: string, partial: Partial<T>): Promise<T> {
    const existing = this.store.get(id)
    if (!existing) {
      throw new Error(`Item ${id} not found`)
    }
    const updated = { ...existing, ...partial }
    this.store.set(id, updated)
    this.persist()
    return updated
  }

  async remove(id: string): Promise<void> {
    this.store.delete(id)
    this.persist()
  }
}
