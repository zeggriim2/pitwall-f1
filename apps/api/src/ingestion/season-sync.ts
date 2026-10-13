import { sql } from 'kysely'
import type { Db } from '../platform/db/database'
import type { Logger } from '../platform/logger'
import type { OpenF1Client } from './openf1/client'

export interface SeasonSyncResult {
  year: number
  races: number
  /** Finished races whose data is missing or stale and must be ingested. */
  toIngest: number[]
}

/** Grace period after a race ends before OpenF1 data is considered complete. */
const SETTLE_MS = 3 * 60 * 60 * 1000

/** Upserts the season calendar (meetings + race sessions) and lists races to ingest. */
export async function syncSeason(
  deps: { db: Db; openf1: OpenF1Client; logger: Logger },
  year: number,
  options: { force?: boolean; now?: Date } = {},
): Promise<SeasonSyncResult> {
  const now = options.now ?? new Date()
  const meetings = await deps.openf1.meetings(year)
  const sessions = (await deps.openf1.raceSessions(year))
    .filter((s) => s.session_type === 'Race' && s.session_name === 'Race' && !s.is_cancelled)
    .sort((a, b) => Date.parse(a.date_start) - Date.parse(b.date_start))

  const meetingByKey = new Map(meetings.map((m) => [m.meeting_key, m]))
  const usable = sessions.filter((s) => meetingByKey.has(s.meeting_key))

  await deps.db.transaction().execute(async (trx) => {
    for (const session of usable) {
      const meeting = meetingByKey.get(session.meeting_key)
      if (!meeting) continue
      await trx
        .insertInto('meetings')
        .values({
          meeting_key: meeting.meeting_key,
          year: meeting.year,
          name: meeting.meeting_name,
          official_name: meeting.meeting_official_name,
          country_name: meeting.country_name,
          country_code: meeting.country_code,
          circuit: meeting.circuit_short_name,
          location: meeting.location,
          date_start: meeting.date_start,
        })
        .onConflict((oc) =>
          oc.column('meeting_key').doUpdateSet((eb) => ({
            name: eb.ref('excluded.name'),
            official_name: eb.ref('excluded.official_name'),
            date_start: eb.ref('excluded.date_start'),
          })),
        )
        .execute()
    }

    for (const [index, session] of usable.entries()) {
      await trx
        .insertInto('races')
        .values({
          session_key: session.session_key,
          meeting_key: session.meeting_key,
          year: session.year,
          round: index + 1,
          date_start: session.date_start,
          date_end: session.date_end,
        })
        .onConflict((oc) =>
          oc.column('session_key').doUpdateSet((eb) => ({
            round: eb.ref('excluded.round'),
            date_start: eb.ref('excluded.date_start'),
            date_end: eb.ref('excluded.date_end'),
            updated_at: sql`now()`,
          })),
        )
        .execute()
    }
  })

  const finished = usable.filter((s) => Date.parse(s.date_end) + SETTLE_MS < now.getTime())
  const keys = finished.map((s) => s.session_key)
  const ready =
    options.force || keys.length === 0
      ? new Set<number>()
      : new Set(
          (
            await deps.db
              .selectFrom('races')
              .select('session_key')
              .where('session_key', 'in', keys)
              .where('status', '=', 'ready')
              .execute()
          ).map((row) => row.session_key),
        )

  const toIngest = keys.filter((key) => !ready.has(key))
  deps.logger.info({ year, races: usable.length, toIngest: toIngest.length }, 'season synced')
  return { year, races: usable.length, toIngest }
}
