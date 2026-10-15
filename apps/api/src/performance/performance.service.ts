import type { DriverAnalysis, DriverComparison, RaceOverview, RaceSummary } from '@pitwall/contracts'
import type { Cache } from '../platform/cache'
import { NotFoundError, NotReadyError } from '../platform/errors'
import type { Id } from '../platform/id'
import type { RaceRepository } from '../races/race.repository'
import { compareDrivers } from './domain/driver-comparison'
import { analyseRace, type RaceAnalysis } from './domain/race-overview'
import type { AnalysisOptions } from './domain/types'
import type { PerformanceRepository } from './performance.repository'

export const performanceCachePrefix = (raceId: Id) => `perf:v2:${raceId}:`

export interface PerformanceServiceDeps {
  races: RaceRepository
  repository: PerformanceRepository
  cache: Cache
  cacheTtlSeconds: number
  options: AnalysisOptions
}

/**
 * Application service: orchestrates repository → pure domain → cache.
 * Analyses are deterministic for a given ingestion, so they are cached until
 * the race is re-ingested (the ingestion job evicts the prefix).
 */
export class PerformanceService {
  constructor(private readonly deps: PerformanceServiceDeps) {}

  getRaceOverview(raceId: Id): Promise<RaceOverview> {
    return this.cached(raceId, 'overview', async () => (await this.analyse(raceId)).overview)
  }

  getDriverAnalysis(raceId: Id, driverNumber: number): Promise<DriverAnalysis> {
    return this.cached(raceId, `driver:${driverNumber}`, async () => {
      const analysis = await this.analyse(raceId)
      const performance = analysis.performances.get(driverNumber)
      const summary = analysis.summaries.get(driverNumber)
      if (!performance || !summary) throw new NotFoundError(`Driver #${driverNumber} did not take part`)
      const teammate =
        [...analysis.performances.values()].find(
          (p) =>
            p.data.driver.teamName === summary.driver.teamName && p.data.driver.driverNumber !== driverNumber,
        )?.data.driver ?? null
      return {
        race: analysis.overview.race,
        summary,
        laps: performance.laps,
        stints: performance.stints,
        pitStops: performance.pitStops,
        bestSectors: performance.bestSectors,
        fieldMedianPace: analysis.fieldMedianPace,
        teammate,
      }
    })
  }

  compare(raceId: Id, a: number, b: number): Promise<DriverComparison> {
    return this.cached(raceId, `compare:${a}:${b}`, async () => {
      const analysis = await this.analyse(raceId)
      const perfA = analysis.performances.get(a)
      const perfB = analysis.performances.get(b)
      if (!perfA || !perfB) throw new NotFoundError(`Driver #${perfA ? b : a} did not take part`)
      return compareDrivers(analysis.overview.race, perfA, perfB)
    })
  }

  private async analyse(raceId: Id): Promise<RaceAnalysis> {
    const race = await this.requireReadyRace(raceId)
    const drivers = await this.deps.repository.loadDrivers(raceId)
    return analyseRace({ race, drivers }, this.deps.options)
  }

  private async requireReadyRace(raceId: Id): Promise<RaceSummary> {
    const race = await this.deps.races.findById(raceId)
    if (!race) throw new NotFoundError(`Race ${raceId} not found`)
    if (race.status !== 'ready') throw new NotReadyError(`Race ${raceId} is ${race.status}`)
    return race
  }

  private cached<T>(raceId: Id, key: string, compute: () => Promise<T>): Promise<T> {
    return this.deps.cache.remember(
      `${performanceCachePrefix(raceId)}${key}`,
      this.deps.cacheTtlSeconds,
      compute,
    )
  }
}
