import { useAppStore } from '@/store/useAppStore'
import { JELLY } from '@/styles/jellyGlass'
import { SUB_HUES, subOklch } from '@/styles/oklchSubColors'
import type { Person } from '@/types'

/** 공금 칩: 낮은 채도의 은은한 서피스 */
const SHARED_CHIP_BG = 'oklch(0.9 0.018 250 / 1)'

/**
 * 유저 칩 프리셋 — 배경 OKLCH(L 0.7044, C 0.1047), 라벨은 흰색(+그림자로 대비)
 */
export const CHIP_COLOR_PRESETS = SUB_HUES.map((hue) => ({
  pastel: subOklch(hue),
  vibrant: '#ffffff',
})) as readonly { pastel: string; vibrant: string }[]

export function isChipPresetPastel(color: string | undefined): boolean {
  if (!color) return false
  return CHIP_COLOR_PRESETS.some(
    (p) => p.pastel === color || p.pastel.toLowerCase() === color.trim().toLowerCase(),
  )
}

function getVibrantFromPastel(pastel: string): string {
  const found = CHIP_COLOR_PRESETS.find(
    (p) => p.pastel.toLowerCase() === pastel.trim().toLowerCase(),
  )
  return found?.vibrant ?? '#ffffff'
}

const DEFAULT_PASTEL_A = CHIP_COLOR_PRESETS[0].pastel
const DEFAULT_PASTEL_B = CHIP_COLOR_PRESETS[1].pastel

export function getPersonStyle(person: Person, settings?: { user1Color?: string; user2Color?: string }) {
  if (person === '공금') return { bg: SHARED_CHIP_BG, color: JELLY.text }
  const pastel =
    person === 'A'
      ? (settings?.user1Color ?? DEFAULT_PASTEL_A)
      : (settings?.user2Color ?? DEFAULT_PASTEL_B)
  const vibrant = getVibrantFromPastel(pastel)
  return { bg: pastel, color: vibrant }
}

export function usePersonLabel(person: Person) {
  const { personAName, personBName } = useAppStore((s) => s.settings)
  if (person === 'A') return personAName
  if (person === 'B') return personBName
  return '공금'
}

export function PersonBadge({ person }: { person: Person }) {
  const label = usePersonLabel(person)
  const settings = useAppStore((s) => s.settings)
  const { bg, color } = getPersonStyle(person, settings)
  const userTinted = person !== '공금'
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 22,
        padding: '0 10px',
        borderRadius: JELLY.radiusUserChip,
        background: bg,
        color,
        border: `1px solid rgba(255,255,255,0.55)`,
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.65)',
        textShadow: userTinted ? '0 1px 2px rgba(15, 23, 42, 0.45)' : undefined,
        fontSize: 11,
        fontWeight: 700,
        whiteSpace: 'nowrap',
        flexShrink: 0,
        maxWidth: 80,
        overflow: 'hidden',
        textOverflow: 'ellipsis',
      }}
      title={label}
    >
      {label}
    </span>
  )
}

export function PersonToggle({
  value,
  onChange,
  options = ['A', 'B', '공금'],
  compact,
}: {
  value: Person
  onChange: (p: Person) => void
  options?: Person[]
  compact?: boolean
}) {
  const { personAName, personBName, ...colorSettings } = useAppStore((s) => s.settings)
  const labels: Record<Person, string> = { A: personAName, B: personBName, 공금: '공금' }
  return (
    <div style={{ display: 'flex', gap: compact ? 6 : 8, flexWrap: 'wrap' }}>
      {options.map((p) => {
        const { bg, color } = getPersonStyle(p, colorSettings)
        const active = value === p
        const userTinted = p !== '공금'
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            style={{
              padding: compact ? '5px 12px' : '7px 16px',
              borderRadius: JELLY.radiusUserChip,
              border: active ? `1px solid rgba(255,255,255,0.65)` : JELLY.innerBorderSoft,
              background: active ? bg : 'rgba(255,255,255,0.32)',
              backdropFilter: active ? JELLY.blur : JELLY.blur,
              WebkitBackdropFilter: JELLY.blur,
              color: active ? color : JELLY.textMuted,
              textShadow: active && userTinted ? '0 1px 2px rgba(15, 23, 42, 0.4)' : undefined,
              fontSize: compact ? 11 : 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.18s ease',
              maxWidth: compact ? 72 : 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              boxShadow: active ? '0 4px 16px rgba(15, 23, 42, 0.08), inset 0 1px 0 rgba(255,255,255,0.5)' : 'none',
            }}
            title={labels[p]}
          >
            {labels[p]}
          </button>
        )
      })}
    </div>
  )
}
