import type { Db } from '../platform/db/database'
import type { Id } from '../platform/id'
import type { DriverRaceData, LapInput, PitStopInput, ResultInput, StintInput } from './domain/types'

/** Loads everything the analysis needs for one race in five indexed queries. */
export class PerformanceRepository {
  constructor(private readonly db: Db) {}

  async loadDrivers(raceId: Id): Promise<DriverRaceData[]> {
    const entries = await this.db
      .selectFrom('driver_entries as e')
      .innerJoin('drivers as d', 'd.id', 'e.driver_id')
      .select([
        'e.id',
        'e.driver_number',
        'e.team_name',
        'e.team_colour',
        'e.headshot_url',
        'd.id as driver_id',
        'd.acronym',
        'd.full_name',
      ])
      .where('e.race_id', '=', raceId)
      .execute()
    if (entries.length === 0) return []

    const entryIds = entries.map((entry) => entry.id)
    const [laps, stints, pitStops, results] = await Promise.all([
      this.db
        .selectFrom('laps')
        .selectAll()
        .where('driver_entry_id', 'in', entryIds)
        .orderBy('lap_number')
        .execute(),
      this.db.selectFrom('stints').selectAll().where('driver_entry_id', 'in', entryIds).execute(),
      this.db.selectFrom('pit_stops').selectAll().where('driver_entry_id', 'in', entryIds).execute(),
      this.db.selectFrom('results').selectAll().where('driver_entry_id', 'in', entryIds).execute(),
    ])

    const group = <T extends { driver_entry_id: Id }>(rows: T[]) => {
      const map = new Map<Id, T[]>()
      for (const row of rows) map.set(row.driver_entry_id, [...(map.get(row.driver_entry_id) ?? []), row])
      return map
    }
    const lapsBy = group(laps)
    const stintsBy = group(stints)
    const pitsBy = group(pitStops)
    const resultBy = new Map(results.map((r) => [r.driver_entry_id, r]))

    return entries.map((entry) => {
      const result = resultBy.get(entry.id)
      return {
        driver: {
          id: entry.driver_id,
          driverNumber: entry.driver_number,
          acronym: entry.acronym,
          fullName: entry.full_name,
          teamName: entry.team_name,
          teamColour: entry.team_colour,
          headshotUrl: entry.headshot_url,
        },
        laps: (lapsBy.get(entry.id) ?? []).map(
          (l): LapInput => ({
            lapNumber: l.lap_number,
            duration: l.lap_duration,
            sectors: [l.sector_1, l.sector_2, l.sector_3],
            speedTrap: l.speed_trap,
            isPitOutLap: l.is_pit_out_lap,
            dateStart: l.date_start,
            position: l.position,
          }),
        ),
        stints: (stintsBy.get(entry.id) ?? []).map(
          (s): StintInput => ({
            stintNumber: s.stint_number,
            compound: s.compound,
            lapStart: s.lap_start,
            lapEnd: s.lap_end,
            tyreAgeAtStart: s.tyre_age_at_start,
          }),
        ),
        pitStops: (pitsBy.get(entry.id) ?? []).map(
          (p): PitStopInput => ({
            lapNumber: p.lap_number,
            laneDuration: p.lane_duration,
            stopDuration: p.stop_duration,
          }),
        ),
        result: result
          ? ({
              position: result.position,
              gridPosition: result.grid_position,
              status: result.status,
              points: result.points,
              lapsCompleted: result.laps_completed,
              raceTime: result.race_time,
              gapToLeader: result.gap_to_leader,
            } satisfies ResultInput)
          : null,
      }
    })
  }
}
