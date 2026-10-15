import { performanceCachePrefix } from '../performance/performance.service'
import type { Cache } from '../platform/cache'
import type { Db } from '../platform/db/database'
import { NotFoundError } from '../platform/errors'
import { type Id, newId } from '../platform/id'
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
export async function ingestRace(deps: IngestionDeps, raceId: Id): Promise<RaceRows> {
  const { db, openf1, logger } = deps
  const log = logger.child({ raceId })

  const race = await db
    .selectFrom('races')
    .select(['id', 'session_key'])
    .where('id', '=', raceId)
    .executeTakeFirst()
  if (!race) throw new NotFoundError(`Race ${raceId} not found`)
  const { session_key: sessionKey } = race

  await db
    .updateTable('races')
    .set({ status: 'ingesting', last_error: null, updated_at: new Date() })
    .where('id', '=', raceId)
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

    const rows = mapRace(raceId, { drivers, laps, stints, pitStops, positions, results }, newId)

    await db.transaction().execute(async (trx) => {
      // Laps, stints, pit stops and results hang off the entries: cascade clears them.
      await trx.deleteFrom('driver_entries').where('race_id', '=', raceId).execute()

      // Identities outlive the race: upsert them, then resolve each entry's driver.
      const driverIdByAcronym = new Map<string, Id>()
      if (rows.entries.length) {
        const identities = await trx
          .insertInto('drivers')
          .values(
            rows.entries.map((entry) => ({
              id: newId(),
              acronym: entry.acronym,
              full_name: entry.full_name,
            })),
          )
          .onConflict((oc) =>
            oc.column('acronym').doUpdateSet((eb) => ({ full_name: eb.ref('excluded.full_name') })),
          )
          .returning(['id', 'acronym'])
          .execute()
        for (const identity of identities) driverIdByAcronym.set(identity.acronym, identity.id)

        await trx
          .insertInto('driver_entries')
          .values(
            rows.entries.map(({ acronym, full_name: _fullName, ...entry }) => ({
              ...entry,
              driver_id: driverIdByAcronym.get(acronym) as Id,
            })),
          )
          .execute()
      }

      for (const chunk of chunks(rows.laps, 500)) await trx.insertInto('laps').values(chunk).execute()
      if (rows.stints.length) await trx.insertInto('stints').values(rows.stints).execute()
      if (rows.pitStops.length) await trx.insertInto('pit_stops').values(rows.pitStops).execute()
      if (rows.results.length) await trx.insertInto('results').values(rows.results).execute()
      await trx
        .updateTable('races')
        .set({ status: 'ready', ingested_at: new Date(), last_error: null, updated_at: new Date() })
        .where('id', '=', raceId)
        .execute()
    })

    const evicted = await deps.cache.invalidatePrefix(performanceCachePrefix(raceId))
    log.info({ drivers: rows.entries.length, laps: rows.laps.length, evicted }, 'race ingested')
    return rows
  } catch (error) {
    await db
      .updateTable('races')
      .set({ status: 'failed', last_error: String(error).slice(0, 500), updated_at: new Date() })
      .where('id', '=', raceId)
      .execute()
    throw error
  }
}

function* chunks<T>(items: readonly T[], size: number): Generator<T[]> {
  for (let index = 0; index < items.length; index += size) yield items.slice(index, index + size)
}
