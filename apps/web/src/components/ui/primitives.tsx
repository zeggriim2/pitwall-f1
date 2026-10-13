import type { ReactNode } from 'react'
import { ActivityIndicator, StyleSheet, Text, type TextStyle, View, type ViewStyle } from 'react-native'
import { colors, fonts, radius, space } from '@/theme/tokens'
import { HoverPressable } from './HoverPressable'

export function Card({
  children,
  style,
  padded = true,
}: {
  children: ReactNode
  style?: ViewStyle
  padded?: boolean
}) {
  return <View style={[styles.card, padded && styles.cardPadded, style]}>{children}</View>
}

export function SectionTitle({
  title,
  subtitle,
  right,
}: {
  title: string
  subtitle?: string
  right?: ReactNode
}) {
  return (
    <View style={styles.sectionHeader}>
      <View style={{ flexShrink: 1 }}>
        <Text style={styles.sectionTitle}>{title}</Text>
        {subtitle ? <Text style={styles.sectionSubtitle}>{subtitle}</Text> : null}
      </View>
      {right}
    </View>
  )
}

export function Stat({
  label,
  value,
  hint,
  accent,
  style,
}: {
  label: string
  value: string
  hint?: string | undefined
  accent?: string | undefined
  style?: ViewStyle
}) {
  return (
    <View style={[styles.stat, style]}>
      <View style={[styles.statAccent, { backgroundColor: accent ?? colors.borderStrong }]} />
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue} numberOfLines={1} adjustsFontSizeToFit>
        {value}
      </Text>
      {hint ? (
        <Text style={styles.statHint} numberOfLines={2}>
          {hint}
        </Text>
      ) : null}
    </View>
  )
}

type Tone = 'neutral' | 'success' | 'warning' | 'danger' | 'accent' | 'purple'
const toneColors: Record<Tone, { bg: string; fg: string }> = {
  neutral: { bg: colors.surfaceAlt, fg: colors.textMuted },
  success: { bg: colors.successSoft, fg: colors.success },
  warning: { bg: colors.warningSoft, fg: colors.warning },
  danger: { bg: colors.dangerSoft, fg: colors.danger },
  accent: { bg: colors.accentSoft, fg: colors.accent },
  purple: { bg: colors.purpleSoft, fg: colors.purple },
}

export function Badge({ label, tone = 'neutral' }: { label: string; tone?: Tone }) {
  const palette = toneColors[tone]
  return (
    <View style={[styles.badge, { backgroundColor: palette.bg }]}>
      <Text style={[styles.badgeText, { color: palette.fg }]}>{label}</Text>
    </View>
  )
}

export function Chip({
  label,
  active,
  color,
  onPress,
}: {
  label: string
  active: boolean
  color?: string
  onPress: () => void
}) {
  return (
    <HoverPressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      style={[
        styles.chip,
        active && { borderColor: color ?? colors.accent, backgroundColor: colors.surfaceHover },
      ]}
      hoverStyle={active ? undefined : { backgroundColor: colors.surfaceAlt }}
    >
      {color ? <View style={[styles.chipDot, { backgroundColor: color }]} /> : null}
      <Text style={[styles.chipText, active && { color: colors.text }]}>{label}</Text>
    </HoverPressable>
  )
}

export function Button({
  label,
  onPress,
  loading,
  variant = 'primary',
}: {
  label: string
  onPress: () => void
  loading?: boolean
  variant?: 'primary' | 'ghost'
}) {
  return (
    <HoverPressable
      onPress={onPress}
      disabled={loading}
      accessibilityRole="button"
      style={[styles.button, variant === 'ghost' && styles.buttonGhost]}
      hoverStyle={{ opacity: 0.85 }}
    >
      {loading ? <ActivityIndicator color={colors.text} size="small" /> : null}
      <Text style={styles.buttonText}>{label}</Text>
    </HoverPressable>
  )
}

export function LoadingState({ label = 'Chargement…' }: { label?: string }) {
  return (
    <View style={styles.state}>
      <ActivityIndicator color={colors.accent} />
      <Text style={styles.stateText}>{label}</Text>
    </View>
  )
}

export function ErrorState({ error, action }: { error: unknown; action?: ReactNode }) {
  const message = error instanceof Error ? error.message : 'Erreur inattendue'
  return (
    <Card style={styles.state}>
      <Text style={styles.stateTitle}>Impossible d’afficher ces données</Text>
      <Text style={styles.stateText}>{message}</Text>
      {action}
    </Card>
  )
}

export function Mono({ children, style }: { children: ReactNode; style?: TextStyle | TextStyle[] }) {
  return <Text style={[styles.mono, style]}>{children}</Text>
}

export const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardPadded: { padding: space.xl },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    gap: space.md,
    marginBottom: space.lg,
    flexWrap: 'wrap',
  },
  sectionTitle: {
    color: colors.text,
    fontFamily: fonts.display,
    fontSize: 20,
    fontWeight: '700',
    letterSpacing: 0.2,
  },
  sectionSubtitle: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, marginTop: 4 },
  stat: {
    flexGrow: 1,
    flexBasis: 140,
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space.lg,
    paddingLeft: space.lg + 4,
    overflow: 'hidden',
  },
  statAccent: { position: 'absolute', left: 0, top: 0, bottom: 0, width: 3 },
  statLabel: {
    color: colors.textMuted,
    fontFamily: fonts.body,
    fontSize: 11,
    textTransform: 'uppercase',
    letterSpacing: 1.2,
    fontWeight: '600',
  },
  statValue: { color: colors.text, fontFamily: fonts.mono, fontSize: 24, fontWeight: '600', marginTop: 6 },
  statHint: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12, marginTop: 4 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: radius.pill, alignSelf: 'flex-start' },
  badgeText: {
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.6,
    textTransform: 'uppercase',
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
  },
  chipDot: { width: 8, height: 8, borderRadius: 4 },
  chipText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13, fontWeight: '600' },
  button: {
    flexDirection: 'row',
    gap: space.sm,
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: colors.accent,
    paddingHorizontal: space.xl,
    paddingVertical: space.md,
    borderRadius: radius.md,
  },
  buttonGhost: { backgroundColor: 'transparent', borderWidth: 1, borderColor: colors.borderStrong },
  buttonText: { color: colors.text, fontFamily: fonts.body, fontWeight: '700', fontSize: 14 },
  state: { alignItems: 'center', justifyContent: 'center', gap: space.md, padding: space.xxl },
  stateTitle: { color: colors.text, fontFamily: fonts.display, fontSize: 18, fontWeight: '700' },
  stateText: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14, textAlign: 'center' },
  mono: { fontFamily: fonts.mono, color: colors.text },
})
