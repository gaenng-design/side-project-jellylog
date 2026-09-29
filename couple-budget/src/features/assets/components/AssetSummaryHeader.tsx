import { ASSET_CATEGORIES } from '@/store/useAssetStore'
import { JELLY, jellyCardStyle } from '@/styles/jellyGlass'
import { PRIMARY } from '@/styles/formControls'
import { MONTHS, fmtSum } from '../assetFormat'
import type { AssetModel } from '../useAssetModel'
import { DS } from '@/design-system/tokens'

/** 상단 요약 — 이번 달 총 합계·가용 금액·전월 대비 증감 + 명의별 자산 */
export function AssetSummaryHeader({ model }: { model: AssetModel }) {
  const { currentYear, currentMonth, personAName, personBName, getPersonColor, getItemColumnBg, sortedItems, getProjectedValue, calcMonthTotals, currentYearMonthTotals } = model
  const monthTotal = currentYearMonthTotals[currentMonth]
  const sumByPerson = (p?: 'A' | 'B') =>
    sortedItems
      .filter((item) => ASSET_CATEGORIES.includes(item.category) && item.person === p)
      .reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)
  const availableTotal = sortedItems
    .filter((item) => ASSET_CATEGORIES.includes(item.category) && !item.locked)
    .reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)
  const personATotal = sumByPerson('A')
  const personBTotal = sumByPerson('B')
  const sharedTotal = sortedItems
    .filter((item) => ASSET_CATEGORIES.includes(item.category) && !item.person)
    .reduce((sum, item) => sum + getProjectedValue(currentYear, item, currentMonth), 0)

  // 전월 합계 (1월이면 전년 12월)
  const prevMonthTotal = currentMonth > 0
    ? currentYearMonthTotals[currentMonth - 1]
    : calcMonthTotals(currentYear - 1)[11]
  const monthDiff = monthTotal - prevMonthTotal
  const hasPrevData = prevMonthTotal > 0
  const prevLabel = currentMonth > 0
    ? `${MONTHS[currentMonth - 1]} 대비`
    : `${currentYear - 1}년 12월 대비`

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 16 }}>
      {/* 상단: 총 합계 + 가용 금액 + 전월 대비 증감 */}
      <div
        style={{
          ...jellyCardStyle,
          padding: '16px 20px',
          display: 'flex',
          gap: 24,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
            {currentYear}년 {MONTHS[currentMonth]} · 총 합계
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: PRIMARY }}>{fmtSum(monthTotal)}</div>
        </div>
        <div style={{ flex: 1, minWidth: 160 }}>
          <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
            💰 가용 금액
            <span style={{ color: DS.color.text.muted, marginLeft: 4 }}>(묶이지 않은 돈)</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 700, color: JELLY.text }}>{fmtSum(availableTotal)}</div>
        </div>
        {hasPrevData && (
          <div style={{ flex: 1, minWidth: 160 }}>
            <div style={{ fontSize: 11, color: DS.color.text.secondary, marginBottom: 4 }}>
              📈 이번 달 증감
              <span style={{ color: DS.color.text.muted, marginLeft: 4 }}>({prevLabel})</span>
            </div>
            <div
              style={{
                fontSize: 26,
                fontWeight: 700,
                color: monthDiff >= 0 ? DS.color.positive.main : DS.color.negative.main,
              }}
            >
              {monthDiff >= 0 ? '+' : ''}{fmtSum(monthDiff)}
            </div>
          </div>
        )}
      </div>

      {/* 하단: 유저별 소유 자산 */}
      <div
        style={{
          ...jellyCardStyle,
          padding: '14px 20px',
          display: 'flex',
          gap: 16,
          flexWrap: 'wrap',
          alignItems: 'flex-end',
        }}
      >
        <div
          style={{
            flex: 1,
            minWidth: 140,
            padding: '10px 14px',
            borderRadius: 12,
            background: getItemColumnBg('A', 'header'),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: getPersonColor('A'),
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: DS.color.text.body, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {personAName}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: JELLY.text, whiteSpace: 'nowrap' }}>
            {fmtSum(personATotal)}
          </div>
        </div>
        <div
          style={{
            flex: 1,
            minWidth: 140,
            padding: '10px 14px',
            borderRadius: 12,
            background: getItemColumnBg('B', 'header'),
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'flex-start',
            gap: 4,
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: getPersonColor('B'),
                flexShrink: 0,
              }}
            />
            <span style={{ fontSize: 12, color: DS.color.text.body, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {personBName}
            </span>
          </div>
          <div style={{ fontSize: 16, fontWeight: 700, color: JELLY.text, whiteSpace: 'nowrap' }}>
            {fmtSum(personBTotal)}
          </div>
        </div>
        {sharedTotal > 0 && (
          <div
            style={{
              flex: 1,
              minWidth: 140,
              padding: '10px 14px',
              borderRadius: 12,
              background: DS.color.bg.muted,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'flex-start',
              gap: 4,
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 0 }}>
              <span
                style={{
                  display: 'inline-block',
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: DS.color.text.muted,
                  flexShrink: 0,
                }}
              />
              <span style={{ fontSize: 12, color: DS.color.text.body, fontWeight: 600 }}>공유</span>
            </div>
            <div style={{ fontSize: 16, fontWeight: 700, color: JELLY.text, whiteSpace: 'nowrap' }}>
              {fmtSum(sharedTotal)}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
