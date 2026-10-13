import type { DriverRaceSummary, Highlight, RaceOverview } from '@pitwall/contracts'
import { analyseDriver, type DriverPerformance } from './driver-analysis'
import { median, round } from './statistics'
import type { AnalysisOptions, RaceData } from './types'

export interface RaceAnalysis {
  overview: RaceOverview
  performances: Map<number, DriverPerformance>
  summaries: Map<number, DriverRaceSummary>
  fieldMedianPace: number | null
}

/** Analyses every driver, then ranks them against each other. */
export function analyseRace(data: RaceData, options: AnalysisOptions): RaceAnalysis {
  const performances = new Map(
    data.drivers.map((driver) => [driver.driver.driverNumber, analyseDriver(driver, options)]),
  )

  const ranked = [...performances.values()]
    .filter((p) => p.pace.medianPace !== null && p.pace.cleanLaps >= options.minLapsForRanking)
    .sort((a, b) => (a.pace.medianPace as number) - (b.pace.medianPace as number))
  const bestPace = ranked[0]?.pace.medianPace ?? null
  const rankOf = new Map(ranked.map((p, index) => [p.data.driver.driverNumber, index + 1]))

  const summaries = new Map<number, DriverRaceSummary>()
  for (const [number, performance] of performances) {
    const medianPace = performance.pace.medianPace
    summaries.set(number, {
      driver: performance.data.driver,
      result: performance.result,
      pace: performance.pace,
      pitStops: performance.pitStops.length,
      paceRank: rankOf.get(number) ?? null,
      paceDeltaToBest:
        rankOf.has(number) && medianPace !== null && bestPace !== null ? round(medianPace - bestPace) : null,
    })
  }

  const drivers = [...summaries.values()].sort(byClassification)
  const totalLaps = Math.max(0, ...data.drivers.flatMap((d) => d.laps.map((lap) => lap.lapNumber)))

  const overview: RaceOverview = {
    race: data.race,
    totalLaps,
    drivers,
    fastestLap: findFastestLap(performances),
    highlights: {
      bestRacePace: highlight(ranked[0], (p) => p.pace.medianPace),
      mostConsistent: highlight(
        ranked
          .filter((p) => p.pace.consistency !== null && p.pace.cleanLaps >= options.minLapsForRanking * 2)
          .sort((a, b) => (a.pace.consistency as number) - (b.pace.consistency as number))[0],
        (p) => p.pace.consistency,
      ),
      biggestGainer: highlight(
        [...performances.values()]
          .filter((p) => p.result.status === 'finished' && (p.result.positionsGained ?? 0) > 0)
          .sort((a, b) => (b.result.positionsGained ?? 0) - (a.result.positionsGained ?? 0))[0],
        (p) => p.result.positionsGained,
      ),
    },
    positionChart: drivers.map((summary) => {
      const laps = performances.get(summary.driver.driverNumber)?.data.laps ?? []
      const byLap = new Map(laps.map((lap) => [lap.lapNumber, lap.position]))
      return {
        driverNumber: summary.driver.driverNumber,
        positions: Array.from({ length: totalLaps }, (_, index) => byLap.get(index + 1) ?? null),
      }
    }),
  }

  return {
    overview,
    performances,
    summaries,
    fieldMedianPace: round(median(ranked.map((p) => p.pace.medianPace as number))),
  }
}

/** Classified finishers first, then retirements by laps completed. */
function byClassification(a: DriverRaceSummary, b: DriverRaceSummary): number {
  const pa = a.result.position ?? Number.POSITIVE_INFINITY
  const pb = b.result.position ?? Number.POSITIVE_INFINITY
  if (pa !== pb) return pa - pb
  return b.result.lapsCompleted - a.result.lapsCompleted
}

function findFastestLap(performances: Map<number, DriverPerformance>): RaceOverview['fastestLap'] {
  let fastest: RaceOverview['fastestLap'] = null
  for (const [driverNumber, performance] of performances) {
    const { bestLap, bestLapNumber } = performance.pace
    if (bestLap !== null && bestLapNumber !== null && (fastest === null || bestLap < fastest.time)) {
      fastest = { driverNumber, time: bestLap, lap: bestLapNumber }
    }
  }
  return fastest
}

function highlight(
  performance: DriverPerformance | undefined,
  value: (p: DriverPerformance) => number | null,
): Highlight | null {
  if (performance === undefined) return null
  const v = value(performance)
  return v === null ? null : { driverNumber: performance.data.driver.driverNumber, value: v }
}
