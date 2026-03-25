import { useAppStore } from '@/store/useAppStore'
import type { Person } from '@/types'

const SHARED_COLOR = '#111827'

/** 6가지 유저 칩 프리셋: 파스텔 배경 + 명도·채도 높은 텍스트/아웃라인 */
export const CHIP_COLOR_PRESETS = [
  { pastel: '#FFADAD', vibrant: '#D80000' },
  { pastel: '#FFD6A5', vibrant: '#E85D04' },
  { pastel: '#FDFFB6', vibrant: '#CA6702' },
  { pastel: '#CAFFBF', vibrant: '#2D6A4F' },
  { pastel: '#9BF6FF', vibrant: '#0077B6' },
  { pastel: '#A0C4FF', vibrant: '#5C4D7D' },
] as const

function getVibrantFromPastel(pastel: string): string {
  const found = CHIP_COLOR_PRESETS.find((p) => p.pastel.toLowerCase() === pastel.toLowerCase())
  return found?.vibrant ?? pastel
}

/** 유저별 칩 색 - 파스텔 배경 + 비비드 텍스트/아웃라인 */
const DEFAULT_PASTEL_A = CHIP_COLOR_PRESETS[0].pastel
const DEFAULT_PASTEL_B = CHIP_COLOR_PRESETS[4].pastel

export function getPersonStyle(person: Person, settings?: { user1Color?: string; user2Color?: string }) {
  if (person === '공금') return { bg: '#e5e7eb', color: SHARED_COLOR }
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
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        height: 22,
        padding: '0 8px',
        borderRadius: 999,
        background: bg,
        color,
        border: `1.5px solid ${color}`,
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
        return (
          <button
            key={p}
            type="button"
            onClick={() => onChange(p)}
            style={{
              padding: compact ? '4px 10px' : '6px 16px',
              borderRadius: 999,
              border: '1.5px solid',
              borderColor: active ? color : '#e5e7eb',
              background: active ? bg : '#fff',
              color: active ? color : '#6b7280',
              fontSize: compact ? 11 : 13,
              fontWeight: 600,
              cursor: 'pointer',
              transition: 'all 0.15s',
              maxWidth: compact ? 72 : 130,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
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
