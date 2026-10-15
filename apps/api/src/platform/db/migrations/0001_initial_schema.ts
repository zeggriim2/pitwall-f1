import { type Kysely, sql } from 'kysely'

/**
 * Every table is keyed by a UUID the application generates (v7, see platform/id).
 * OpenF1 keys survive only as unique columns on `meetings` and `races`: they let
 * an import find what it already wrote, and nothing else points at them.
 */
export async function up(db: Kysely<unknown>): Promise<void> {
  const entity = (table: string) =>
    db.schema.createTable(table).addColumn('id', 'uuid', (col) => col.primaryKey())

  await entity('meetings')
    .addColumn('meeting_key', 'integer', (col) => col.notNull().unique())
    .addColumn('year', 'smallint', (col) => col.notNull())
    .addColumn('name', 'text', (col) => col.notNull())
    .addColumn('official_name', 'text', (col) => col.notNull())
    .addColumn('country_name', 'text', (col) => col.notNull())
    .addColumn('country_code', 'text', (col) => col.notNull())
    .addColumn('circuit', 'text', (col) => col.notNull())
    .addColumn('location', 'text', (col) => col.notNull())
    .addColumn('date_start', 'timestamptz', (col) => col.notNull())
    .execute()

  await sql`CREATE TYPE race_status AS ENUM ('pending', 'ingesting', 'ready', 'failed')`.execute(db)

  await entity('races')
    .addColumn('session_key', 'integer', (col) => col.notNull().unique())
    .addColumn('meeting_id', 'uuid', (col) => col.notNull().references('meetings.id').onDelete('cascade'))
    .addColumn('year', 'smallint', (col) => col.notNull())
    .addColumn('round', 'smallint', (col) => col.notNull())
    .addColumn('date_start', 'timestamptz', (col) => col.notNull())
    .addColumn('date_end', 'timestamptz', (col) => col.notNull())
    .addColumn('status', sql`race_status`, (col) => col.notNull().defaultTo('pending'))
    .addColumn('ingested_at', 'timestamptz')
    .addColumn('last_error', 'text')
    .addColumn('updated_at', 'timestamptz', (col) => col.notNull().defaultTo(sql`now()`))
    .execute()
  await db.schema.createIndex('races_year_round_idx').on('races').columns(['year', 'round']).execute()

  // Identity, stable across seasons. The acronym is the only field OpenF1 keeps
  // constant for a driver, so it carries the uniqueness.
  await entity('drivers')
    .addColumn('acronym', 'text', (col) => col.notNull().unique())
    .addColumn('full_name', 'text', (col) => col.notNull())
    .execute()

  await entity('driver_entries')
    .addColumn('race_id', 'uuid', (col) => col.notNull().references('races.id').onDelete('cascade'))
    .addColumn('driver_id', 'uuid', (col) => col.notNull().references('drivers.id').onDelete('cascade'))
    .addColumn('driver_number', 'smallint', (col) => col.notNull())
    .addColumn('team_name', 'text', (col) => col.notNull())
    .addColumn('team_colour', 'text', (col) => col.notNull())
    .addColumn('headshot_url', 'text')
    .addUniqueConstraint('driver_entries_race_number_uq', ['race_id', 'driver_number'])
    .addUniqueConstraint('driver_entries_race_driver_uq', ['race_id', 'driver_id'])
    .execute()
  await db.schema.createIndex('driver_entries_driver_idx').on('driver_entries').column('driver_id').execute()

  // Measurements hang off an entry: one driver, one race. The unique constraint
  // on the natural key is what makes a re-import idempotent.
  const entryChild = (table: string) =>
    entity(table).addColumn('driver_entry_id', 'uuid', (col) =>
      col.notNull().references('driver_entries.id').onDelete('cascade'),
    )

  await entryChild('laps')
    .addColumn('lap_number', 'smallint', (col) => col.notNull())
    .addColumn('lap_duration', 'double precision')
    .addColumn('sector_1', 'double precision')
    .addColumn('sector_2', 'double precision')
    .addColumn('sector_3', 'double precision')
    .addColumn('speed_trap', 'smallint')
    .addColumn('is_pit_out_lap', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('date_start', 'timestamptz')
    .addColumn('position', 'smallint')
    .addUniqueConstraint('laps_entry_lap_uq', ['driver_entry_id', 'lap_number'])
    .execute()

  await entryChild('stints')
    .addColumn('stint_number', 'smallint', (col) => col.notNull())
    .addColumn('compound', 'text', (col) => col.notNull())
    .addColumn('lap_start', 'smallint', (col) => col.notNull())
    .addColumn('lap_end', 'smallint', (col) => col.notNull())
    .addColumn('tyre_age_at_start', 'smallint', (col) => col.notNull().defaultTo(0))
    .addUniqueConstraint('stints_entry_number_uq', ['driver_entry_id', 'stint_number'])
    .execute()

  await entryChild('pit_stops')
    .addColumn('lap_number', 'smallint', (col) => col.notNull())
    .addColumn('lane_duration', 'double precision')
    .addColumn('stop_duration', 'double precision')
    .addUniqueConstraint('pit_stops_entry_lap_uq', ['driver_entry_id', 'lap_number'])
    .execute()

  await entryChild('results')
    .addColumn('position', 'smallint')
    .addColumn('grid_position', 'smallint')
    .addColumn('status', 'text', (col) =>
      col.notNull().check(sql`status IN ('finished', 'dnf', 'dns', 'dsq')`),
    )
    .addColumn('points', 'real', (col) => col.notNull().defaultTo(0))
    .addColumn('laps_completed', 'smallint', (col) => col.notNull().defaultTo(0))
    .addColumn('race_time', 'double precision')
    .addColumn('gap_to_leader', 'text')
    .addUniqueConstraint('results_entry_uq', ['driver_entry_id'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  const tables = ['results', 'pit_stops', 'stints', 'laps', 'driver_entries', 'drivers', 'races', 'meetings']
  for (const table of tables) {
    await db.schema.dropTable(table).ifExists().execute()
  }
  await sql`DROP TYPE IF EXISTS race_status`.execute(db)
}
