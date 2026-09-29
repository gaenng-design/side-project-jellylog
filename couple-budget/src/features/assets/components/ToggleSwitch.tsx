import { PRIMARY } from '@/styles/formControls'
import { DS } from '@/design-system/tokens'

export const ToggleSwitch = ({
  checked,
  onChange,
  onLabel = '🔒 만기까지 묶인 자산',
  offLabel = '해제',
}: {
  checked: boolean
  onChange: (v: boolean) => void
  onLabel?: string
  offLabel?: string
}) => (
  <div
    onClick={() => onChange(!checked)}
    style={{
      display: 'inline-flex', alignItems: 'center', cursor: 'pointer',
      gap: 8, userSelect: 'none',
    }}
  >
    <div style={{
      position: 'relative', width: 44, height: 24,
      borderRadius: 12,
      background: checked ? PRIMARY : DS.color.border.default,
      transition: 'background 0.2s',
      flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 2,
        left: checked ? 22 : 2,
        width: 20, height: 20,
        borderRadius: '50%',
        background: DS.color.bg.secondary,
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
        transition: 'left 0.2s',
      }} />
    </div>
    <span style={{ fontSize: 13, color: checked ? PRIMARY : DS.color.text.muted }}>
      {checked ? onLabel : offLabel}
    </span>
  </div>
)
