import { match, P } from 'ts-pattern'
import type { LapTable, PitStopTable, ResultTable, StintTable } from '../platform/db/schema'
import type { Id, IdFactory } from '../platform/id'
import { lapKey, resolveLapPositions } from './lap-positions'
import type {
  OpenF1Driver,
  OpenF1Lap,
  OpenF1Pit,
  OpenF1Position,
  OpenF1SessionResult,
  OpenF1Stint,
} from './openf1/schemas'

export interface RawRace {
  drivers: OpenF1Driver[]
  laps: OpenF1Lap[]
  stints: OpenF1Stint[]
  pitStops: OpenF1Pit[]
  positions: OpenF1Position[]
  results: OpenF1SessionResult[]
}

/**
 * A driver entry before its identity is resolved. `acronym` and `full_name`
 * describe the driver; the ingestion turns them into a `driver_id` by upserting
 * the `drivers` table, which mapping cannot do without touching the database.
 */
export interface MappedEntry {
  id: Id
  race_id: Id
  driver_number: number
  team_name: string
  team_colour: string
  headshot_url: string | null
  acronym: string
  full_name: string
}

export interface RaceRows {
  entries: MappedEntry[]
  laps: LapTable[]
  stints: StintTable[]
  pitStops: PitStopTable[]
  results: ResultTable[]
}

/**
 * Pure translation from OpenF1 payloads to database rows.
 * `newId` is injected so tests can pin the generated keys.
 */
export function mapRace(raceId: Id, raw: RawRace, newId: IdFactory): RaceRows {
  const { byLap, grid } = resolveLapPositions(
    raw.laps.map((lap) => ({
      driverNumber: lap.driver_number,
      lapNumber: lap.lap_number,
      dateStart: lap.date_start ? new Date(lap.date_start) : null,
      duration: lap.lap_duration,
    })),
    raw.positions.map((p) => ({
      driverNumber: p.driver_number,
      position: p.position,
      date: new Date(p.date),
    })),
  )

  const entries = dedupe(raw.drivers, (d) => d.driver_number).map(
    (d): MappedEntry => ({
      id: newId(),
      race_id: raceId,
      driver_number: d.driver_number,
      team_name: d.team_name ?? 'Unknown',
      team_colour: (d.team_colour ?? '8a8f98').replace('#', '').toLowerCase(),
      headshot_url: d.headshot_url,
      acronym: d.name_acronym ?? String(d.driver_number),
      full_name: d.full_name ?? d.broadcast_name ?? `#${d.driver_number}`,
    }),
  )
  const entryIdByNumber = new Map(entries.map((e) => [e.driver_number, e.id]))
  const entryId = (driverNumber: number): Id => entryIdByNumber.get(driverNumber) as Id
  const known = (driverNumber: number) => entryIdByNumber.has(driverNumber)

  const laps = dedupe(raw.laps, (l) => lapKey(l.driver_number, l.lap_number))
    .filter((l) => known(l.driver_number))
    .map(
      (l): LapTable => ({
        id: newId(),
        driver_entry_id: entryId(l.driver_number),
        lap_number: l.lap_number,
        lap_duration: l.lap_duration,
        sector_1: l.duration_sector_1,
        sector_2: l.duration_sector_2,
        sector_3: l.duration_sector_3,
        speed_trap: l.st_speed === null ? null : Math.round(l.st_speed),
        is_pit_out_lap: l.is_pit_out_lap,
        date_start: l.date_start ? new Date(l.date_start) : null,
        position: byLap.get(lapKey(l.driver_number, l.lap_number)) ?? null,
      }),
    )

  const lastLap = new Map<number, number>()
  for (const lap of raw.laps)
    lastLap.set(lap.driver_number, Math.max(lastLap.get(lap.driver_number) ?? 0, lap.lap_number))

  const stints = dedupe(raw.stints, (s) => `${s.driver_number}:${s.stint_number}`)
    .filter((s) => known(s.driver_number) && s.lap_start !== null)
    .map(
      (s): StintTable => ({
        id: newId(),
        driver_entry_id: entryId(s.driver_number),
        stint_number: s.stint_number,
        compound: s.compound ?? 'UNKNOWN',
        lap_start: s.lap_start as number,
        // An open stint (retirement / live data) runs until the driver's last lap.
        lap_end: s.lap_end ?? lastLap.get(s.driver_number) ?? (s.lap_start as number),
        tyre_age_at_start: Math.round(s.tyre_age_at_start ?? 0),
      }),
    )

  const pitStops = dedupe(raw.pitStops, (p) => lapKey(p.driver_number, p.lap_number))
    .filter((p) => known(p.driver_number))
    .map(
      (p): PitStopTable => ({
        id: newId(),
        driver_entry_id: entryId(p.driver_number),
        lap_number: p.lap_number,
        lane_duration: p.lane_duration ?? p.pit_duration,
        stop_duration: p.stop_duration,
      }),
    )

  const results = dedupe(raw.results, (r) => r.driver_number)
    .filter((r) => known(r.driver_number))
    .map(
      (r): ResultTable => ({
        id: newId(),
        driver_entry_id: entryId(r.driver_number),
        position: r.position,
        grid_position: grid.get(r.driver_number) ?? null,
        status: resultStatus(r),
        points: r.points ?? 0,
        laps_completed: r.number_of_laps ?? lastLap.get(r.driver_number) ?? 0,
        race_time: typeof r.duration === 'number' ? r.duration : null,
        gap_to_leader: formatGap(r.gap_to_leader),
      }),
    )

  return { entries, laps, stints, pitStops, results }
}

export function resultStatus(r: Pick<OpenF1SessionResult, 'dnf' | 'dns' | 'dsq'>): ResultTable['status'] {
  return match(r)
    .with({ dsq: true }, () => 'dsq' as const)
    .with({ dns: true }, () => 'dns' as const)
    .with({ dnf: true }, () => 'dnf' as const)
    .otherwise(() => 'finished' as const)
}

export function formatGap(gap: OpenF1SessionResult['gap_to_leader']): string | null {
  return match(gap)
    .with(P.nullish, () => null)
    .with(0, () => null)
    .with(P.number, (seconds) => `+${seconds.toFixed(3)}s`)
    .with(P.string, (label) => label)
    .otherwise(() => null)
}

function dedupe<T>(items: readonly T[], key: (item: T) => string | number): T[] {
  const seen = new Map<string | number, T>()
  for (const item of items) seen.set(key(item), item)
  return [...seen.values()]
}
