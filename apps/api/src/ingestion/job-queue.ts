import { makeWorkerUtils, type WorkerUtils } from 'graphile-worker'
import { JOBS } from './jobs'

export interface JobQueue {
  enqueueSeasonSync(year: number, force?: boolean): Promise<string>
  enqueueRaceIngestion(sessionKey: number): Promise<string>
  close(): Promise<void>
}

export async function createJobQueue(connectionString: string): Promise<JobQueue> {
  const utils: WorkerUtils = await makeWorkerUtils({ connectionString })
  await utils.migrate()
  return {
    async enqueueSeasonSync(year, force = false) {
      const job = await utils.addJob(
        JOBS.syncSeason,
        { year, force },
        { jobKey: `${JOBS.syncSeason}:${year}` },
      )
      return job.id
    },
    async enqueueRaceIngestion(sessionKey) {
      const job = await utils.addJob(
        JOBS.ingestRace,
        { sessionKey },
        { jobKey: `${JOBS.ingestRace}:${sessionKey}`, maxAttempts: 3 },
      )
      return job.id
    },
    async close() {
      await utils.release()
    },
  }
}
