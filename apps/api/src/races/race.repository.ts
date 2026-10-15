import type { RaceSummary, Season } from '@pitwall/contracts'
import { sql } from 'kysely'
import type { Db } from '../platform/db/database'
import type { Id } from '../platform/id'

const raceColumns = [
  'r.id',
  'r.year',
  'r.round',
  'r.date_start',
  'r.status',
  'r.ingested_at',
  'm.name',
  'm.official_name',
  'm.country_name',
  'm.country_code',
  'm.circuit',
  'm.location',
] as const

export class RaceRepository {
  constructor(private readonly db: Db) {}

  async listSeasons(): Promise<Season[]> {
    const rows = await this.db
      .selectFrom('races')
      .select((eb) => [
        'year',
        eb.fn.countAll<string>().as('races'),
        sql<string>`count(*) filter (where status = 'ready')`.as('ready'),
      ])
      .groupBy('year')
      .orderBy('year', 'desc')
      .execute()
    return rows.map((row) => ({ year: row.year, races: Number(row.races), readyRaces: Number(row.ready) }))
  }

  async listByYear(year: number): Promise<RaceSummary[]> {
    const rows = await this.baseQuery().where('r.year', '=', year).orderBy('r.round').execute()
    return rows.map(toRaceSummary)
  }

  async findById(raceId: Id): Promise<RaceSummary | null> {
    const row = await this.baseQuery().where('r.id', '=', raceId).executeTakeFirst()
    return row ? toRaceSummary(row) : null
  }

  private baseQuery() {
    return this.db
      .selectFrom('races as r')
      .innerJoin('meetings as m', 'm.id', 'r.meeting_id')
      .select(raceColumns)
  }
}

type RaceQueryRow = Awaited<ReturnType<ReturnType<RaceRepository['baseQuery']>['executeTakeFirstOrThrow']>>

function toRaceSummary(row: RaceQueryRow): RaceSummary {
  return {
    id: row.id,
    year: row.year,
    round: row.round,
    name: row.name,
    officialName: row.official_name,
    countryName: row.country_name,
    countryCode: row.country_code,
    circuit: row.circuit,
    location: row.location,
    dateStart: row.date_start.toISOString(),
    status: row.status,
    ingestedAt: row.ingested_at?.toISOString() ?? null,
  }
}
