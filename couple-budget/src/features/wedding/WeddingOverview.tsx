import { useMemo } from 'react'
import { DS } from '@/design-system/tokens'
import { Card } from '@/design-system/components/Card'
import { StatCard } from '@/design-system/components/StatCard'
import { AmountInput } from '@/components/AmountInput'
import { useAppStore } from '@/store/useAppStore'
import { useWeddingStore } from '@/store/useWeddingStore'
import { calcWeddingSettlement } from '@/lib/weddingSettlement'
import { daysUntil } from '@/lib/assetCalc'
import { EmptyNote, Field, numStyle, parseAmount, ProgressBar, textInput, won } from './weddingUi'
import { fmtWonShort } from '@/features/dashboard/chartKit'

/** 개요 탭: 예산 대비 비용, 분류별 현황, 기본 설정(예식일·총 예산) */
export function WeddingOverview({ goTo }: { goTo: (tab: 'expenses' | 'gifts') => void }) {
  const { expenses, gifts, settings, updateSettings } = useWeddingStore()
  const aName = useAppStore((s) => s.settings.personAName) || '유저 1'
  const bName = useAppStore((s) => s.settings.personBName) || '유저 2'

  const r = useMemo(
    () => calcWeddingSettlement({ expenses, gifts, splitMode: settings.splitMode, giftMode: settings.giftMode }),
    [expenses, gifts, settings.splitMode, settings.giftMode],
  )
  const budget = settings.totalBudget
  const remaining = budget - r.plannedTotal
  const dday = settings.weddingDate ? daysUntil(settings.weddingDate) : null

  const cats = useMemo(() => {
    const map = new Map<string, { total: number; budget: number; paid: number }>()
    for (const e of expenses) {
      const c = map.get(e.category) ?? { total: 0, budget: 0, paid: 0 }
      c.total += e.amount
      c.budget += e.budget ?? 0
      if (e.paid) c.paid += e.amount
      map.set(e.category, c)
    }
    return [...map.entries()].sort((a, b) => b[1].total - a[1].total)
  }, [expenses])

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: DS.space[3] }}>
      <div style={{ display: 'grid', gap: DS.space[3], gridTemplateColumns: 'repeat(2, minmax(0, 1fr))' }}>
        <StatCard valueSize={DS.font.size.title}
          label="예정 비용 합계"
          value={fmtWonShort(r.plannedTotal)}
          sub={budget > 0 ? (remaining >= 0 ? `예산까지 ${won(remaining)} 남음` : `예산 ${won(-remaining)} 초과`) : '총 예산을 정해 보세요'}
          valueColor={budget > 0 && remaining < 0 ? DS.color.negative.main : undefined}
          tone={budget > 0 && remaining < 0 ? 'negative' : 'neutral'}
          onClick={() => goTo('expenses')}
        >
          {budget > 0 && <div style={{ marginTop: 8 }}><ProgressBar value={r.plannedTotal / budget} over={remaining < 0} /></div>}
        </StatCard>
        <StatCard valueSize={DS.font.size.title} label="결제 완료" value={fmtWonShort(r.paidTotal)} sub={r.unpaidTotal > 0 ? `결제 전 ${won(r.unpaidTotal)}` : '모두 결제했어요'} onClick={() => goTo('expenses')} />
        <StatCard valueSize={DS.font.size.title} label="받은 축의금" value={fmtWonShort(r.giftTotal)} sub={`${gifts.length}건`} onClick={() => goTo('gifts')} />
        <StatCard valueSize={DS.font.size.title}
          label="정산"
          value={settings.splitMode === 'recordOnly' ? '기록만' : r.transfer ? fmtWonShort(r.transfer.amount) : r.paidTotal > 0 ? '없음' : '—'}
          sub={r.transfer && settings.splitMode !== 'recordOnly' ? `${r.transfer.from === 'A' ? aName : bName}측 → ${r.transfer.to === 'A' ? aName : bName}측` : '비용·정산 탭에서 확인'}
          onClick={() => goTo('expenses')}
        />
      </div>

      <Card variant="data" padding={5} hoverLift={false}>
        <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, marginBottom: DS.space[3] }}>분류별 현황</div>
        {cats.length === 0 ? (
          <EmptyNote>비용을 추가하면 분류별로 정리해 드려요.</EmptyNote>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {cats.map(([cat, c]) => (
              <div key={cat}>
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8, marginBottom: 6, ...numStyle }}>
                  <span style={{ fontSize: DS.font.size.body, fontWeight: 600 }}>{cat}</span>
                  <span style={{ fontSize: DS.font.size.body, color: c.budget > 0 && c.total > c.budget ? DS.color.negative.main : DS.color.text.primary }}>
                    {won(c.total)}{c.budget > 0 ? <span style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted }}> / 예산 {won(c.budget)}</span> : null}
                  </span>
                </div>
                <ProgressBar value={c.budget > 0 ? c.total / c.budget : r.plannedTotal > 0 ? c.total / r.plannedTotal : 0} over={c.budget > 0 && c.total > c.budget} />
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card variant="data" padding={5} hoverLift={false}>
        <div style={{ fontSize: DS.font.size.subtitle, fontWeight: 700, marginBottom: DS.space[3] }}>기본 설정</div>
        <Field label="예식일" hint={dday === null ? undefined : dday > 0 ? `D-${dday}` : dday === 0 ? '오늘이에요 🎉' : `${-dday}일 지났어요`}>
          <input style={textInput} type="date" value={settings.weddingDate ?? ''} onChange={(e) => updateSettings({ weddingDate: e.target.value || undefined })} />
        </Field>
        <Field label="총 예산">
          <AmountInput value={budget ? String(budget) : ''} onChange={(v) => updateSettings({ totalBudget: parseAmount(v) })} variant="filled" />
        </Field>
        <div style={{ fontSize: DS.font.size.caption, color: DS.color.text.muted }}>{aName}측 · {bName}측은 설정의 유저 이름을 따라가요.</div>
      </Card>
    </div>
  )
}
