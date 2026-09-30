import { DS } from '@/design-system/tokens'
import { Switch } from '@/design-system/components'
import type { AssetModel } from '../useAssetModel'

/** 세후 이자 표시 토글 — 켜면 모든 예·적금 이자에서 이자소득세 15.4%를 뺀 금액을 보여준다 */
export function AfterTaxToggle({ model }: { model: AssetModel }) {
  const { interestAfterTax, setInterestAfterTax } = model
  return (
    <span
      title="예·적금 이자에서 이자소득세 15.4%를 뺀 금액으로 표시"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        padding: '0 12px',
        borderRadius: DS.radius.chip,
        border: `1px solid ${interestAfterTax ? DS.color.primary : DS.color.border.subtle}`,
        background: interestAfterTax ? DS.color.primarySoft : DS.color.bg.secondary,
        fontSize: 11,
        fontWeight: 600,
        whiteSpace: 'nowrap',
      }}
    >
      <Switch
        compact
        checked={interestAfterTax}
        onChange={setInterestAfterTax}
        label={<span style={{ fontSize: 11, fontWeight: 600 }}>세후 이자 <span style={{ fontWeight: 400 }}>(15.4% 차감)</span></span>}
      />
    </span>
  )
}
