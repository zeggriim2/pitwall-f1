import { Migrator } from 'kysely/migration'
import type { Db } from './database'
import * as m0001 from './migrations/0001_initial_schema'

/**
 * Migrations are imported statically so the bundled build (tsup) ships them
 * without relying on a migrations folder on disk.
 */
export function createMigrator(db: Db): Migrator {
  return new Migrator({
    db,
    provider: {
      getMigrations: async () => ({
        '0001_initial_schema': m0001,
      }),
    },
  })
}
