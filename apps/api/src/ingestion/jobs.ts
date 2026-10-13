import type { Task, TaskList } from 'graphile-worker'
import { z } from 'zod'
import type { IngestionDeps } from './race-ingestion'
import { ingestRace } from './race-ingestion'
import { syncSeason } from './season-sync'

/**
 * Background jobs, backed by Graphile Worker (PostgreSQL, ACID, SKIP LOCKED).
 * A job is enqueued in the same database as the data it produces: no dual-write.
 */
export const JOBS = {
  syncSeason: 'sync_season',
  ingestRace: 'ingest_race',
} as const

export const SyncSeasonPayload = z.object({ year: z.number().int(), force: z.boolean().optional() })
export const IngestRacePayload = z.object({ sessionKey: z.number().int() })

export function createTaskList(deps: IngestionDeps): TaskList {
  const syncSeasonTask: Task = async (payload, helpers) => {
    const { year, force } = SyncSeasonPayload.parse(payload)
    const result = await syncSeason(deps, year, { force: force ?? false })
    for (const sessionKey of result.toIngest) {
      await helpers.addJob(
        JOBS.ingestRace,
        { sessionKey },
        { jobKey: `${JOBS.ingestRace}:${sessionKey}`, maxAttempts: 3 },
      )
    }
  }

  const ingestRaceTask: Task = async (payload) => {
    const { sessionKey } = IngestRacePayload.parse(payload)
    await ingestRace(deps, sessionKey)
  }

  return { [JOBS.syncSeason]: syncSeasonTask, [JOBS.ingestRace]: ingestRaceTask }
}
