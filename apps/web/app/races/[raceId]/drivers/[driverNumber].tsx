import type { DriverAnalysis, DriverComparison, LapPoint } from '@pitwall/contracts'
import { useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useComparison, useDriverAnalysis, useRaceOverview } from '@/api/hooks'
import { type ChartSeries, LineChart } from '@/components/charts/LineChart'
import { TyreStrategy } from '@/components/charts/TyreStrategy'
import {
  Badge,
  Card,
  Chip,
  ErrorState,
  LoadingState,
  Mono,
  SectionTitle,
  Stat,
} from '@/components/ui/primitives'
import { Screen } from '@/components/ui/Screen'
import { delta, lapTime, seconds, signed } from '@/lib/format'
import { colors, compoundColors, fonts, radius, space, teamColor } from '@/theme/tokens'

export default function DriverScreen() {
  const params = useLocalSearchParams<{ raceId: string; driverNumber: string }>()
  const raceId = params.raceId
  const driverNumber = Number(params.driverNumber)
  const analysis = useDriverAnalysis(raceId, driverNumber)

  return (
    <Screen
      crumbs={[
        { label: analysis.data ? String(analysis.data.race.year) : 'Saison', href: '/' },
        { label: analysis.data?.race.name ?? 'Course', href: `/races/${raceId}` },
        { label: analysis.data?.summary.driver.acronym ?? `#${driverNumber}` },
      ]}
    >
      {analysis.isPending ? <LoadingState label="Analyse du pilote…" /> : null}
      {analysis.error ? <ErrorState error={analysis.error} /> : null}
      {analysis.data ? <DriverContent key={driverNumber} data={analysis.data} /> : null}
    </Screen>
  )
}

