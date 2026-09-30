import { DS } from '../tokens'

/** 공용 스위치 — 항상 role="switch" 로 노출. 기본 크기 44×24, compact 는 26×16 */
export function Switch({
  checked,
  onChange,
  compact,
  label,
  ariaLabel,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  compact?: boolean
  /** 스위치 오른쪽에 붙는 문구 */
  label?: React.ReactNode
  ariaLabel?: string
}) {
  const w = compact ? 26 : 44
  const h = compact ? 16 : 24
  const knob = compact ? 12 : 20
  const pad = compact ? 2 : 2
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={() => onChange(!checked)}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 8,
        padding: 0,
        border: 'none',
        background: 'transparent',
        cursor: 'pointer',
        fontFamily: 'inherit',
        userSelect: 'none',
      }}
    >
      <span
        aria-hidden
        style={{
          position: 'relative',
          width: w,
          height: h,
          borderRadius: h / 2,
          background: checked ? DS.color.primary : DS.color.border.default,
          transition: `background ${DS.motion.duration}ms ${DS.motion.easing}`,
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: 'absolute',
            top: pad,
            left: checked ? w - knob - pad : pad,
            width: knob,
            height: knob,
            borderRadius: '50%',
            background: DS.color.bg.secondary,
            boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
            transition: `left ${DS.motion.duration}ms ${DS.motion.easing}`,
          }}
        />
      </span>
      {label != null && (
        <span style={{ fontSize: DS.font.size.body, color: checked ? DS.color.primaryDark : DS.color.text.muted }}>{label}</span>
      )}
    </button>
  )
}
