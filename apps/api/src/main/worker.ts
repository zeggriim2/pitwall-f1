import { run } from 'graphile-worker'
import { createTaskList } from '../ingestion/jobs'
import { createContainer } from './container'

const container = createContainer('worker')

const runner = await run({
  connectionString: container.config.DATABASE_URL,
  concurrency: container.config.WORKER_CONCURRENCY,
  noHandleSignals: false,
  pollInterval: 1000,
  taskList: createTaskList(container),
})

container.logger.info({ concurrency: container.config.WORKER_CONCURRENCY }, 'worker started')
await runner.promise
await container.dispose()
