import { Kysely, type LogEvent, PostgresDialect } from 'kysely'
import pg from 'pg'
import { match } from 'ts-pattern'
import type { Logger } from '../logger'
import type { Database } from './schema'

export type Db = Kysely<Database>

// `real` / `numeric` come back as strings by default: parse them as JS numbers.
pg.types.setTypeParser(pg.types.builtins.NUMERIC, (value) => Number.parseFloat(value))

export function createDatabase(connectionString: string, logger: Logger): Db {
  return new Kysely<Database>({
    dialect: new PostgresDialect({ pool: new pg.Pool({ connectionString, max: 10 }) }),
    log: createQueryLogger(logger),
  })
}

/** Failed queries always surface; the SQL itself only at `LOG_LEVEL=debug`. */
function createQueryLogger(logger: Logger): (event: LogEvent) => void {
  const sqlLogger = logger.child({ component: 'sql' })
  return (event) => {
    const query = {
      sql: event.query.sql,
      params: event.query.parameters,
      durationMs: Math.round(event.queryDurationMillis),
    }
    match(event)
      .with({ level: 'error' }, ({ error }) => sqlLogger.error({ ...query, err: error }, 'query failed'))
      .with({ level: 'query' }, () => sqlLogger.debug(query, 'query'))
      .exhaustive()
  }
}
