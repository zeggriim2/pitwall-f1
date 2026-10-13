import { performanceCachePrefix } from '../performance/performance.service'
import type { Cache } from '../platform/cache'
import type { Db } from '../platform/db/database'
import type { Logger } from '../platform/logger'
import type { OpenF1Client } from './openf1/client'
import { mapRace, type RaceRows } from './race-mapping'

export interface IngestionDeps {
  db: Db
  openf1: OpenF1Client
  cache: Cache
  logger: Logger
}

/**
 * Downloads one race from OpenF1 and replaces its data atomically.
 * Idempotent: running it twice yields the same state.
 */
export async function ingestRace(deps: IngestionDeps, sessionKey: number): Promise<RaceRows> {
  const { db, openf1, logger } = deps
  const log = logger.child({ sessionKey })

  await db
    .updateTable('races')
    .set({ status: 'ingesting', last_error: null, updated_at: new Date() })
    .where('session_key', '=', sessionKey)
    .execute()

  try {
    // Sequential on purpose: the client throttles anyway, and it keeps logs readable.
    const drivers = await openf1.drivers(sessionKey)
    const laps = await openf1.laps(sessionKey)
    const stints = await openf1.stints(sessionKey)
    const pitStops = await openf1.pitStops(sessionKey)
    const positions = await openf1.positions(sessionKey)
    const results = await openf1.results(sessionKey)

    if (laps.length === 0) throw new Error('OpenF1 has no lap data for this race yet')

    const rows = mapRace(sessionKey, { drivers, laps, stints, pitStops, positions, results })

    await db.transaction().execute(async (trx) => {
      for (const table of ['results', 'pit_stops', 'stints', 'laps', 'drivers'] as const) {
        await trx.deleteFrom(table).where('session_key', '=', sessionKey).execute()
      }
      if (rows.drivers.length) await trx.insertInto('drivers').values(rows.drivers).execute()
      for (const chunk of chunks(rows.laps, 500)) await trx.insertInto('laps').values(chunk).execute()
      if (rows.stints.length) await trx.insertInto('stints').values(rows.stints).execute()
      if (rows.pitStops.length) await trx.insertInto('pit_stops').values(rows.pitStops).execute()
      if (rows.results.length) await trx.insertInto('results').values(rows.results).execute()
      await trx
        .updateTable('races')
        .set({ status: 'ready', ingested_at: new Date(), last_error: null, updated_at: new Date() })
        .where('session_key', '=', sessionKey)
        .execute()
    })

    const evicted = await deps.cache.invalidatePrefix(performanceCachePrefix(sessionKey))
    log.info({ drivers: rows.drivers.length, laps: rows.laps.length, evicted }, 'race ingested')
    return rows
  } catch (error) {
    await db
      .updateTable('races')
      .set({ status: 'failed', last_error: String(error).slice(0, 500), updated_at: new Date() })
      .where('session_key', '=', sessionKey)
      .execute()
    throw error
  }
}

function* chunks<T>(items: readonly T[], size: number): Generator<T[]> {
  for (let index = 0; index < items.length; index += size) yield items.slice(index, index + size)
}
