import type { TyreCompound } from '@pitwall/contracts'
import { Platform } from 'react-native'

export const colors = {
  bg: '#0b0d12',
  surface: '#12151d',
  surfaceAlt: '#181c26',
  surfaceHover: '#1d2230',
  border: '#232838',
  borderStrong: '#30374a',
  text: '#f5f5f7',
  textMuted: '#9aa3b2',
  textDim: '#5d6577',
  accent: '#e10600',
  accentSoft: 'rgba(225, 6, 0, 0.14)',
  success: '#22c55e',
  successSoft: 'rgba(34, 197, 94, 0.14)',
  warning: '#f59e0b',
  warningSoft: 'rgba(245, 158, 11, 0.14)',
  danger: '#f43f5e',
  dangerSoft: 'rgba(244, 63, 94, 0.14)',
  purple: '#a855f7',
  purpleSoft: 'rgba(168, 85, 247, 0.16)',
  grid: '#1c2130',
} as const

export const compoundColors: Record<TyreCompound, string> = {
  SOFT: '#ff3b3b',
  MEDIUM: '#ffd12e',
  HARD: '#eceff4',
  INTERMEDIATE: '#43b02a',
  WET: '#2f80ed',
  UNKNOWN: '#6b7280',
}

export const space = { xs: 4, sm: 8, md: 12, lg: 16, xl: 24, xxl: 32, xxxl: 48 } as const
export const radius = { sm: 6, md: 10, lg: 16, pill: 999 } as const

export const fonts = {
  display: Platform.select({ web: '"Titillium Web", Inter, system-ui, sans-serif', default: undefined }),
  body: Platform.select({ web: 'Inter, system-ui, -apple-system, sans-serif', default: undefined }),
  mono: Platform.select({
    web: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
    ios: 'Menlo',
    default: 'monospace',
  }),
} as const

export const maxContentWidth = 1240

export function teamColor(hex: string | null | undefined): string {
  return hex ? `#${hex.replace('#', '')}` : colors.textDim
}
