import { useMemo } from 'react'
import { DS } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { InfoTip } from '@/design-system/components/InfoTip'
import { useAppStore } from '@/store/useAppStore'
import { useWeddingStore } from '@/store/useWeddingStore'
import { calcWeddingSettlement, type GiftMode, type SplitMode } from '@/lib/weddingSettlement'
import { numStyle, won } from './weddingUi'

const SPLIT_OPTIONS: { value: SplitMode; title: string; desc: string }[] = [
  { value: 'item', title: '항목마다 부담 비율 지정', desc: '비용 항목별로 부담 비율을 정해요 (예: 예식장 60:40, 신혼여행 50:50)' },
  { value: 'equal', title: '모두 반반', desc: '결제한 사람과 상관없이 모든 비용을 50:50으로 나눠요' },
  { value: 'recordOnly', title: '정산 없이 기록만', desc: '송금액은 계산하지 않고 비용·축의금만 정리해요' },
]
const GIFT_OPTIONS: { value: GiftMode; title: string; desc: string }[] = [
  { value: 'own', title: '각자 받은 축의금은 각자', desc: '정산 송금액에는 영향이 없고, 최종 부담에서만 빼요' },
  { value: 'pooled', title: '축의금을 합쳐서 비용 먼저 충당', desc: '두 사람 축의금을 합쳐 비용에서 뺀 뒤 부담 비율대로 나눠요' },
]

function Choice<T extends string>({ options, value, onChange }: { options: { value: T; title: string; desc: string }[]; value: T; onChange: (v: T) => void }) {
  return (
    <div role="radiogroup" style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {options.map((o) => {
        const on = o.value === value
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            style={{ textAlign: 'left', padding: '10px 12px', borderRadius: DS.radius.control, border: `1.5px solid ${on ? DS.color.primary : DS.color.border.subtle}`, background: on ? DS.color.primarySoft : DS.color.bg.secondary, fontFamily: 'inherit', cursor: 'pointer' }}
          >
            <div style={{ fontSize: DS.font.size.body, fontWeight: 600, color: on ? DS.color.primaryDark : DS.color.text.primary }}>{o.title}</div>
            <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.secondary, marginTop: 2, lineHeight: 1.5 }}>{o.desc}</div>
          </button>
        )
      })}
    </div>
  )
}

/** 정산 탭: 정산 방식 선택 + 결과 */
export function WeddingSettlementTab() {
  const { expenses, gifts, settings, updateSettings } = useWeddingStore()
  const aName = useAppStore((s) => s.settings.personAName) || '유저 1'
  const bName = useAppStore((s) => s.settings.personBName) || '유저 2'
  const name = (s: 'A' | 'B') => (s === 'A' ? aName : bName)

  const r = useMemo(
    () => calcWeddingSettlement({ expenses, gifts, splitMode: settings.splitMode, giftMode: settings.giftMode }),
    [expenses, gifts, settings.splitMode, settings.giftMode],
  )

  const rows: { label: string; a: number; b: number; strong?: boolean }[] = [
    { label: '결제한 금액', a: r.paidA, b: r.paidB },
    { label: '부담해야 할 금액', a: r.owedA, b: r.owedB },
    { label: '받은 축의금', a: r.giftA, b: r.giftB },
    { label: '축의금 반영 최종 부담', a: r.netCostA, b: r.netCostB, strong: true },
  ]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space[3] }}>
      <Card variant="data" padding={5} hoverLift={false}>
        <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, marginBottom: 4 }}>정산 결과</div>
        {settings.splitMode === 'recordOnly' ? (
          <div style={{ fontSize: DS.font.size.body, color: DS.color.text.secondary }}>정산 없이 기록만 하는 방식이에요. 방식을 바꾸면 송금액을 계산해 드려요.</div>
        ) : r.paidTotal === 0 ? (
          <div style={{ fontSize: DS.font.size.body, color: DS.color.text.muted }}>결제 완료로 표시한 비용이 없어요. 비용 탭에서 결제한 항목을 완료 처리해 주세요.</div>
        ) : r.transfer ? (
          <div style={{ fontSize: DS.font.size.headline, fontWeight: 700, color: DS.color.primaryDark, lineHeight: 1.3 }}>
            {name(r.transfer.from)}측이 {name(r.transfer.to)}측에게<br />
            <span style={numStyle}>{won(r.transfer.amount)}</span> 보내면 돼요
          </div>
        ) : (
          <div style={{ fontSize: DS.font.size.title, fontWeight: 700, color: DS.color.positive.main }}>정산할 금액이 없어요 🎉</div>
        )}
        <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted, marginTop: 8, ...numStyle }}>
          결제 완료 {won(r.paidTotal)}{r.unpaidTotal > 0 ? ` · 결제 전 ${won(r.unpaidTotal)}은 제외` : ''}
        </div>

        <div style={{ overflowX: 'auto', marginTop: DS.space[4] }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', ...numStyle }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'left', padding: '8px 0', fontSize: DS.font.size.caption, color: DS.color.text.secondary, fontWeight: 600 }} />
                <th style={{ textAlign: 'right', padding: '8px 0 8px 12px', fontSize: DS.font.size.caption, color: DS.color.text.secondary, fontWeight: 600 }}>{aName}측</th>
                <th style={{ textAlign: 'right', padding: '8px 0 8px 12px', fontSize: DS.font.size.caption, color: DS.color.text.secondary, fontWeight: 600 }}>{bName}측</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.label} style={{ borderTop: `1px solid ${DS.color.border.subtle}` }}>
                  <td style={{ padding: '10px 0', fontSize: DS.font.size.body, color: DS.color.text.body, fontWeight: row.strong ? 700 : 400 }}>{row.label}</td>
                  <td style={{ padding: '10px 0 10px 12px', textAlign: 'right', fontSize: DS.font.size.body, fontWeight: row.strong ? 700 : 500, whiteSpace: 'nowrap' }}>{won(row.a)}</td>
                  <td style={{ padding: '10px 0 10px 12px', textAlign: 'right', fontSize: DS.font.size.body, fontWeight: row.strong ? 700 : 500, whiteSpace: 'nowrap' }}>{won(row.b)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      <Card variant="data" padding={5} hoverLift={false}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: DS.space[3] }}>
          <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700 }}>정산 방식</div>
          <InfoTip>방식을 바꿔도 입력한 비용·축의금은 그대로예요. 언제든 바꿔서 비교해 볼 수 있어요.</InfoTip>
        </div>
        <Choice options={SPLIT_OPTIONS} value={settings.splitMode} onChange={(v) => updateSettings({ splitMode: v })} />
        <div style={{ fontSize: DS.font.size.caption, fontWeight: 700, color: DS.color.text.secondary, margin: `${DS.space[4]}px 0 ${DS.space[2]}px` }}>축의금 처리</div>
        <Choice options={GIFT_OPTIONS} value={settings.giftMode} onChange={(v) => updateSettings({ giftMode: v })} />
      </Card>
    </div>
  )
}
