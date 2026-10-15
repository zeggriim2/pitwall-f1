import type { DriverRaceSummary, Id, RaceOverview } from '@pitwall/contracts'
import { Link, useLocalSearchParams } from 'expo-router'
import { useMemo, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useRaceOverview } from '@/api/hooks'
import { LineChart } from '@/components/charts/LineChart'
import { PaceBars } from '@/components/charts/PaceBars'
import { HoverPressable } from '@/components/ui/HoverPressable'
import { Badge, Card, ErrorState, LoadingState, Mono, SectionTitle, Stat } from '@/components/ui/primitives'
import { Screen } from '@/components/ui/Screen'
import { flag, lapTime, raceDate, signed } from '@/lib/format'
import { colors, fonts, space, teamColor } from '@/theme/tokens'

export default function RaceScreen() {
  const params = useLocalSearchParams<{ raceId: string }>()
  const raceId = params.raceId
  const overview = useRaceOverview(raceId)

  return (
    <Screen
      crumbs={[
        { label: overview.data ? String(overview.data.race.year) : 'Saison', href: '/' },
        { label: overview.data?.race.name ?? 'Course' },
      ]}
    >
      {overview.isPending ? <LoadingState label="Analyse de la course…" /> : null}
      {overview.error ? <ErrorState error={overview.error} /> : null}
      {overview.data ? <RaceContent data={overview.data} /> : null}
    </Screen>
  )
}

function RaceContent({ data }: { data: RaceOverview }) {
  const { width } = useWindowDimensions()
  const wide = width >= 980
  const [focus, setFocus] = useState<number | null>(null)
  const byNumber = useMemo(() => new Map(data.drivers.map((d) => [d.driver.driverNumber, d])), [data.drivers])
  const name = (n: number | undefined) =>
    n === undefined ? '—' : (byNumber.get(n)?.driver.acronym ?? `#${n}`)
  const colorOf = (n: number | undefined) =>
    teamColor(n === undefined ? null : byNumber.get(n)?.driver.teamColour)
  const winner = data.drivers[0]
  const { highlights } = data

  return (
    <>
      <View style={styles.header}>
        <Text style={styles.kicker}>
          {flag(data.race.countryCode)} ROUND {data.race.round} · {data.race.year}
        </Text>
        <Text style={styles.title}>{data.race.name}</Text>
        <Text style={styles.meta}>
          {data.race.circuit} · {data.race.location} · {raceDate(data.race.dateStart)} · {data.totalLaps}{' '}
          tours
        </Text>
      </View>

      <View style={styles.stats}>
        <Stat
          label="Vainqueur"
          value={winner?.driver.acronym ?? '—'}
          hint={winner?.driver.teamName}
          accent={colorOf(winner?.driver.driverNumber)}
        />
        <Stat
          label="Meilleur tour"
          value={lapTime(data.fastestLap?.time)}
          hint={
            data.fastestLap
              ? `${name(data.fastestLap.driverNumber)} · tour ${data.fastestLap.lap}`
              : undefined
          }
          accent={colors.purple}
        />
        <Stat
          label="Meilleur rythme"
          value={name(highlights.bestRacePace?.driverNumber)}
          hint={highlights.bestRacePace ? `médiane ${lapTime(highlights.bestRacePace.value)}` : undefined}
          accent={colorOf(highlights.bestRacePace?.driverNumber)}
        />
        <Stat
          label="Plus régulier"
          value={name(highlights.mostConsistent?.driverNumber)}
          hint={highlights.mostConsistent ? `σ ${highlights.mostConsistent.value.toFixed(3)} s` : undefined}
          accent={colorOf(highlights.mostConsistent?.driverNumber)}
        />
        <Stat
          label="Remontée"
          value={name(highlights.biggestGainer?.driverNumber)}
          hint={highlights.biggestGainer ? `${signed(highlights.biggestGainer.value)} places` : undefined}
          accent={colorOf(highlights.biggestGainer?.driverNumber)}
        />
      </View>

      <View style={[styles.columns, wide && styles.columnsWide]}>
        <Card style={wide ? { flex: 3 } : undefined}>
          <SectionTitle
            title="Évolution des positions"
            subtitle="Touchez un pilote dans le classement pour le mettre en évidence"
          />
          <LineChart
            height={360}
            invertY
            yDomain={[0.5, data.drivers.length + 0.5]}
            yTicks={[1, 5, 10, 15, 20].filter((t) => t <= data.drivers.length)}
            yFormat={(v) => `P${v}`}
            xFormat={(v) => `T${v}`}
            series={data.positionChart.map((row) => ({
              id: String(row.driverNumber),
              color: colorOf(row.driverNumber),
              opacity: focus === null || focus === row.driverNumber ? 1 : 0.12,
              strokeWidth: focus === row.driverNumber ? 3.5 : 2,
              points: row.positions.map((position, index) => ({ x: index + 1, y: position })),
            }))}
            renderInspector={(lap) => (
              <Text style={styles.inspector}>
                Tour {lap} ·{' '}
                {data.positionChart
                  .map((row) => ({ n: row.driverNumber, p: row.positions[lap - 1] }))
                  .filter((r): r is { n: number; p: number } => r.p !== null && r.p !== undefined)
                  .sort((a, b) => a.p - b.p)
                  .slice(0, 6)
                  .map((r) => `P${r.p} ${name(r.n)}`)
                  .join('  ')}
              </Text>
            )}
          />
        </Card>
        <Card style={wide ? { flex: 2 } : undefined}>
          <SectionTitle
            title="Rythme de course"
            subtitle="Médiane des tours représentatifs, écart au plus rapide"
          />
          <PaceBars drivers={data.drivers} raceId={data.race.id} />
        </Card>
      </View>

      <Card padded={false}>
        <View style={{ padding: space.xl, paddingBottom: 0 }}>
          <SectionTitle
            title="Classement & performance"
            subtitle="Cliquez sur un pilote pour l’analyse détaillée"
          />
        </View>
        <ClassificationTable data={data} focus={focus} onFocus={setFocus} compact={!wide} />
      </Card>
    </>
  )
}

