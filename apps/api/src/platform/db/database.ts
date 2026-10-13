import { Kysely, PostgresDialect } from 'kysely'
import pg from 'pg'
import type { Database } from './schema'

export type Db = Kysely<Database>

// `real` / `numeric` come back as strings by default: parse them as JS numbers.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number.parseFloat(value))

export function createDatabase(connectionString: string): Db {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max: 10 }) }),
  })
}
