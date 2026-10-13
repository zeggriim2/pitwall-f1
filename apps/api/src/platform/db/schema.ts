import type { ColumnType, Generated, Insertable, Selectable } from 'kysely'

/**
 * Kysely database interface. Hand-written on purpose: the schema is small and
 * the types document the model better than generated code would.
 */
export interface Database {
  meetings: MeetingTable
  races: RaceTable
  drivers: DriverTable
  laps: LapTable
  stints: StintTable
  pit_stops: PitStopTable
  results: ResultTable
}

type Timestamp = ColumnType<Date, Date | string, Date | string>

export interface MeetingTable {
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
  session_key: number
  meeting_key: number
  year: number
  round: number
  date_start: Timestamp
  date_end: Timestamp
  status: ColumnType<RaceIngestionStatus, RaceIngestionStatus | undefined, RaceIngestionStatus>
  ingested_at: ColumnType<Date | null, Date | string | null | undefined, Date | string | null>
  last_error: ColumnType<string | null, string | null | undefined, string | null>
  updated_at: Generated<Date>
}

export interface DriverTable {
  session_key: number
  driver_number: number
  acronym: string
  full_name: string
  team_name: string
  team_colour: string
  headshot_url: string | null
}

export interface LapTable {
  session_key: number
  driver_number: number
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
  session_key: number
  driver_number: number
  stint_number: number
  compound: string
  lap_start: number
  lap_end: number
  tyre_age_at_start: number
}

export interface PitStopTable {
  session_key: number
  driver_number: number
  lap_number: number
  lane_duration: number | null
  stop_duration: number | null
}

export interface ResultTable {
  session_key: number
  driver_number: number
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
export type LapRow = Selectable<LapTable>
export type StintRow = Selectable<StintTable>
export type PitStopRow = Selectable<PitStopTable>
export type ResultRow = Selectable<ResultTable>

export type NewLap = Insertable<LapTable>
