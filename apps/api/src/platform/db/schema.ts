import type { ColumnType, Generated, Insertable, Selectable } from 'kysely'
import type { Id } from '../id'

/**
 * Kysely database interface. Hand-written on purpose: the schema is small and
 * the types document the model better than generated code would.
 *
 * Every table is keyed by an `id` we own (UUID v7). Upstream OpenF1 keys are
 * kept as plain unique columns (`meeting_key`, `session_key`) so an ingestion
 * can find the row it already imported — they are never referenced by a
 * foreign key, and never leave the ingestion module.
 */
export interface Database {
  meetings: MeetingTable
  races: RaceTable
  drivers: DriverTable
  driver_entries: DriverEntryTable
  laps: LapTable
  stints: StintTable
  pit_stops: PitStopTable
  results: ResultTable
}

type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface MeetingTable {
  id: Id
  /** OpenF1 identifier for the Grand Prix weekend. */
  meeting_key: number
  year: number
  name: string
  official_name: string
  country_name: string
  country_code: string
  circuit: string
  location: string
  date_start: Timestamp
}

export type RaceIngestionStatus = 'pending' | 'ingesting' | 'ready' | 'failed'

export interface RaceTable {
  id: Id
  /** OpenF1 identifier for the race session of the weekend. */
  session_key: number
  meeting_id: Id
  year: number
  round: number
  date_start: Timestamp
  date_end: Timestamp
  status: ColumnType<RaceIngestionStatus, RaceIngestionStatus | undefined, RaceIngestionStatus>
  ingested_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>
  last_error: ColumnType<string | null, string | null | undefined, string | null>
  updated_at: Generated<Date>
}

/**
 * Stable identity of a driver across races and seasons, keyed by acronym —
 * the only field OpenF1 keeps constant for a given driver. The racing number
 * belongs to the entry, not here: it can change from one season to the next.
 */
export interface DriverTable {
  id: Id
  acronym: string
  full_name: string
}

/** One driver taking part in one race, with the team they drove for that day. */
export interface DriverEntryTable {
  id: Id
  race_id: Id
  driver_id: Id
  driver_number: number
  team_name: string
  team_colour: string
  headshot_url: string | null
}

export interface LapTable {
  id: Id
  driver_entry_id: Id
  lap_number: number
  lap_duration: number | null
  sector_1: number | null
  sector_2: number | null
  sector_3: number | null
  speed_trap: number | null
  is_pit_out_lap: boolean
  date_start: Date | null
  /** Running position at the end of the lap, resolved during ingestion. */
  position: number | null
}

export interface StintTable {
  id: Id
  driver_entry_id: Id
  stint_number: number
  compound: string
  lap_start: number
  lap_end: number
  tyre_age_at_start: number
}

export interface PitStopTable {
  id: Id
  driver_entry_id: Id
  lap_number: number
  lane_duration: number | null
  stop_duration: number | null
}

export interface ResultTable {
  id: Id
  driver_entry_id: Id
  position: number | null
  grid_position: number | null
  status: 'finished' | 'dnf' | 'dns' | 'dsq'
  points: number
  laps_completed: number
  race_time: number | null
  gap_to_leader: string | null
}

export type RaceRow = Selectable<RaceTable>
export type MeetingRow = Selectable<MeetingTable>
export type DriverRow = Selectable<DriverTable>
export type DriverEntryRow = Selectable<DriverEntryTable>
export type LapRow = Selectable<LapTable>
export type StintRow = Selectable<StintTable>
export type PitStopRow = Selectable<PitStopTable>
export type ResultRow = Selectable<ResultTable>

export type NewLap = Insertable<LapTable>
