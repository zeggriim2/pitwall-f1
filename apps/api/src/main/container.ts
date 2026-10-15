import { OpenF1Client } from '../ingestion/openf1/client'
import { DEFAULT_ANALYSIS_OPTIONS } from '../performance/domain/types'
import { PerformanceRepository } from '../performance/performance.repository'
import { PerformanceService } from '../performance/performance.service'
import { createRedisCache } from '../platform/cache'
import { type Config, loadConfig } from '../platform/config'
import { createDatabase } from '../platform/db/database'
import { createLogger } from '../platform/logger'
import { RaceRepository } from '../races/race.repository'

/**
 * Manual dependency injection: explicit, greppable, zero magic.
 * Each entry point (server, worker, CLI) picks what it needs.
 */
export function createContainer(name: string, config: Config = loadConfig()) {
  const logger = createLogger(config, name)
  const db = createDatabase(config.DATABASE_URL, logger)
  const cache = createRedisCache(config.REDIS_URL, logger)
  const races = new RaceRepository(db)
  const performance = new PerformanceService({
    races,
    repository: new PerformanceRepository(db),
    cache,
    cacheTtlSeconds: config.CACHE_TTL_SECONDS,
    options: { ...DEFAULT_ANALYSIS_OPTIONS, fuelEffectPerLap: config.FUEL_EFFECT_SECONDS_PER_LAP },
  })
  const openf1 = new OpenF1Client({
    baseUrl: config.OPENF1_BASE_URL,
    minIntervalMs: config.OPENF1_MIN_INTERVAL_MS,
    logger: logger.child({ component: 'openf1' }),
  })

  return {
    config,
    logger,
    db,
    cache,
    races,
    performance,
    openf1,
    async dispose() {
      await Promise.allSettled([db.destroy(), cache.close()])
    },
  }
}
