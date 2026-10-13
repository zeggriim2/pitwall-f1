import type { DriverAnalysis, DriverComparison, RaceOverview, RaceSummary } from '@pitwall/contracts'
import type { Cache } from '../platform/cache'
import { NotFoundError, NotReadyError } from '../platform/errors'
import type { RaceRepository } from '../races/race.repository'
import { compareDrivers } from './domain/driver-comparison'
import { analyseRace, type RaceAnalysis } from './domain/race-overview'
import type { AnalysisOptions } from './domain/types'
import type { PerformanceRepository } from './performance.repository'

export const performanceCachePrefix = (sessionKey: number) => `perf:v1:${sessionKey}:`

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

  getRaceOverview(sessionKey: number): Promise<RaceOverview> {
    return this.cached(sessionKey, 'overview', async () => (await this.analyse(sessionKey)).overview)
  }

  getDriverAnalysis(sessionKey: number, driverNumber: number): Promise<DriverAnalysis> {
    return this.cached(sessionKey, `driver:${driverNumber}`, async () => {
      const analysis = await this.analyse(sessionKey)
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

  compare(sessionKey: number, a: number, b: number): Promise<DriverComparison> {
    return this.cached(sessionKey, `compare:${a}:${b}`, async () => {
      const analysis = await this.analyse(sessionKey)
      const perfA = analysis.performances.get(a)
      const perfB = analysis.performances.get(b)
      if (!perfA || !perfB) throw new NotFoundError(`Driver #${perfA ? b : a} did not take part`)
      return compareDrivers(analysis.overview.race, perfA, perfB)
    })
  }

  private async analyse(sessionKey: number): Promise<RaceAnalysis> {
    const race = await this.requireReadyRace(sessionKey)
    const drivers = await this.deps.repository.loadDrivers(sessionKey)
    return analyseRace({ race, drivers }, this.deps.options)
  }

  private async requireReadyRace(sessionKey: number): Promise<RaceSummary> {
    const race = await this.deps.races.findBySessionKey(sessionKey)
    if (!race) throw new NotFoundError(`Race ${sessionKey} not found`)
    if (race.status !== 'ready') throw new NotReadyError(`Race ${sessionKey} is ${race.status}`)
    return race
  }

  private cached<T>(sessionKey: number, key: string, compute: () => Promise<T>): Promise<T> {
    return this.deps.cache.remember(
      `${performanceCachePrefix(sessionKey)}${key}`,
      this.deps.cacheTtlSeconds,
      compute,
    )
  }
}
