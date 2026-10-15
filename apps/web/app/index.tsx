import type { RaceSummary } from '@pitwall/contracts'
import { Link } from 'expo-router'
import { useEffect, useState } from 'react'
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native'
import { useRaces, useSeasons, useSyncSeason } from '@/api/hooks'
import { HoverPressable } from '@/components/ui/HoverPressable'
import { Badge, Button, Card, Chip, ErrorState, LoadingState, SectionTitle } from '@/components/ui/primitives'
import { Screen } from '@/components/ui/Screen'
import { flag, raceDate } from '@/lib/format'
import { colors, fonts, radius, space } from '@/theme/tokens'

const SUGGESTED_YEARS = [2025, 2024, 2023]

export default function SeasonsScreen() {
  const seasons = useSeasons()
  const [year, setYear] = useState<number | null>(null)
  const sync = useSyncSeason()

  useEffect(() => {
    if (year === null && seasons.data?.seasons[0]) setYear(seasons.data.seasons[0].year)
  }, [seasons.data, year])

  const races = useRaces(year)
  const knownYears = seasons.data?.seasons.map((s) => s.year) ?? []
  const importable = SUGGESTED_YEARS.filter((y) => !knownYears.includes(y))

  return (
    <Screen>
      <View style={styles.hero}>
        <Text style={styles.kicker}>FORMULA 1 · RACE ANALYTICS</Text>
        <Text style={styles.title}>
          Lisez une course <Text style={{ color: colors.accent }}>comme un ingénieur</Text>.
        </Text>
        <Text style={styles.lead}>
          Rythme de course réel, dégradation des pneus corrigée du carburant, régularité, stratégie et duels
          tour par tour — pour chaque pilote, sur chaque Grand Prix.
        </Text>
      </View>

      {seasons.isPending ? <LoadingState /> : null}
      {seasons.error ? <ErrorState error={seasons.error} /> : null}

      {seasons.data && seasons.data.seasons.length === 0 ? (
        <Card>
          <SectionTitle
            title="Aucune saison importée"
            subtitle="Les données viennent d’OpenF1 et sont importées en tâche de fond."
          />
          <View style={styles.row}>
            {SUGGESTED_YEARS.map((y) => (
              <Button
                key={y}
                label={`Importer ${y}`}
                loading={sync.isPending && sync.variables === y}
                onPress={() => {
                  sync.mutate(y)
                  setYear(y)
                }}
              />
            ))}
          </View>
          <Text style={styles.muted}>Ou depuis le terminal : task sync YEARS="2024 2025"</Text>
        </Card>
      ) : null}

      {knownYears.length > 0 ? (
        <View style={styles.seasonBar}>
          <View style={styles.row}>
            {seasons.data?.seasons.map((season) => (
              <Chip
                key={season.year}
                label={`${season.year} · ${season.readyRaces}/${season.races}`}
                active={season.year === year}
                onPress={() => setYear(season.year)}
              />
            ))}
          </View>
          {importable.length > 0 ? (
            <View style={styles.row}>
              {importable.map((y) => (
                <Button
                  key={y}
                  variant="ghost"
                  label={sync.isPending && sync.variables === y ? 'Import…' : `+ ${y}`}
                  onPress={() => sync.mutate(y)}
                />
              ))}
            </View>
          ) : null}
        </View>
      ) : null}

      {races.data ? <RaceGrid races={races.data.races} /> : null}
      {races.error ? <ErrorState error={races.error} /> : null}
    </Screen>
  )
}

function RaceGrid({ races }: { races: RaceSummary[] }) {
  const { width } = useWindowDimensions()
  const columns = width >= 1100 ? 4 : width >= 760 ? 3 : width >= 520 ? 2 : 1
  const basis = `${100 / columns - 2}%` as const

  return (
    <View style={styles.grid}>
      {races.map((race) => (
        <RaceCard key={race.id} race={race} basis={basis} />
      ))}
    </View>
  )
}

function RaceCard({ race, basis }: { race: RaceSummary; basis: `${number}%` }) {
  const ready = race.status === 'ready'
  const card = (
    <HoverPressable
      disabled={!ready}
      style={StyleSheet.flatten([styles.raceCard, { flexBasis: basis }, !ready && { opacity: 0.55 }])}
      hoverStyle={ready ? styles.raceCardHover : undefined}
    >
      <View style={styles.raceTop}>
        <Text style={styles.round}>R{String(race.round).padStart(2, '0')}</Text>
        <StatusBadge status={race.status} />
      </View>
      <Text style={styles.flag}>{flag(race.countryCode)}</Text>
      <Text style={styles.raceName} numberOfLines={1}>
        {race.name.replace('Grand Prix', 'GP')}
      </Text>
      <Text style={styles.raceMeta} numberOfLines={1}>
        {race.circuit} · {raceDate(race.dateStart)}
      </Text>
      <View style={styles.raceStripe} />
    </HoverPressable>
  )
  return ready ? (
    <Link href={`/races/${race.id}`} asChild>
      {card}
    </Link>
  ) : (
    card
  )
}

function StatusBadge({ status }: { status: RaceSummary['status'] }) {
  switch (status) {
    case 'ready':
      return <Badge label="Analysé" tone="success" />
    case 'ingesting':
      return <Badge label="Import…" tone="warning" />
    case 'failed':
      return <Badge label="Échec" tone="danger" />
    default:
      return <Badge label="À venir" />
  }
}

const styles = StyleSheet.create({
  hero: { paddingVertical: space.xl, gap: space.md, maxWidth: 820 },
  kicker: {
    color: colors.accent,
    fontFamily: fonts.body,
    fontWeight: '700',
    letterSpacing: 2.5,
    fontSize: 12,
  },
  title: { color: colors.text, fontFamily: fonts.display, fontWeight: '700', fontSize: 40, lineHeight: 46 },
  lead: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 16, lineHeight: 24 },
  row: { flexDirection: 'row', flexWrap: 'wrap', gap: space.sm },
  muted: { color: colors.textDim, fontFamily: fonts.mono, fontSize: 12, marginTop: space.lg },
  seasonBar: { flexDirection: 'row', justifyContent: 'space-between', flexWrap: 'wrap', gap: space.md },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: space.md, justifyContent: 'flex-start' },
  raceCard: {
    flexGrow: 1,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: space.lg,
    gap: 6,
    overflow: 'hidden',
  },
  raceCardHover: {
    borderColor: colors.accent,
    backgroundColor: colors.surfaceHover,
    transform: [{ translateY: -2 }],
  },
  raceTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  round: { color: colors.textDim, fontFamily: fonts.mono, fontSize: 12, fontWeight: '600' },
  flag: { fontSize: 28, marginTop: 4 },
  raceName: { color: colors.text, fontFamily: fonts.display, fontWeight: '700', fontSize: 18 },
  raceMeta: { color: colors.textMuted, fontFamily: fonts.body, fontSize: 13 },
  raceStripe: {
    position: 'absolute',
    right: -20,
    top: -20,
    width: 60,
    height: 60,
    backgroundColor: colors.accentSoft,
    transform: [{ rotate: '45deg' }],
  },
})
