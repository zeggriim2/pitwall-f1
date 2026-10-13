import type { Db } from '../platform/db/database'
import type { DriverRaceData, LapInput, PitStopInput, ResultInput, StintInput } from './domain/types'

/** Loads everything the analysis needs for one race in five indexed queries. */
export class PerformanceRepository {
  constructor(private readonly db: Db) {}

  async loadDrivers(sessionKey: number): Promise<DriverRaceData[]> {
    const [drivers, laps, stints, pitStops, results] = await Promise.all([
      this.db.selectFrom('drivers').selectAll().where('session_key', '=', sessionKey).execute(),
      this.db
        .selectFrom('laps')
        .selectAll()
        .where('session_key', '=', sessionKey)
        .orderBy('lap_number')
        .execute(),
      this.db.selectFrom('stints').selectAll().where('session_key', '=', sessionKey).execute(),
      this.db.selectFrom('pit_stops').selectAll().where('session_key', '=', sessionKey).execute(),
      this.db.selectFrom('results').selectAll().where('session_key', '=', sessionKey).execute(),
    ])

    const group = <T extends { driver_number: number }>(rows: T[]) => {
      const map = new Map<number, T[]>()
      for (const row of rows) map.set(row.driver_number, [...(map.get(row.driver_number) ?? []), row])
      return map
    }
    const lapsBy = group(laps)
    const stintsBy = group(stints)
    const pitsBy = group(pitStops)
    const resultBy = new Map(results.map((r) => [r.driver_number, r]))

    return drivers.map((d) => {
      const result = resultBy.get(d.driver_number)
      return {
        driver: {
          driverNumber: d.driver_number,
          acronym: d.acronym,
          fullName: d.full_name,
          teamName: d.team_name,
          teamColour: d.team_colour,
          headshotUrl: d.headshot_url,
        },
        laps: (lapsBy.get(d.driver_number) ?? []).map(
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
        stints: (stintsBy.get(d.driver_number) ?? []).map(
          (s): StintInput => ({
            stintNumber: s.stint_number,
            compound: s.compound,
            lapStart: s.lap_start,
            lapEnd: s.lap_end,
            tyreAgeAtStart: s.tyre_age_at_start,
          }),
        ),
        pitStops: (pitsBy.get(d.driver_number) ?? []).map(
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
