import { median } from './statistics'
import type { LapInput, PitStopInput } from './types'

export type LapExclusionReason = 'no_time' | 'opening_lap' | 'pit_out' | 'pit_in' | 'outlier'

export interface ClassifiedLap {
  lap: LapInput
  isPitInLap: boolean
  exclusion: LapExclusionReason | null
}

/**
 * Decides which laps describe a driver's *true* race pace.
 *
 * Excluded: laps without timing, the standing-start lap, in/out laps, and
 * statistical outliers (safety car, VSC, traffic, incidents) slower than
 * `threshold × median` of the remaining laps — the classic 107% rule.
 */
export function classifyLaps(
  laps: readonly LapInput[],
  pitStops: readonly PitStopInput[],
  threshold: number,
): ClassifiedLap[] {
  const pitInLaps = new Set(pitStops.map((stop) => stop.lapNumber))

  const firstPass = laps.map((lap): ClassifiedLap => {
    const isPitInLap = pitInLaps.has(lap.lapNumber)
    const exclusion: LapExclusionReason | null =
      lap.duration === null
        ? 'no_time'
        : lap.lapNumber === 1
          ? 'opening_lap'
          : lap.isPitOutLap
            ? 'pit_out'
            : isPitInLap
              ? 'pit_in'
              : null
    return { lap, isPitInLap, exclusion }
  })

  const candidates = firstPass.flatMap((entry) =>
    entry.exclusion === null && entry.lap.duration !== null ? [entry.lap.duration] : [],
  )
  const reference = median(candidates)
  if (reference === null) return firstPass

  const cutoff = reference * threshold
  return firstPass.map((entry) =>
    entry.exclusion === null && (entry.lap.duration as number) > cutoff
      ? { ...entry, exclusion: 'outlier' }
      : entry,
  )
}

export function representativeTimes(classified: readonly ClassifiedLap[]): number[] {
  return classified.flatMap((entry) =>
    entry.exclusion === null && entry.lap.duration !== null ? [entry.lap.duration] : [],
  )
}