function DriverContent({ data }: { data: DriverAnalysis }) {
  const { width } = useWindowDimensions()
  const wide = width >= 980
  const { summary, race } = data
  const driver = summary.driver
  const color = teamColor(driver.teamColour)
  const overview = useRaceOverview(race.id)
  const [rival, setRival] = useState<number | null>(data.teammate?.driverNumber ?? null)
  const comparison = useComparison(race.id, driver.driverNumber, rival)
  const totalLaps = overview.data?.totalLaps ?? Math.max(...data.laps.map((l) => l.lap), 0)

  const vsField =
    summary.pace.medianPace !== null && data.fieldMedianPace !== null
      ? summary.pace.medianPace - data.fieldMedianPace
      : null

  return (
    <>
      <View style={[styles.hero, { borderColor: color }]}>
        <View style={[styles.heroGlow, { backgroundColor: color }]} />
        {driver.headshotUrl ? <Image source={{ uri: driver.headshotUrl }} style={styles.headshot} /> : null}
        <View style={{ flex: 1, gap: 4 }}>
          <Text style={[styles.number, { color }]}>#{driver.driverNumber}</Text>
          <Text style={styles.name}>{driver.fullName}</Text>
          <Text style={styles.team}>
            {driver.teamName} · {race.name}
          </Text>
          <View style={{ flexDirection: 'row', gap: space.sm, marginTop: space.sm, flexWrap: 'wrap' }}>
            <Badge
              label={
                summary.result.position ? `P${summary.result.position}` : summary.result.status.toUpperCase()
              }
              tone={
                summary.result.position === 1
                  ? 'accent'
                  : summary.result.status === 'finished'
                    ? 'neutral'
                    : 'danger'
              }
            />
            {summary.paceRank ? <Badge label={`Rythme #${summary.paceRank}`} tone="purple" /> : null}
            {summary.result.points > 0 ? (
              <Badge label={`${summary.result.points} pts`} tone="success" />
            ) : null}
          </View>
        </View>
      </View>

      <View style={styles.stats}>
        <Stat
          label="Arrivée"
          value={
            summary.result.position ? `P${summary.result.position}` : summary.result.status.toUpperCase()
          }
          hint={`Grille P${summary.result.grid ?? '—'} · ${signed(summary.result.positionsGained)} places`}
          accent={color}
        />
        <Stat
          label="Meilleur tour"
          value={lapTime(summary.pace.bestLap)}
          hint={summary.pace.bestLapNumber ? `Tour ${summary.pace.bestLapNumber}` : undefined}
          accent={colors.purple}
        />
        <Stat
          label="Rythme médian"
          value={lapTime(summary.pace.medianPace)}
          hint={vsField !== null ? `${delta(vsField)} vs médiane du plateau` : undefined}
          accent={vsField !== null && vsField < 0 ? colors.success : colors.warning}
        />
        <Stat
          label="Régularité σ"
          value={seconds(summary.pace.consistency, 3)}
          hint={`${summary.pace.cleanLaps} tours représentatifs`}
        />
        <Stat
          label="Tour théorique"
          value={lapTime(summary.pace.theoreticalBest)}
          hint="Somme des meilleurs secteurs"
        />
        <Stat
          label="Vitesse de pointe"
          value={summary.pace.topSpeed ? `${summary.pace.topSpeed} km/h` : '—'}
          hint="Speed trap"
        />
      </View>

      <Card>
        <SectionTitle
          title="Temps au tour"
          subtitle="Points pleins : tours représentatifs (couleur = gomme). Creux : tour 1, stands, neutralisations."
          right={
            <RivalPicker
              data={data}
              overviewDrivers={overview.data?.drivers ?? []}
              rival={rival}
              onChange={setRival}
            />
          }
        />
        <LapTimeChart data={data} comparison={comparison.data ?? null} />
      </Card>

      <View style={[styles.columns, wide && styles.columnsWide]}>
        <Card style={wide ? { flex: 1 } : undefined}>
          <SectionTitle
            title={comparison.data ? `Écart cumulé vs ${comparison.data.b.acronym}` : 'Écart cumulé'}
            subtitle="Sous zéro : devant le rival. Mesuré au passage sur la ligne."
          />
          {comparison.data ? (
            <GapChart comparison={comparison.data} />
          ) : (
            <Text style={styles.muted}>Choisissez un rival pour comparer.</Text>
          )}
        </Card>
        <Card style={wide ? { flex: 1 } : undefined}>
          <SectionTitle title="Duel tour par tour" subtitle="Sur les tours représentatifs des deux pilotes" />
          {comparison.data ? (
            <DuelSummary comparison={comparison.data} />
          ) : (
            <Text style={styles.muted}>—</Text>
          )}
        </Card>
      </View>

      <Card>
        <SectionTitle
          title="Stratégie & dégradation des pneus"
          subtitle="Pente du temps au tour en fonction de l’âge du pneu, corrigée de l’effet carburant"
        />
        <TyreStrategy stints={data.stints} totalLaps={totalLaps} />
        <ScrollView horizontal contentContainerStyle={{ flexGrow: 1 }} style={{ marginTop: space.lg }}>
          <View style={{ flex: 1, minWidth: 620 }}>
            <View style={[styles.tr, styles.thead]}>
              {[
                'RELAIS',
                'GOMME',
                'TOURS',
                'ÂGE INITIAL',
                'RYTHME MOYEN',
                'DÉGRAD. BRUTE',
                'DÉGRAD. CORRIGÉE',
              ].map((h) => (
                <Text key={h} style={[styles.th, { flex: 1 }]}>
                  {h}
                </Text>
              ))}
            </View>
            {data.stints.map((stint) => (
              <View key={stint.stintNumber} style={styles.tr}>
                <Mono style={[styles.td, { flex: 1 }]}>#{stint.stintNumber}</Mono>
                <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                  <View style={[styles.dot, { backgroundColor: compoundColors[stint.compound] }]} />
                  <Text style={styles.td}>{stint.compound}</Text>
                </View>
                <Mono
                  style={[styles.td, { flex: 1 }]}
                >{`T${stint.lapStart}–${stint.lapEnd} (${stint.laps})`}</Mono>
                <Mono style={[styles.td, { flex: 1 }]}>{stint.tyreAgeAtStart}</Mono>
                <Mono style={[styles.td, { flex: 1 }]}>{lapTime(stint.averagePace)}</Mono>
                <Mono style={[styles.td, { flex: 1 }]}>{degradation(stint.degradation)}</Mono>
                <Mono style={[styles.td, { flex: 1, color: degColor(stint.fuelCorrectedDegradation) }]}>
                  {degradation(stint.fuelCorrectedDegradation)}
                </Mono>
              </View>
            ))}
          </View>
        </ScrollView>
      </Card>

      <View style={[styles.columns, wide && styles.columnsWide]}>
        <Card style={wide ? { flex: 1 } : undefined}>
          <SectionTitle title="Arrêts aux stands" subtitle="Temps passé dans la voie des stands" />
          {data.pitStops.length === 0 ? <Text style={styles.muted}>Aucun arrêt</Text> : null}
          {data.pitStops.map((stop, index) => (
            <View key={stop.lap} style={styles.pitRow}>
              <Text style={styles.pitIndex}>{index + 1}</Text>
              <Text style={styles.td}>Tour {stop.lap}</Text>
              <View style={{ flex: 1 }} />
              {stop.stopDuration !== null ? (
                <Mono style={styles.pitValue}>{`arrêt ${seconds(stop.stopDuration, 1)}`}</Mono>
              ) : null}
              <Mono style={styles.pitValue}>{`voie ${seconds(stop.laneDuration, 1)}`}</Mono>
            </View>
          ))}
        </Card>
        <Card style={wide ? { flex: 1 } : undefined}>
          <SectionTitle title="Meilleurs secteurs" subtitle="Base du tour théorique" />
          <View style={styles.sectors}>
            {(['S1', 'S2', 'S3'] as const).map((label, index) => (
              <View key={label} style={styles.sector}>
                <Text style={styles.sectorLabel}>{label}</Text>
                <Mono style={styles.sectorValue}>{lapTime(data.bestSectors[index])}</Mono>
              </View>
            ))}
          </View>
        </Card>
      </View>
    </>
  )
}

