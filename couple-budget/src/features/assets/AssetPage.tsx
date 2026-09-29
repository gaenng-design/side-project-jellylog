import { useState } from 'react'
import { pageTitleH1Style, PRIMARY } from '@/styles/formControls'
import { ym } from '@/lib/assetCalc'
import type { AssetItem } from '@/types'
import { useAssetModel } from './useAssetModel'
import { AssetSummaryHeader } from './components/AssetSummaryHeader'
import { CategoryTabs } from './components/CategoryTabs'
import { CategoryInsightCards } from './components/CategoryInsightCards'
import { OverviewCards } from './components/OverviewCards'
import { ProfitCards } from './components/ProfitCards'
import { MonthlySummaryTable } from './components/MonthlySummaryTable'
import { AssetTrendChart } from './components/AssetTrendChart'
import { AssetMonthsSection } from './components/AssetMonthsSection'
import { AddItemModal } from './components/AddItemModal'
import { EditItemModal } from './components/EditItemModal'

export function AssetPage() {
  const model = useAssetModel()
  const { currentYear, currentMonth, sortedItems, personAName, personBName, addItem, updateItem, removeItem, setEntry } = model

  // 카테고리 필터 탭
  const [categoryFilter, setCategoryFilter] = useState('전체')
  const isOverview = categoryFilter === '전체'
  const filteredItems = isOverview
    ? sortedItems
    : sortedItems.filter((item) => item.category === categoryFilter)

  /** 항목 접기 상태 (모든 연도 공통) */
  const [collapsedItems, setCollapsedItems] = useState<Set<string>>(new Set())
  const toggleCollapse = (itemId: string) => {
    setCollapsedItems((prev) => {
      const next = new Set(prev)
      if (next.has(itemId)) next.delete(itemId)
      else next.add(itemId)
      return next
    })
  }

  // 항목 추가·수정 모달
  const [editingItem, setEditingItem] = useState<AssetItem | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)

  return (
    <div style={{ paddingBottom: 40 }}>
      <h1 style={{ ...pageTitleH1Style, marginBottom: 16 }}>자산</h1>

      <AssetSummaryHeader model={model} />

      <CategoryTabs
        model={model}
        categoryFilter={categoryFilter}
        onSelect={setCategoryFilter}
        onAddItem={() => setShowAddModal(true)}
      />

      {!isOverview && (
        <CategoryInsightCards model={model} categoryFilter={categoryFilter} filteredItems={filteredItems} />
      )}

      {/* 항목 접기 안내 */}
      {sortedItems.length > 0 && collapsedItems.size > 0 && (
        <div style={{ fontSize: 11, color: '#6b7280', marginBottom: 8 }}>
          접힌 항목 {collapsedItems.size}개 · 총합은 변경되지 않습니다.
          <button
            type="button"
            onClick={() => setCollapsedItems(new Set())}
            style={{
              marginLeft: 8,
              padding: '2px 8px',
              fontSize: 11,
              border: '1px solid #b3b8c1',
              background: '#fff',
              borderRadius: 6,
              cursor: 'pointer',
              color: PRIMARY,
            }}
          >
            모두 펼치기
          </button>
        </div>
      )}

      {isOverview && (
        <>
          <OverviewCards model={model} />
          <ProfitCards model={model} />
          <AssetTrendChart model={model} />
          <MonthlySummaryTable model={model} />
        </>
      )}

      {/* 통합 자산 테이블 — 여러 해 월별 데이터를 하나의 표로 (최신 월이 아래) */}
      {!isOverview && (
        <AssetMonthsSection
          model={model}
          filteredItems={filteredItems}
          collapsedItems={collapsedItems}
          toggleCollapse={toggleCollapse}
          onItemClick={setEditingItem}
        />
      )}

      {showAddModal && (
        <AddItemModal
          personAName={personAName}
          personBName={personBName}
          initialCategory={isOverview ? '저축' : categoryFilter}
          onClose={() => setShowAddModal(false)}
          onAdd={({ name, category, defaultAmount, person, locked, initialAmount, savingsType, interestRate, maturityDate }) => {
            const newItemId = addItem({
              name,
              category,
              person,
              defaultAmount: defaultAmount > 0 ? defaultAmount : undefined,
              locked: locked || undefined,
              initialAmount: initialAmount && initialAmount > 0 ? initialAmount : undefined,
              savingsType: savingsType ?? undefined,
              interestRate: interestRate ?? undefined,
              maturityDate: maturityDate ?? undefined,
            })
            if (initialAmount && initialAmount > 0) {
              setEntry(newItemId, ym(currentYear, currentMonth), initialAmount)
            }
            if (defaultAmount > 0) {
              for (let mi = currentMonth + (initialAmount && initialAmount > 0 ? 1 : 0); mi < 12; mi++) {
                const base = initialAmount && initialAmount > 0 ? initialAmount : 0
                const offset = mi - currentMonth - (initialAmount && initialAmount > 0 ? 1 : 0) + 1
                setEntry(newItemId, ym(currentYear, mi), base + defaultAmount * offset)
              }
            }
          }}
        />
      )}

      {editingItem && (
        <EditItemModal
          key={editingItem.id}
          item={editingItem}
          personAName={personAName}
          personBName={personBName}
          currentYM={ym(currentYear, currentMonth)}
          onSave={(patch) => {
            updateItem(editingItem.id, patch)
            setEditingItem(null)
          }}
          onDelete={() => {
            removeItem(editingItem.id)
            setEditingItem(null)
          }}
          onClose={() => setEditingItem(null)}
        />
      )}
    </div>
  )
}
