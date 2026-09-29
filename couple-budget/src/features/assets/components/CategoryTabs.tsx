import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { fmtMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { Chip, Button } from '@/design-system/components'

/** 카테고리 필터 탭 (+ 항목 추가 버튼) */
export function CategoryTabs({ model, categoryFilter, onSelect, onAddItem }: { model: AssetModel; categoryFilter: string; onSelect: (cat: string) => void; onAddItem: () => void }) {
  const { sortedItems, calcCategoryTotal } = model
  const extraCats = [...new Set(sortedItems.map((i) => i.category))]
    .filter((c) => !ASSET_CATEGORIES.includes(c))
  const cats = [
    '전체',
    ...ASSET_CATEGORIES.filter((c) => sortedItems.some((i) => i.category === c)),
    ...extraCats.filter((c) => sortedItems.some((i) => i.category === c)),
  ]
  return (
    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, alignItems: 'center' }}>
      {cats.map((cat) => {
        const total = calcCategoryTotal(cat)
        const active = categoryFilter === cat
        return (
          <Chip key={cat} active={active} onClick={() => onSelect(cat)} suffix={total > 0 ? fmtMan(Math.round(total / 10000)) : undefined}>
            {cat}
          </Chip>
        )
      })}
      {categoryFilter !== '전체' && (
        <Button variant="soft" size="sm" onClick={onAddItem} style={{ marginLeft: 'auto', flexShrink: 0 }}>
          + 항목 추가
        </Button>
      )}
    </div>
  )
}
