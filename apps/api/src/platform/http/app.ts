import cors from '@fastify/cors'
import swagger from '@fastify/swagger'
import scalar from '@scalar/fastify-api-reference'
import Fastify, { type FastifyBaseLogger, type FastifyInstance } from 'fastify'
import {
  hasZodFastifySchemaValidationErrors,
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from 'fastify-type-provider-zod'
import { match, P } from 'ts-pattern'
import { z } from 'zod'
import type { JobQueue } from '../../ingestion/job-queue'
import { performanceRoutes } from '../../performance/performance.routes'
import type { PerformanceService } from '../../performance/performance.service'
import type { RaceRepository } from '../../races/race.repository'
import { racesRoutes } from '../../races/races.routes'
import type { Cache } from '../cache'
import type { Config } from '../config'
import type { Db } from '../db/database'
import { NotFoundError, NotReadyError } from '../errors'
import type { Logger } from '../logger'

export interface AppDeps {
  config: Config
  logger: Logger
  db: Db
  cache: Cache
  queue: JobQueue
  races: RaceRepository
  performance: PerformanceService
}

/** Composition of the HTTP layer. Business modules only contribute routes. */
export async function buildApp(deps: AppDeps): Promise<FastifyInstance> {
  const app = Fastify({
    loggerInstance: deps.logger as FastifyBaseLogger,
  }).withTypeProvider<ZodTypeProvider>()
  app.setValidatorCompiler(validatorCompiler)
  app.setSerializerCompiler(serializerCompiler)

  await app.register(cors, { origin: deps.config.CORS_ORIGINS })
  await app.register(swagger, {
    openapi: {
      info: {
        title: 'Pitwall API',
        version: '0.1.0',
        description:
          'Formula 1 driver performance analytics, per race. Data: OpenF1. ' +
          'Every payload is described by a Zod schema shared with the app (`@pitwall/contracts`).',
      },
      servers: [{ url: deps.config.PUBLIC_API_URL }],
      tags: [
        { name: 'Races', description: 'Season calendar and race catalogue' },
        { name: 'Performance', description: 'Driver performance analysis' },
        { name: 'Ingestion', description: 'Background import from OpenF1' },
        { name: 'Platform', description: 'Operational endpoints' },
      ],
    },
    transform: jsonSchemaTransform,
  })
  await app.register(scalar, {
    routePrefix: '/docs',
    configuration: { title: 'Pitwall API', theme: 'saturn', darkMode: true },
  })

  app.setErrorHandler((error, request, reply) => {
    const [status, body] = match(error)
      .with(P.instanceOf(NotFoundError), (e) => [404, { error: 'not_found', message: e.message }] as const)
      .with(P.instanceOf(NotReadyError), (e) => [409, { error: 'not_ready', message: e.message }] as const)
      .when(
        hasZodFastifySchemaValidationErrors,
        (e) => [400, { error: 'bad_request', message: e.message }] as const,
      )
      .otherwise((e) => {
        request.log.error({ err: e }, 'unhandled error')
        return [500, { error: 'internal_error', message: 'Something went wrong' }] as const
      })
    return reply.code(status).send(body)
  })

  app.get(
    '/health',
    {
      schema: {
        tags: ['Platform'],
        summary: 'Liveness and dependency checks',
        response: {
          200: z.object({ status: z.literal('ok'), postgres: z.boolean(), redis: z.boolean() }),
          503: z.object({ status: z.literal('degraded'), postgres: z.boolean(), redis: z.boolean() }),
        },
      },
    },
    async (_request, reply) => {
      const postgres = await deps.db
        .selectNoFrom((eb) => eb.lit(1).as('ok'))
        .execute()
        .then(() => true)
        .catch(() => false)
      const redis = await deps.cache.ping()
      return postgres
        ? reply.code(200).send({ status: 'ok' as const, postgres, redis })
        : reply.code(503).send({ status: 'degraded' as const, postgres, redis })
    },
  )

  await app.register(
    async (api) => {
      await api.register(racesRoutes({ races: deps.races, queue: deps.queue }))
      await api.register(performanceRoutes(deps.performance))
    },
    { prefix: '/api' },
  )

  return app
}