function ClassificationTable({
  data,
  focus,
  onFocus,
  compact,
}: {
  data: RaceOverview
  focus: number | null
  onFocus: (n: number | null) => void
  compact: boolean
}) {
  const fastest = data.fastestLap?.driverNumber
  return (
    <View>
      <View style={[styles.tr, styles.thead, compact && styles.trCompact]}>
        <Text style={[styles.th, styles.cPos]}>POS</Text>
        <Text style={[styles.th, styles.cDriver]}>PILOTE</Text>
        <Text style={[styles.th, styles.cNum]}>GRILLE</Text>
        {!compact ? <Text style={[styles.th, styles.cGap]}>ÉCART</Text> : null}
        <Text style={[styles.th, styles.cNum]}>RYTHME</Text>
        {!compact ? <Text style={[styles.th, styles.cTime]}>MEILLEUR</Text> : null}
        {!compact ? <Text style={[styles.th, styles.cTime]}>MÉDIANE</Text> : null}
        {!compact ? <Text style={[styles.th, styles.cNum]}>σ</Text> : null}
        <Text style={[styles.th, styles.cNum]}>ARRÊTS</Text>
        {!compact ? <View style={styles.cAction} /> : null}
      </View>
      {data.drivers.map((d) => (
        <Row
          key={d.driver.driverNumber}
          d={d}
          raceId={data.race.id}
          fastest={d.driver.driverNumber === fastest}
          focused={focus === d.driver.driverNumber}
          onFocus={() => onFocus(focus === d.driver.driverNumber ? null : d.driver.driverNumber)}
          compact={compact}
        />
      ))}
    </View>
  )
}

