import type { DriverResult, LapPoint, PaceMetrics, PitStop, StintAnalysis } from '@pitwall/contracts'
import { type ClassifiedLap, classifyLaps, representativeTimes } from './lap-classification'
import { linearRegression, mean, median, minBy, round, standardDeviation } from './statistics'
import type { AnalysisOptions, DriverRaceData, ResultInput } from './types'
import { normalizeCompound, tyreStateAt } from './tyres'

type Sectors = [number | null, number | null, number | null]

export interface DriverPerformance {
  data: DriverRaceData
  classified: ClassifiedLap[]
  result: DriverResult
  pace: PaceMetrics
  laps: LapPoint[]
  stints: StintAnalysis[]
  pitStops: PitStop[]
  bestSectors: Sectors
}

/** Full per-driver analysis. Pure: same input, same output, no I/O. */
export function analyseDriver(data: DriverRaceData, options: AnalysisOptions): DriverPerformance {
  const laps = [...data.laps].sort((a, b) => a.lapNumber - b.lapNumber)
  const classified = classifyLaps(laps, data.pitStops, options.outlierThreshold)
  const representative = representativeTimes(classified)

  const timed = laps.filter((lap) => lap.duration !== null)
  const best = minBy(timed, (lap) => lap.duration)
  const bestSectors = computeBestSectors(laps.map((lap) => lap.sectors))
  const theoreticalBest = bestSectors.every((sector) => sector !== null)
    ? bestSectors.reduce<number>((sum, sector) => sum + (sector as number), 0)
    : null
  const speeds = laps.flatMap((lap) => (lap.speedTrap === null ? [] : [lap.speedTrap]))

  const pace: PaceMetrics = {
    bestLap: round(best?.duration ?? null),
    bestLapNumber: best?.lapNumber ?? null,
    medianPace: round(median(representative)),
    consistency: round(standardDeviation(representative)),
    cleanLaps: representative.length,
    theoreticalBest: round(theoreticalBest),
    topSpeed: speeds.length > 0 ? Math.max(...speeds) : null,
  }

  const lapPoints = classified.map(({ lap, isPitInLap, exclusion }): LapPoint => {
    const tyre = tyreStateAt(lap.lapNumber, data.stints)
    return {
      lap: lap.lapNumber,
      time: round(lap.duration),
      sectors: lap.sectors.map((sector) => round(sector)) as Sectors,
      position: lap.position,
      compound: tyre.compound,
      tyreAge: tyre.tyreAge,
      isPitOutLap: lap.isPitOutLap,
      isPitInLap,
      isRepresentative: exclusion === null,
    }
  })

  return {
    data,
    classified,
    result: toDriverResult(data.result, laps.length),
    pace,
    laps: lapPoints,
    stints: analyseStints(data, classified, options),
    pitStops: [...data.pitStops]
      .sort((a, b) => a.lapNumber - b.lapNumber)
      .map((stop) => ({
        lap: stop.lapNumber,
        laneDuration: round(stop.laneDuration),
        stopDuration: round(stop.stopDuration),
      })),
    bestSectors: bestSectors.map((sector) => round(sector)) as Sectors,
  }
}

function computeBestSectors(sectors: readonly Sectors[]): Sectors {
  const bestOf = (index: 0 | 1 | 2) => {
    const values = sectors.flatMap((s) => (s[index] === null ? [] : [s[index] as number]))
    return values.length > 0 ? Math.min(...values) : null
  }
  return [bestOf(0), bestOf(1), bestOf(2)]
}

/**
 * Tyre degradation = slope of lap time against tyre age within a stint.
 * The fuel-corrected slope adds back the time the car gains as fuel burns,
 * isolating the tyre's own performance drop-off.
 */
function analyseStints(
  data: DriverRaceData,
  classified: readonly ClassifiedLap[],
  options: AnalysisOptions,
): StintAnalysis[] {
  return [...data.stints]
    .sort((a, b) => a.stintNumber - b.stintNumber)
    .map((stint) => {
      const clean = classified.filter(
        (entry) =>
          entry.exclusion === null &&
          entry.lap.lapNumber >= stint.lapStart &&
          entry.lap.lapNumber <= stint.lapEnd,
      )
      const points = clean.map((entry) => {
        const age = stint.tyreAgeAtStart + (entry.lap.lapNumber - stint.lapStart)
        const time = entry.lap.duration as number
        return { age, time, corrected: time + options.fuelEffectPerLap * (entry.lap.lapNumber - 1) }
      })
      const enough = points.length >= 4
      const raw = enough ? linearRegression(points.map((p) => [p.age, p.time] as const)) : null
      const corrected = enough ? linearRegression(points.map((p) => [p.age, p.corrected] as const)) : null

      return {
        stintNumber: stint.stintNumber,
        compound: normalizeCompound(stint.compound),
        lapStart: stint.lapStart,
        lapEnd: stint.lapEnd,
        laps: stint.lapEnd - stint.lapStart + 1,
        tyreAgeAtStart: stint.tyreAgeAtStart,
        averagePace: round(mean(points.map((p) => p.time))),
        degradation: round(raw?.slope ?? null, 4),
        fuelCorrectedDegradation: round(corrected?.slope ?? null, 4),
      }
    })
}

function toDriverResult(result: ResultInput | null, lapsRecorded: number): DriverResult {
  if (result === null) {
    return {
      position: null,
      grid: null,
      positionsGained: null,
      status: 'finished',
      points: 0,
      lapsCompleted: lapsRecorded,
      gapToLeader: null,
    }
  }
  const gained =
    result.position !== null && result.gridPosition !== null ? result.gridPosition - result.position : null
  return {
    position: result.position,
    grid: result.gridPosition,
    positionsGained: gained,
    status: result.status,
    points: result.points,
    lapsCompleted: result.lapsCompleted,
    gapToLeader: result.gapToLeader,
  }
}
