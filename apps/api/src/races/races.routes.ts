import { ApiError, RaceList, SeasonList, SyncAccepted, YearParams } from '@pitwall/contracts'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import { z } from 'zod'
import type { JobQueue } from '../ingestion/job-queue'
import type { RaceRepository } from './race.repository'

export interface RacesRoutesDeps {
  races: RaceRepository
  queue: JobQueue
}

export const racesRoutes =
  (deps: RacesRoutesDeps): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      '/seasons',
      {
        schema: {
          tags: ['Races'],
          summary: 'List seasons known to Pitwall',
          response: { 200: SeasonList },
        },
      },
      async () => ({ seasons: await deps.races.listSeasons() }),
    )

    app.get(
      '/seasons/:year/races',
      {
        schema: {
          tags: ['Races'],
          summary: 'List the Grands Prix of a season with their ingestion status',
          params: YearParams,
          response: { 200: RaceList },
        },
      },
      async (request) => ({
        year: request.params.year,
        races: await deps.races.listByYear(request.params.year),
      }),
    )

    app.post(
      '/seasons/:year/sync',
      {
        schema: {
          tags: ['Ingestion'],
          summary: 'Enqueue the import of a season from OpenF1',
          description:
            'Asynchronous: a Graphile Worker job fetches the calendar, then one job per finished race. ' +
            'Jobs are deduplicated by key, so calling this twice is safe.',
          params: YearParams,
          querystring: z.object({ force: z.stringbool().optional() }),
          response: { 202: SyncAccepted, 400: ApiError },
        },
      },
      async (request, reply) => {
        const { year } = request.params
        const jobId = await deps.queue.enqueueSeasonSync(year, request.query.force ?? false)
        return reply.code(202).send({ jobId, year, message: `Season ${year} sync enqueued` })
      },
    )
  }
