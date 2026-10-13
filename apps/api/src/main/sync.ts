import { createJobQueue } from '../ingestion/job-queue'
import { createContainer } from './container'

/**
 * CLI: enqueue season imports, e.g. `pnpm sync 2024 2025` or `pnpm sync 2025 --force`.
 * The worker does the actual work; this only writes jobs to PostgreSQL.
 */
const args = process.argv.slice(2)
const force = args.includes('--force')
const years = args.filter((arg) => /^\d{4}$/.test(arg)).map(Number)
if (years.length === 0) years.push(new Date().getFullYear() - 1)

const { config, logger, dispose } = createContainer('sync')
const queue = await createJobQueue(config.DATABASE_URL)
for (const year of years) {
  const jobId = await queue.enqueueSeasonSync(year, force)
  logger.info({ year, jobId, force }, 'season sync enqueued — follow progress with `task logs -- worker`')
}
await queue.close()
await dispose()