function RivalPicker({
  data,
  overviewDrivers,
  rival,
  onChange,
}: {
  data: DriverAnalysis
  overviewDrivers: { driver: DriverAnalysis['summary']['driver'] }[]
  rival: number | null
  onChange: (n: number | null) => void
}) {
  const others = overviewDrivers.filter((d) => d.driver.driverNumber !== data.summary.driver.driverNumber)
  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      style={{ maxWidth: '100%' }}
      contentContainerStyle={{ gap: 6 }}
    >
      {others.map((d) => (
        <Chip
          key={d.driver.driverNumber}
          label={d.driver.acronym}
          color={teamColor(d.driver.teamColour)}
          active={rival === d.driver.driverNumber}
          onPress={() => onChange(rival === d.driver.driverNumber ? null : d.driver.driverNumber)}
        />
      ))}
    </ScrollView>
  )
}

function LapTimeChart({ data, comparison }: { data: DriverAnalysis; comparison: DriverComparison | null }) {
  const color = teamColor(data.summary.driver.teamColour)
  const byLap = useMemo(() => new Map(data.laps.map((l) => [l.lap, l])), [data.laps])

  // Focus the axis on racing laps: pit and SC laps would flatten everything else.
  const domain = useMemo((): [number, number] | undefined => {
    const clean = data.laps.filter((l) => l.isRepresentative && l.time !== null).map((l) => l.time as number)
    if (clean.length < 3) return undefined
    const sorted = [...clean].sort((a, b) => a - b)
    const min = sorted[0] as number
    const p95 = sorted[Math.floor(sorted.length * 0.95)] as number
    return [min - 0.6, p95 + 2.2]
  }, [data.laps])

  const series: ChartSeries[] = []
  if (comparison) {
    series.push({
      id: 'rival',
      color: teamColor(comparison.b.teamColour),
      dashed: comparison.b.teamName === data.summary.driver.teamName,
      opacity: 0.75,
      points: comparison.laps.map((l) => ({ x: l.lap, y: l.b })),
    })
  }
  series.push({
    id: 'driver',
    color,
    strokeWidth: 2.4,
    points: data.laps.map((l) => ({ x: l.lap, y: l.time })),
    markers: data.laps
      .filter((l): l is LapPoint & { time: number } => l.time !== null)
      .map((l) => ({ x: l.lap, y: l.time, color: compoundColors[l.compound], hollow: !l.isRepresentative })),
  })

  const pitBands = data.laps
    .filter((l) => l.isPitInLap || l.isPitOutLap)
    .map((l) => ({ from: l.lap, to: l.lap, color: 'rgba(255,255,255,0.04)' }))

  return (
    <LineChart
      height={340}
      series={series}
      yDomain={domain}
      bands={pitBands}
      yFormat={(v) => lapTime(v)}
      xFormat={(v) => `T${v}`}
      renderInspector={(lap) => {
        const point = byLap.get(lap)
        const rival = comparison?.laps.find((l) => l.lap === lap)
        return (
          <>
            <Text style={styles.inspectorStrong}>Tour {lap}</Text>
            <Text style={[styles.inspector, { color }]}>
              {data.summary.driver.acronym} {lapTime(point?.time)}
            </Text>
            {point ? (
              <Text style={styles.inspector}>
                {point.compound} · {point.tyreAge ?? '?'} t. · P{point.position ?? '?'}
                {point.isPitInLap ? ' · entrée stands' : point.isPitOutLap ? ' · sortie stands' : ''}
              </Text>
            ) : null}
            {rival && comparison ? (
              <Text style={styles.inspector}>
                {comparison.b.acronym} {lapTime(rival.b)} ({delta(rival.delta)})
              </Text>
            ) : null}
          </>
        )
      }}
    />
  )
}

function GapChart({ comparison }: { comparison: DriverComparison }) {
  return (
    <LineChart
      height={240}
      baseline={0}
      series={[
        {
          id: 'gap',
          color: teamColor(comparison.a.teamColour),
          strokeWidth: 2.4,
          points: comparison.laps.map((l) => ({ x: l.lap, y: l.gap })),
        },
      ]}
      yFormat={(v) => `${v > 0 ? '+' : ''}${v.toFixed(0)}s`}
      xFormat={(v) => `T${v}`}
      renderInspector={(lap) => {
        const row = comparison.laps.find((l) => l.lap === lap)
        return (
          <Text style={styles.inspector}>
            Tour {lap} · écart {row?.gap === null || row?.gap === undefined ? '—' : `${delta(row.gap)} s`}
          </Text>
        )
      }}
    />
  )
}