function Row({
  d,
  raceId,
  fastest,
  focused,
  onFocus,
  compact,
}: {
  d: DriverRaceSummary
  raceId: Id
  fastest: boolean
  focused: boolean
  onFocus: () => void
  compact: boolean
}) {
  const gained = d.result.positionsGained
  return (
    <HoverPressable
      onPress={onFocus}
      style={[styles.tr, compact && styles.trCompact, focused && styles.trHover]}
      hoverStyle={styles.trHover}
    >
      <Text style={[styles.td, styles.cPos, styles.pos]}>
        {d.result.position ?? d.result.status.toUpperCase()}
      </Text>
      <View style={[styles.cDriver, styles.driverCell]}>
        <View style={[styles.teamBar, { backgroundColor: teamColor(d.driver.teamColour) }]} />
        <View style={{ flexShrink: 1 }}>
          {compact ? (
            <Link
              href={`/races/${raceId}/drivers/${d.driver.driverNumber}`}
              style={styles.driverName}
              numberOfLines={1}
            >
              {d.driver.fullName} <Text style={{ color: colors.accent }}>→</Text>
            </Link>
          ) : (
            <Text style={styles.driverName} numberOfLines={1}>
              {d.driver.fullName}
            </Text>
          )}
          <Text style={styles.team} numberOfLines={1}>
            {d.driver.teamName}
          </Text>
        </View>
      </View>
      <Text
        style={[
          styles.td,
          styles.cNum,
          {
            color:
              gained === null
                ? colors.textDim
                : gained > 0
                  ? colors.success
                  : gained < 0
                    ? colors.danger
                    : colors.textMuted,
          },
        ]}
      >
        {d.result.grid ?? '—'} {gained !== null && gained !== 0 ? `(${signed(gained)})` : ''}
      </Text>
      {!compact ? (
        <Text style={[styles.td, styles.cGap]} numberOfLines={1}>
          {d.result.status === 'finished'
            ? (d.result.gapToLeader ?? (d.result.position === 1 ? 'Leader' : '—'))
            : `${d.result.status.toUpperCase()} · ${d.result.lapsCompleted} t.`}
        </Text>
      ) : null}
      <View style={styles.cNum}>
        {d.paceRank ? (
          <Badge label={`#${d.paceRank}`} tone={d.paceRank <= 3 ? 'accent' : 'neutral'} />
        ) : (
          <Text style={styles.td}>—</Text>
        )}
      </View>
      {!compact ? (
        <Mono style={[styles.td, styles.cTime, fastest ? { color: colors.purple, fontWeight: '700' } : {}]}>
          {lapTime(d.pace.bestLap)}
        </Mono>
      ) : null}
      {!compact ? <Mono style={[styles.td, styles.cTime]}>{lapTime(d.pace.medianPace)}</Mono> : null}
      {!compact ? (
        <Mono style={[styles.td, styles.cNum]}>{d.pace.consistency?.toFixed(2) ?? '—'}</Mono>
      ) : null}
      <Text style={[styles.td, styles.cNum]}>{d.pitStops}</Text>
      {!compact ? (
        <Link
          href={`/races/${raceId}/drivers/${d.driver.driverNumber}`}
          style={[styles.cAction, styles.analyse]}
        >
          Analyser →
        </Link>
      ) : null}
    </HoverPressable>
  )
}

const styles = StyleSheet.create({
  header: { gap: 6, paddingTop: space.md },
  kicker: { color: colors.accent, fontFamily: fonts.body, fontWeight: '700', letterSpacing: 2, fontSize: 12 },
  title: { color: colors.text, fontFamily: fonts.display, fontWeight: '700', fontSize: 34 },
  meta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 14 },
  stats: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md },
  columns: { gap: space.xl },
  columnsWide: { flexDirection: 'row', alignItems: 'flex-start' },
  inspector: { color: colors.textMuted, fontFamily: fonts.mono, fontSize: 12 },
  tr: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: space.xl,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    gap: space.sm,
  },
  trHover: { backgroundColor: colors.surfaceAlt },
  trCompact: { paddingHorizontal: space.md },
  thead: { borderTopWidth: 0, paddingVertical: space.md },
  th: { color: colors.textDim, fontFamily: fonts.body, fontSize: 11, fontWeight: '700', letterSpacing: 1 },
  td: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  pos: { color: colors.text, fontFamily: fonts.mono, fontWeight: '700' },
  cPos: { width: 40 },
  cDriver: { flex: 1, minWidth: 110 },
  cNum: { width: 64 },
  cGap: { width: 120 },
  cTime: { width: 92 },
  cAction: { width: 86, textAlign: 'right' },
  driverCell: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  teamBar: { width: 4, height: 30, borderRadius: 2 },
  driverName: { color: colors.text, fontFamily: fonts.body, fontWeight: '600', fontSize: 14 },
  team: { color: colors.textDim, fontFamily: fonts.body, fontSize: 12 },
  analyse: { color: colors.accent, fontFamily: fonts.body, fontWeight: '700', fontSize: 13 },
})
