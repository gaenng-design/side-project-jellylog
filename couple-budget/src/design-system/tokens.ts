/**
 * Fintech UI design tokens — soft minimal, shadow hierarchy, 8pt scale.
 */
import type { CSSProperties } from 'react'

export const DS = {
  color: {
    bg: {
      primary: '#F5F7FA',
      secondary: '#FFFFFF',
      tertiary: '#F0F2F5',
    },
    text: {
      primary: '#1A1D1F',
      secondary: '#6B7280',
      disabled: '#A0A4A8',
    },
    primary: '#4F8CFF',
    primarySoft: '#EAF2FF',
    success: '#22C55E',
    warning: '#F59E0B',
    error: '#EF4444',
    info: '#3B82F6',
    gradient: 'linear-gradient(135deg, #4F8CFF 0%, #6EA8FF 100%)',
  },
  font: {
    family: `'Inter', 'Pretendard', 'Apple SD Gothic Neo', 'Noto Sans KR', system-ui, sans-serif`,
    title1: { size: 24, weight: 700 as const, lineHeight: 1.25 },
    title2: { size: 20, weight: 600 as const, lineHeight: 1.3 },
    body: { size: 14, weight: 400 as const, lineHeight: 1.5 },
    caption: { size: 12, weight: 500 as const, lineHeight: 1.45 },
  },
  space: [4, 8, 12, 16, 20, 24, 32, 40, 48, 64] as const,
  grid: {
    columns: 12,
    gutter: 24,
    margin: 32,
    maxWidth: 1440,
  },
  radius: {
    card: 16,
    button: 12,
    chip: 999,
  },
  shadow: {
    1: '0 2px 8px rgba(0,0,0,0.04)',
    2: '0 8px 20px rgba(0,0,0,0.06)',
    3: '0 16px 40px rgba(0,0,0,0.08)',
  },
  motion: {
    duration: 150,
    easing: 'ease-in-out' as const,
  },
  sidebar: {
    width: 80,
  },
  row: {
    transactionHeight: 64,
  },
  button: {
    height: 40,
  },
} as const

export const tabularNums: CSSProperties = { fontVariantNumeric: 'tabular-nums' }