function DuelSummary({ comparison }: { comparison: DriverComparison }) {
  const { aFasterLaps, bFasterLaps, medianDelta } = comparison.summary
  const total = Math.max(1, aFasterLaps + bFasterLaps)
  const colorA = teamColor(comparison.a.teamColour)
  const colorB = teamColor(comparison.b.teamColour)
  const sameTeam = colorA === colorB
  return (
    <View style={{ gap: space.lg }}>
      <View style={styles.duelNames}>
        <Text style={[styles.duelName, { color: colorA }]}>{comparison.a.acronym}</Text>
        <Text style={[styles.duelName, { color: sameTeam ? colors.textMuted : colorB }]}>
          {comparison.b.acronym}
        </Text>
      </View>
      <View style={styles.duelBar}>
        <View style={{ flex: aFasterLaps, backgroundColor: colorA }} />
        <View style={{ flex: bFasterLaps, backgroundColor: sameTeam ? colors.textDim : colorB }} />
      </View>
      <View style={styles.duelNames}>
        <Text style={styles.td}>
          {aFasterLaps} tours plus rapide ({Math.round((aFasterLaps / total) * 100)}%)
        </Text>
        <Text style={styles.td}>{bFasterLaps} tours</Text>
      </View>
      <View style={styles.duelDelta}>
        <Text style={styles.sectorLabel}>ÉCART MÉDIAN AU TOUR</Text>
        <Mono
          style={[
            styles.sectorValue,
            { color: medianDelta !== null && medianDelta < 0 ? colors.success : colors.warning },
          ]}
        >
          {medianDelta === null ? '—' : `${delta(medianDelta)} s`}
        </Mono>
        <Text style={styles.muted}>
          {medianDelta === null
            ? 'Pas assez de tours comparables'
            : medianDelta < 0
              ? `${comparison.a.acronym} plus rapide en rythme pur`
              : `${comparison.b.acronym} plus rapide en rythme pur`}
        </Text>
      </View>
    </View>
  )
}

const degradation = (value: number | null) =>
  value === null ? '—' : `${value > 0 ? '+' : ''}${(value * 1000).toFixed(0)} ms/t`
const degColor = (value: number | null) =>
  value === null
    ? colors.textDim
    : value > 0.08
      ? colors.danger
      : value > 0.04
        ? colors.warning
        : colors.success

const styles = StyleSheet.create({
  hero: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.xl,
    padding: space.xl,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderLeftWidth: 6,
    backgroundColor: colors.surface,
    overflow: 'hidden',
  },
  heroGlow: {
    position: 'absolute',
    right: -120,
    top: -120,
    width: 320,
    height: 320,
    borderRadius: 160,
    opacity: 0.12,
  },
  headshot: { width: 96, height: 96, borderRadius: 48, backgroundColor: colors.surfaceAlt },
  number: { fontFamily: fonts.display, fontWeight: '700', fontSize: 18 },
  name: { color: colors.text, fontFamily: fonts.display, fontWeight: '700', fontSize: 32 },
  team: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  columns: { gap: space.xl },
  columnsWide: { flexDirection: 'row', alignItems: 'stretch' },
  muted: { color: colors.textDim, fontFamily: fonts.body, fontSize: 13 },
  inspector: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 12 },
  inspectorStrong: { color: colors.text, fontFamily: fonts.mono, fontSize: 12, fontWeight: '700' },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.sm,
  },
  thead: { borderTopWidth: 0 },
  th: { color: colors.textDim, fontFamily: fonts.body, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  td: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  dot: { width: 10, height: 10, borderRadius: 5 },
  pitRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space.md,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  pitIndex: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: colors.surfaceAlt,
    color: colors.text,
    textAlign: 'center',
    lineHeight: 24,
    fontFamily: fonts.mono,
    fontSize: 12,
  },
  pitValue: { fontSize: 13 },
  sectors: { flexDirection: 'row', gap: space.md },
  sector: { flex: 1, padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, gap: 6 },
  sectorLabel: {
    color: colors.textDim,
    fontFamily: fonts.body,
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 1,
  },
  sectorValue: { fontSize: 20, fontWeight: '600' },
  duelNames: { flexDirection: 'row', justifyContent: 'space-between' },
  duelName: { fontFamily: fonts.display, fontWeight: '700', fontSize: 22 },
  duelBar: {
    flexDirection: 'row',
    height: 12,
    borderRadius: 6,
    overflow: 'hidden',
    gap: 2,
    backgroundColor: colors.surfaceAlt,
  },
  duelDelta: { padding: space.lg, borderRadius: radius.md, backgroundColor: colors.surfaceAlt, gap: 6 },
})
