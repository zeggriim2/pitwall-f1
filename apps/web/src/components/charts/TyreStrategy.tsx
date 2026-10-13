import type { StintAnalysis } from '@pitwall/contracts'
import { StyleSheet, Text, View } from 'react-native'
import { colors, compoundColors, fonts, radius } from '@/theme/tokens'

const SHORT: Record<string, string> = {
  SOFT: 'S',
  MEDIUM: 'M',
  HARD: 'H',
  INTERMEDIATE: 'I',
  WET: 'W',
  UNKNOWN: '?',
}

/** Horizontal strategy bar: one segment per stint, proportional to its length. */
export function TyreStrategy({
  stints,
  totalLaps,
  compact = false,
}: {
  stints: StintAnalysis[]
  totalLaps: number
  compact?: boolean
}) {
  if (stints.length === 0) return <Text style={styles.empty}>Stratégie inconnue</Text>
  return (
    <View style={[styles.track, compact && styles.trackCompact]}>
      {stints.map((stint) => {
        const color = compoundColors[stint.compound]
        return (
          <View
            key={stint.stintNumber}
            style={[
              styles.segment,
              { flexGrow: stint.laps, backgroundColor: `${color}26`, borderColor: color },
            ]}
          >
            <View style={[styles.dot, { backgroundColor: color }]}>
              <Text style={styles.dotText}>{SHORT[stint.compound]}</Text>
            </View>
            {!compact ? (
              <Text style={styles.label} numberOfLines={1}>
                {stint.laps} tours
              </Text>
            ) : null}
          </View>
        )
      })}
      {/* Unused laps (retirement) */}
      {(() => {
        const last = Math.max(...stints.map((s) => s.lapEnd))
        return last < totalLaps ? <View style={{ flexGrow: totalLaps - last }} /> : null
      })()}
    </View>
  )
}

const styles = StyleSheet.create({
  track: { flexDirection: 'row', gap: 3, height: 34 },
  trackCompact: { height: 18 },
  segment: {
    flexBasis: 0,
    borderWidth: 1,
    borderRadius: radius.sm,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  dot: { width: 16, height: 16, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },
  dotText: { color: colors.bg, fontSize: 9, fontWeight: '800', fontFamily: fonts.body },
  label: { color: colors.textMuted, fontSize: 12, fontFamily: fonts.body },
  empty: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
})
