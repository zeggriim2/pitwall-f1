import { type Kysely, sql } from 'kysely'

export async function up(db: Kysely<unknown>): Promise<void> {
  await db.schema
    .createTable('meetings')
    .addColumn('meeting_key', 'integer', (col) => col.primaryKey())
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

  await db.schema
    .createTable('races')
    .addColumn('session_key', 'integer', (col) => col.primaryKey())
    .addColumn('meeting_key', 'integer', (col) =>
      col.notNull().references('meetings.meeting_key').onDelete('cascade'),
    )
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

  const raceChild = (table: string) =>
    db.schema
      .createTable(table)
      .addColumn('session_key', 'integer', (col) =>
        col.notNull().references('races.session_key').onDelete('cascade'),
      )
      .addColumn('driver_number', 'smallint', (col) => col.notNull())

  await raceChild('drivers')
    .addColumn('acronym', 'text', (col) => col.notNull())
    .addColumn('full_name', 'text', (col) => col.notNull())
    .addColumn('team_name', 'text', (col) => col.notNull())
    .addColumn('team_colour', 'text', (col) => col.notNull())
    .addColumn('headshot_url', 'text')
    .addPrimaryKeyConstraint('drivers_pk', ['session_key', 'driver_number'])
    .execute()

  await raceChild('laps')
    .addColumn('lap_number', 'smallint', (col) => col.notNull())
    .addColumn('lap_duration', 'double precision')
    .addColumn('sector_1', 'double precision')
    .addColumn('sector_2', 'double precision')
    .addColumn('sector_3', 'double precision')
    .addColumn('speed_trap', 'smallint')
    .addColumn('is_pit_out_lap', 'boolean', (col) => col.notNull().defaultTo(false))
    .addColumn('date_start', 'timestamptz')
    .addColumn('position', 'smallint')
    .addPrimaryKeyConstraint('laps_pk', ['session_key', 'driver_number', 'lap_number'])
    .execute()

  await raceChild('stints')
    .addColumn('stint_number', 'smallint', (col) => col.notNull())
    .addColumn('compound', 'text', (col) => col.notNull())
    .addColumn('lap_start', 'smallint', (col) => col.notNull())
    .addColumn('lap_end', 'smallint', (col) => col.notNull())
    .addColumn('tyre_age_at_start', 'smallint', (col) => col.notNull().defaultTo(0))
    .addPrimaryKeyConstraint('stints_pk', ['session_key', 'driver_number', 'stint_number'])
    .execute()

  await raceChild('pit_stops')
    .addColumn('lap_number', 'smallint', (col) => col.notNull())
    .addColumn('lane_duration', 'double precision')
    .addColumn('stop_duration', 'double precision')
    .addPrimaryKeyConstraint('pit_stops_pk', ['session_key', 'driver_number', 'lap_number'])
    .execute()

  await raceChild('results')
    .addColumn('position', 'smallint')
    .addColumn('grid_position', 'smallint')
    .addColumn('status', 'text', (col) =>
      col.notNull().check(sql`status IN ('finished', 'dnf', 'dns', 'dsq')`),
    )
    .addColumn('points', 'real', (col) => col.notNull().defaultTo(0))
    .addColumn('laps_completed', 'smallint', (col) => col.notNull().defaultTo(0))
    .addColumn('race_time', 'double precision')
    .addColumn('gap_to_leader', 'text')
    .addPrimaryKeyConstraint('results_pk', ['session_key', 'driver_number'])
    .execute()
}

export async function down(db: Kysely<unknown>): Promise<void> {
  for (const table of ['results', 'pit_stops', 'stints', 'laps', 'drivers', 'races', 'meetings']) {
    await db.schema.dropTable(table).ifExists().execute()
  }
  await sql`DROP TYPE IF EXISTS race_status`.execute(db)
}
