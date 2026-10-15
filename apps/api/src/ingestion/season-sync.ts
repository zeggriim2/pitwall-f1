import { sql } from 'kysely'
import type { Db } from '../platform/db/database'
import { type Id, newId } from '../platform/id'
import type { Logger } from '../platform/logger'
import type { OpenF1Client } from './openf1/client'

export interface SeasonSyncResult {
  year: number
  races: number
  /** Finished races whose data is missing or stale and must be ingested. */
  toIngest: Id[]
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

  // OpenF1 keys only identify what we already imported; the ids we hand back are ours.
  const meetingIdByKey = new Map<number, Id>()
  const raceIdByKey = new Map<number, Id>()

  await deps.db.transaction().execute(async (trx) => {
    for (const session of usable) {
      const meeting = meetingByKey.get(session.meeting_key)
      if (!meeting || meetingIdByKey.has(meeting.meeting_key)) continue
      const row = await trx
        .insertInto('meetings')
        .values({
          id: newId(),
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
        .returning(['id', 'meeting_key'])
        .executeTakeFirstOrThrow()
      meetingIdByKey.set(row.meeting_key, row.id)
    }

    for (const [index, session] of usable.entries()) {
      const meetingId = meetingIdByKey.get(session.meeting_key)
      if (!meetingId) continue
      const row = await trx
        .insertInto('races')
        .values({
          id: newId(),
          session_key: session.session_key,
          meeting_id: meetingId,
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
        .returning(['id', 'session_key'])
        .executeTakeFirstOrThrow()
      raceIdByKey.set(row.session_key, row.id)
    }
  })

  const finished = usable.filter((s) => Date.parse(s.date_end) + SETTLE_MS < now.getTime())
  const ids = finished.flatMap((s) => {
    const id = raceIdByKey.get(s.session_key)
    return id ? [id] : []
  })
  const ready =
    options.force || ids.length === 0
      ? new Set<Id>()
      : new Set(
          (
            await deps.db
              .selectFrom('races')
              .select('id')
              .where('id', 'in', ids)
              .where('status', '=', 'ready')
              .execute()
          ).map((row) => row.id),
        )

  const toIngest = ids.filter((id) => !ready.has(id))
  deps.logger.info({ year, races: usable.length, toIngest: toIngest.length }, 'season synced')
  return { year, races: usable.length, toIngest }
}
