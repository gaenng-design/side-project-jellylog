import { PRIMARY } from '@/styles/formControls'
import type { AssetModel } from '../useAssetModel'

/** 세후 이자 표시 토글 — 켜면 모든 예·적금 이자에서 이자소득세 15.4%를 뺀 금액을 보여준다 */
export function AfterTaxToggle({ model }: { model: AssetModel }) {
  const { interestAfterTax, setInterestAfterTax } = model
  return (
    <button
      type="button"
      role="switch"
      aria-checked={interestAfterTax}
      onClick={() => setInterestAfterTax(!interestAfterTax)}
      title="예·적금 이자에서 이자소득세 15.4%를 뺀 금액으로 표시"
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 6,
        padding: '4px 10px 4px 4px',
        borderRadius: 999,
        border: `1px solid ${interestAfterTax ? PRIMARY : '#e5e7eb'}`,
        background: interestAfterTax ? 'rgba(79, 140, 255, 0.08)' : '#fff',
        cursor: 'pointer',
        fontFamily: 'inherit',
        fontSize: 11,
        fontWeight: 600,
        color: interestAfterTax ? PRIMARY : '#6b7280',
        whiteSpace: 'nowrap',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'relative',
          width: 26,
          height: 16,
          borderRadius: 8,
          background: interestAfterTax ? PRIMARY : '#d1d5db',
          transition: 'background 0.2s',
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: 2,
            left: interestAfterTax ? 12 : 2,
            width: 12,
            height: 12,
            borderRadius: '50%',
            background: '#fff',
            transition: 'left 0.2s',
          }}
        />
      </span>
      세후 이자 <span style={{ fontWeight: 400 }}>(15.4% 차감)</span>
    </button>
  )
}
