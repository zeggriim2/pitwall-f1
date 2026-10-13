import type { DriverRef, RaceSummary, ResultStatus } from '@pitwall/contracts'

/**
 * Domain inputs, decoupled from both the database rows and the OpenF1 payloads.
 * Repositories map *into* these types; the analysis never sees SQL or HTTP.
 */
export interface LapInput {
  lapNumber: number
  duration: number | null
  sectors: [number | null, number | null, number | null]
  speedTrap: number | null
  isPitOutLap: boolean
  dateStart: Date | null
  position: number | null
}

export interface StintInput {
  stintNumber: number
  compound: string
  lapStart: number
  lapEnd: number
  tyreAgeAtStart: number
}

export interface PitStopInput {
  lapNumber: number
  laneDuration: number | null
  stopDuration: number | null
}

export interface ResultInput {
  position: number | null
  gridPosition: number | null
  status: ResultStatus
  points: number
  lapsCompleted: number
  raceTime: number | null
  gapToLeader: string | null
}

export interface DriverRaceData {
  driver: DriverRef
  laps: LapInput[]
  stints: StintInput[]
  pitStops: PitStopInput[]
  result: ResultInput | null
}

export interface RaceData {
  race: RaceSummary
  drivers: DriverRaceData[]
}

export interface AnalysisOptions {
  /** A lap slower than `median * outlierThreshold` is not representative (SC, traffic, incident). */
  outlierThreshold: number
  /** Seconds gained per lap as fuel burns off. */
  fuelEffectPerLap: number
  /** Minimum representative laps required to rank a driver's race pace. */
  minLapsForRanking: number
}

export const DEFAULT_ANALYSIS_OPTIONS: AnalysisOptions = {
  outlierThreshold: 1.07,
  fuelEffectPerLap: 0.035,
  minLapsForRanking: 5,
}
