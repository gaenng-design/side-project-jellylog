export interface IRepository<T extends { id: string }> {
  query: (predicate: (item: T) => boolean, yearMonth?: string) => Promise<T[]>
  create: (item: Omit<T, 'id'>) => Promise<T>
  update: (id: string, partial: Partial<T>) => Promise<T>
  remove: (id: string) => Promise<void>
}
