import { CHIP_COLOR_PRESETS } from '@/components/PersonUI'

function hexToRgba(hex: string, alpha: number): string {
  const m = hex.match(/^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i)
  if (!m) return hex
  return `rgba(${parseInt(m[1], 16)}, ${parseInt(m[2], 16)}, ${parseInt(m[3], 16)}, ${alpha})`
}

function getVibrantFromPastel(pastel: string): string {
  const found = CHIP_COLOR_PRESETS.find((p) => p.pastel.toLowerCase() === pastel?.toLowerCase())
  return found?.vibrant ?? pastel
}

interface GroupHeaderChipProps {
  label: string
  total?: number
  color?: string
  /** 유저 칩 스타일: 파스텔 배경 + 비비드 텍스트/아웃라인 */
  useUserChipStyle?: boolean
  /** 그룹 합계 금액 색 (기본: 녹색) */
  totalColor?: string
}

export function GroupHeaderChip({ label, total, color, useUserChipStyle, totalColor }: GroupHeaderChipProps) {
  const fmt = (n: number) => n.toLocaleString('ko-KR')
  const isPastel = color && CHIP_COLOR_PRESETS.some((p) => p.pastel.toLowerCase() === color.toLowerCase())
  const chipBg =
    useUserChipStyle && isPastel
      ? color!
      : color
        ? color === '#111827'
          ? '#e5e7eb'
          : hexToRgba(color.startsWith('#') ? color : `#${color}`, 0.2)
        : '#e5e7eb'
  const chipColor = useUserChipStyle && isPastel ? getVibrantFromPastel(color!) : color ?? '#374151'

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          padding: '4px 10px',
          borderRadius: 999,
          fontSize: 12,
          fontWeight: 600,
          background: chipBg,
          color: chipColor,
          border: useUserChipStyle && isPastel ? `1.5px solid ${chipColor}` : undefined,
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
