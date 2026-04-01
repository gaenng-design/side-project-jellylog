import { DS } from '../tokens'

/** Minimal donut (conic-gradient), rounded feel, ≤3 colors */
export function SpendingDonut(props: {
  segments: { pct: number; color: string }[]
  size?: number
  thickness?: number
}) {
  const { segments, size = 168, thickness = 16 } = props
  const valid = segments.filter((s) => s.pct > 0)
  const total = valid.reduce((a, s) => a + s.pct, 0) || 1
  let acc = 0
  const parts: string[] = []
  for (const s of valid) {
    const start = (acc / total) * 360
    acc += s.pct
    const end = (acc / total) * 360
    parts.push(`${s.color} ${start}deg ${end}deg`)
  }
  if (parts.length === 0) parts.push(`${DS.color.bg.tertiary} 0deg 360deg`)
  const conic = `conic-gradient(${parts.join(', ')})`

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: conic,
        boxShadow: DS.shadow[1],
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          inset: thickness,
          borderRadius: '50%',
          background: DS.color.bg.secondary,
          boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
        }}
      />
      {/* subtle outer ring gloss */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          borderRadius: '50%',
          pointerEvents: 'none',
          boxShadow: 'inset 0 0 0 1px rgba(255,255,255,0.5)',
        }}
      />
    </div>
  )
}

export const chartColors = {
  primary: DS.color.primary,
  soft: '#94B8FF',
  muted: DS.color.bg.tertiary,
}
