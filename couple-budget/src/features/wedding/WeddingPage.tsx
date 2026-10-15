import { useState } from 'react'
import { DS } from '@/design-system/tokens'
import { pageTitleH1Style } from '@/styles/formControls'
import { useWeddingStore } from '@/store/useWeddingStore'
import { daysUntil } from '@/lib/assetCalc'
import { WeddingOverview } from './WeddingOverview'
import { WeddingExpenses } from './WeddingExpenses'
import { WeddingGifts } from './WeddingGifts'
import { WeddingSettlementTab } from './WeddingSettlementTab'

type TabKey = 'overview' | 'expenses' | 'gifts' | 'settle'
const TABS: { key: TabKey; label: string }[] = [
  { key: 'overview', label: '개요' },
  { key: 'expenses', label: '비용' },
  { key: 'gifts', label: '축의금' },
  { key: 'settle', label: '정산' },
]

/** 결혼식 정산·정리: 준비 비용 · 축의금 · 양가 정산 */
export default function WeddingPage() {
  const weddingDate = useWeddingStore((s) => s.settings.weddingDate)
  const [tab, setTab] = useState<TabKey>('overview')
  const dday = weddingDate ? daysUntil(weddingDate) : null

  return (
    <div style={{ paddingBottom: 40, fontFamily: DS.font.family, color: DS.color.text.primary }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, flexWrap: 'wrap', marginBottom: DS.space[3] }}>
        <h1 style={{ ...pageTitleH1Style, margin: 0 }}>결혼식</h1>
        {dday !== null && (
          <span style={{ fontSize: DS.font.size.body, fontWeight: 700, color: DS.color.primaryDark }}>
            {dday > 0 ? `D-${dday}` : dday === 0 ? 'D-Day' : `D+${-dday}`}
          </span>
        )}
      </div>

      <div role="tablist" aria-label="결혼식 구분" style={{ display: 'flex', gap: 4, padding: 4, marginBottom: DS.space[4], borderRadius: DS.radius.control, background: DS.color.bg.muted }}>
        {TABS.map((t) => {
          const on = t.key === tab
          return (
            <button
              key={t.key}
              type="button"
              role="tab"
              aria-selected={on}
              data-compact
              onClick={() => setTab(t.key)}
              style={{ flex: 1, height: 36, minHeight: 36, padding: '0 8px', borderRadius: DS.radius.control - 2, border: 'none', background: on ? DS.color.bg.secondary : 'transparent', color: on ? DS.color.text.primary : DS.color.text.secondary, fontWeight: on ? 700 : 500, fontSize: DS.font.size.body, boxShadow: on ? DS.shadow[1] : 'none', cursor: 'pointer', fontFamily: 'inherit' }}
            >
              {t.label}
            </button>
          )
        })}
      </div>

      {tab === 'overview' && <WeddingOverview goTo={(k) => setTab(k)} />}
      {tab === 'expenses' && <WeddingExpenses />}
      {tab === 'gifts' && <WeddingGifts />}
      {tab === 'settle' && <WeddingSettlementTab />}
    </div>
  )
}
