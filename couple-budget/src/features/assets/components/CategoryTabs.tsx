import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { PRIMARY, INPUT_BORDER_RADIUS } from '@/styles/formControls'
import { fmtMan } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { DS } from '@/design-system/tokens'

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
          <button
            key={cat}
            type="button"
            onClick={() => onSelect(cat)}
            style={{
              padding: '6px 14px',
              borderRadius: 20,
              border: active ? `1.5px solid ${PRIMARY}` : `1.5px solid ${DS.color.border.subtle}`,
              background: active ? `rgba(79,140,255,0.1)` : DS.color.bg.secondary,
              fontSize: 12,
              fontWeight: active ? 600 : 400,
              color: active ? PRIMARY : DS.color.text.secondary,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 6,
            }}
          >
            {cat}
            {total > 0 && (
              <span style={{ fontSize: 11, color: active ? PRIMARY : DS.color.text.muted }}>
                {fmtMan(Math.round(total / 10000))}
              </span>
            )}
          </button>
        )
      })}
      {categoryFilter !== '전체' && (
        <button
          type="button"
          onClick={onAddItem}
          style={{
            marginLeft: 'auto',
            height: 32,
            padding: '0 14px',
            borderRadius: INPUT_BORDER_RADIUS,
            border: `1.5px solid ${PRIMARY}`,
            background: 'rgba(79,140,255,0.08)',
            fontSize: 12,
            fontWeight: 600,
            color: PRIMARY,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 4,
            fontFamily: 'inherit',
            flexShrink: 0,
          }}
        >
          + 항목 추가
        </button>
      )}
    </div>
  )
}
