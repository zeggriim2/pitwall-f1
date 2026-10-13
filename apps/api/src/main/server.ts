import { createJobQueue } from '../ingestion/job-queue'
import { buildApp } from '../platform/http/app'
import { createContainer } from './container'

const container = createContainer('api')
const queue = await createJobQueue(container.config.DATABASE_URL)
const app = await buildApp({ ...container, queue })

const shutdown = async (signal: string) => {
  container.logger.info({ signal }, 'shutting down')
  await app.close()
  await queue.close()
  await container.dispose()
  process.exit(0)
}
process.once('SIGTERM', () => void shutdown('SIGTERM'))
process.once('SIGINT', () => void shutdown('SIGINT'))

await app.listen({ host: container.config.HOST, port: container.config.PORT })
container.logger.info(`API docs available at ${container.config.PUBLIC_API_URL}/docs`)
