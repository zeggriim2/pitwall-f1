import type { DriverRaceSummary, Id } from '@pitwall/contracts'
import { Link } from 'expo-router'
import { StyleSheet, Text, View } from 'react-native'
import { HoverPressable } from '@/components/ui/HoverPressable'
import { delta, lapTime } from '@/lib/format'
import { colors, fonts, teamColor } from '@/theme/tokens'

/** Race-pace ranking: bar length = median pace delta to the fastest driver. */
export function PaceBars({ drivers, raceId }: { drivers: DriverRaceSummary[]; raceId: Id }) {
  const ranked = drivers
    .filter((d) => d.paceRank !== null && d.paceDeltaToBest !== null)
    .sort((a, b) => (a.paceRank ?? 0) - (b.paceRank ?? 0))
  const worst = Math.max(0.5, ...ranked.map((d) => d.paceDeltaToBest ?? 0))

  return (
    <View style={styles.list}>
      {ranked.map((d) => {
        const ratio = (d.paceDeltaToBest ?? 0) / worst
        return (
          <Link
            key={d.driver.driverNumber}
            href={`/races/${raceId}/drivers/${d.driver.driverNumber}`}
            asChild
          >
            <HoverPressable style={styles.row} hoverStyle={styles.rowHover}>
              <Text style={styles.rank}>{d.paceRank}</Text>
              <Text style={styles.acronym}>{d.driver.acronym}</Text>
              <View style={styles.track}>
                <View
                  style={[
                    styles.bar,
                    {
                      width: `${Math.max(2, (1 - ratio * 0.85) * 100)}%`,
                      backgroundColor: teamColor(d.driver.teamColour),
                    },
                  ]}
                />
              </View>
              <Text style={styles.value}>
                {d.paceRank === 1 ? lapTime(d.pace.medianPace) : delta(d.paceDeltaToBest)}
              </Text>
            </HoverPressable>
          </Link>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  list: { gap: 2 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 6,
  },
  rowHover: { backgroundColor: colors.surfaceAlt },
  rank: { width: 20, color: colors.textDim, fontFamily: fonts.mono, fontSize: 12, textAlign: 'right' },
  acronym: { width: 38, color: colors.text, fontFamily: fonts.mono, fontSize: 13, fontWeight: '700' },
  track: { flex: 1, height: 10, backgroundColor: colors.surfaceAlt, borderRadius: 5, overflow: 'hidden' },
  bar: { height: '100%', borderRadius: 5 },
  value: { width: 72, color: colors.textMuted, fontFamily: fonts.mono, fontSize: 12, textAlign: 'right' },
})
