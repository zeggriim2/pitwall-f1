import { createMigrator } from '../platform/db/migrator'
import { createContainer } from './container'

const { db, logger, dispose } = createContainer('migrate')
const direction = process.argv[2] === 'down' ? 'down' : 'latest'
const migrator = createMigrator(db)
const { error, results } =
  direction === 'down' ? await migrator.migrateDown() : await migrator.migrateToLatest()

for (const result of results ?? []) {
  logger.info({ migration: result.migrationName, direction: result.direction, status: result.status })
}
await dispose()
if (error) {
  logger.error({ err: error }, 'migration failed')
  process.exit(1)
}
logger.info(results?.length ? 'migrations applied' : 'database already up to date')
