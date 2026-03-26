import { CHIP_COLOR_PRESETS, isChipPresetPastel } from '@/components/PersonUI'
import { JELLY } from '@/styles/jellyGlass'

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}

function getVibrantFromPastel(pastel: string): string {
  const found = CHIP_COLOR_PRESETS.find((p) => p.pastel.toLowerCase() === pastel?.trim().toLowerCase())
  return found?.vibrant ?? '#ffffff'
}

interface GroupHeaderChipProps {
  label: string
  total?: number
  color?: string
  /** 유저 칩 스타일: 서브 OKLCH 배경 + 흰색 텍스트 */
  useUserChipStyle?: boolean
  /** 그룹 합계 금액 색 (기본: 녹색) */
  totalColor?: string
}

export function GroupHeaderChip({ label, total, color, useUserChipStyle, totalColor }: GroupHeaderChipProps) {
  const fmt = (n: number) => n.toLocaleString('ko-KR')
  const isPastel = color && isChipPresetPastel(color)
  const chipBg =
    useUserChipStyle && isPastel
      ? color!
      : color
        ? color === '#111827'
          ? 'oklch(0.9 0.018 250 / 1)'
          : color.startsWith('oklch(')
            ? color
            : hexToRgba(color.startsWith('#') ? color : `#${color.replace(/^#/, '')}`, 0.22)
        : 'oklch(0.9 0.018 250 / 1)'
  const chipColor = useUserChipStyle && isPastel ? getVibrantFromPastel(color!) : color ?? JELLY.text

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '5px 12px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          background: chipBg,
          color: chipColor,
          border: useUserChipStyle && isPastel ? `1px solid rgba(255,255,255,0.55)` : undefined,
          boxShadow: useUserChipStyle && isPastel ? 'inset 0 1px 0 rgba(255,255,255,0.55)' : undefined,
          textShadow: useUserChipStyle && isPastel ? '0 1px 2px rgba(15, 23, 42, 0.45)' : undefined,
        }}
      >
        {label}
      </span>
      {total != null && total > 0 && (
        <span style={{ color: totalColor ?? '#059669', fontWeight: 700, fontSize: 13 }}>₩{fmt(total)}</span>
      )}
    </div>
  )
}
