import { z } from 'zod'
import { DriverRef, Seconds, TyreCompound } from './common'
import { RaceSummary } from './races'

export const ResultStatus = z.enum(['finished', 'dnf', 'dns', 'dsq'])
export type ResultStatus = z.infer<typeof ResultStatus>

export const DriverResult = z.object({
  position: z.number().int().nullable(),
  grid: z.number().int().nullable(),
  positionsGained: z.number().int().nullable(),
  status: ResultStatus,
  points: z.number(),
  lapsCompleted: z.number().int(),
  gapToLeader: z.string().nullable().describe('Human readable gap, e.g. "+12.345s" or "+1 LAP"'),
})
export type DriverResult = z.infer<typeof DriverResult>

export const PaceMetrics = z.object({
  bestLap: Seconds.nullable(),
  bestLapNumber: z.number().int().nullable(),
  medianPace: Seconds.nullable().describe('Median of representative (clean) laps'),
  consistency: Seconds.nullable().describe('Standard deviation of representative laps — lower is better'),
  cleanLaps: z.number().int(),
  theoreticalBest: Seconds.nullable().describe('Sum of the best three sectors'),
  topSpeed: z.number().nullable().describe('Best speed-trap reading, km/h'),
})
export type PaceMetrics = z.infer<typeof PaceMetrics>

export const DriverRaceSummary = z.object({
  driver: DriverRef,
  result: DriverResult,
  pace: PaceMetrics,
  pitStops: z.number().int(),
  paceRank: z.number().int().nullable().describe('Rank by median race pace (1 = fastest)'),
  paceDeltaToBest: Seconds.nullable().describe('Median pace delta to the fastest driver'),
})
export type DriverRaceSummary = z.infer<typeof DriverRaceSummary>

export const Highlight = z.object({ driverNumber: z.number().int(), value: z.number() })
export type Highlight = z.infer<typeof Highlight>

export const RaceOverview = z.object({
  race: RaceSummary,
  totalLaps: z.number().int(),
  drivers: z.array(DriverRaceSummary),
  fastestLap: z.object({ driverNumber: z.number().int(), time: Seconds, lap: z.number().int() }).nullable(),
  highlights: z.object({
    bestRacePace: Highlight.nullable(),
    mostConsistent: Highlight.nullable(),
    biggestGainer: Highlight.nullable(),
  }),
  positionChart: z.array(
    z.object({ driverNumber: z.number().int(), positions: z.array(z.number().int().nullable()) }),
  ),
})
export type RaceOverview = z.infer<typeof RaceOverview>

export const LapPoint = z.object({
  lap: z.number().int(),
  time: Seconds.nullable(),
  sectors: z.tuple([Seconds.nullable(), Seconds.nullable(), Seconds.nullable()]),
  position: z.number().int().nullable(),
  compound: TyreCompound,
  tyreAge: z.number().int().nullable(),
  isPitOutLap: z.boolean(),
  isPitInLap: z.boolean(),
  isRepresentative: z.boolean().describe('Kept for pace statistics (no lap 1, pit laps or outliers)'),
})
export type LapPoint = z.infer<typeof LapPoint>

export const StintAnalysis = z.object({
  stintNumber: z.number().int(),
  compound: TyreCompound,
  lapStart: z.number().int(),
  lapEnd: z.number().int(),
  laps: z.number().int(),
  tyreAgeAtStart: z.number().int(),
  averagePace: Seconds.nullable(),
  degradation: Seconds.nullable().describe('Raw lap-time slope in s/lap (least squares)'),
  fuelCorrectedDegradation: Seconds.nullable().describe('Slope after removing the fuel-burn effect'),
})
export type StintAnalysis = z.infer<typeof StintAnalysis>

export const PitStop = z.object({
  lap: z.number().int(),
  laneDuration: Seconds.nullable(),
  stopDuration: Seconds.nullable(),
})
export type PitStop = z.infer<typeof PitStop>

export const DriverAnalysis = z.object({
  race: RaceSummary,
  summary: DriverRaceSummary,
  laps: z.array(LapPoint),
  stints: z.array(StintAnalysis),
  pitStops: z.array(PitStop),
  bestSectors: z.tuple([Seconds.nullable(), Seconds.nullable(), Seconds.nullable()]),
  fieldMedianPace: Seconds.nullable().describe('Median of all drivers’ median pace, for context'),
  teammate: DriverRef.nullable(),
})
export type DriverAnalysis = z.infer<typeof DriverAnalysis>

export const ComparisonLap = z.object({
  lap: z.number().int(),
  a: Seconds.nullable(),
  b: Seconds.nullable(),
  delta: Seconds.nullable().describe('a - b; negative means A was faster'),
  gap: Seconds.nullable().describe('Cumulative race-time gap A - B at the end of the lap'),
})
export type ComparisonLap = z.infer<typeof ComparisonLap>

export const DriverComparison = z.object({
  race: RaceSummary,
  a: DriverRef,
  b: DriverRef,
  laps: z.array(ComparisonLap),
  summary: z.object({
    aFasterLaps: z.number().int(),
    bFasterLaps: z.number().int(),
    medianDelta: Seconds.nullable().describe('Median delta over laps where both were representative'),
  }),
})
export type DriverComparison = z.infer<typeof DriverComparison>

export const RaceParams = z.object({ sessionKey: z.coerce.number().int().positive() })
export const DriverParams = RaceParams.extend({ driverNumber: z.coerce.number().int().positive() })
export const CompareQuery = z.object({
  a: z.coerce.number().int().positive(),
  b: z.coerce.number().int().positive(),
})
