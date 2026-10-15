import {
  ApiError,
  CompareQuery,
  DriverAnalysis,
  DriverComparison,
  DriverParams,
  RaceOverview,
  RaceParams,
} from '@pitwall/contracts'
import type { FastifyPluginAsyncZod } from 'fastify-type-provider-zod'
import type { PerformanceService } from './performance.service'

const errors = { 404: ApiError, 409: ApiError }

export const performanceRoutes =
  (service: PerformanceService): FastifyPluginAsyncZod =>
  async (app) => {
    app.get(
      '/races/:raceId',
      {
        schema: {
          tags: ['Performance'],
          summary: 'Race overview: classification, race-pace ranking, highlights and position chart',
          params: RaceParams,
          response: { 200: RaceOverview, ...errors },
        },
      },
      (request) => service.getRaceOverview(request.params.raceId),
    )

    app.get(
      '/races/:raceId/drivers/:driverNumber',
      {
        schema: {
          tags: ['Performance'],
          summary: 'Deep dive on one driver: laps, stints, tyre degradation, pit stops, sectors',
          params: DriverParams,
          response: { 200: DriverAnalysis, ...errors },
        },
      },
      (request) => service.getDriverAnalysis(request.params.raceId, request.params.driverNumber),
    )

    app.get(
      '/races/:raceId/compare',
      {
        schema: {
          tags: ['Performance'],
          summary: 'Head-to-head: lap deltas and cumulative gap between two drivers',
          params: RaceParams,
          querystring: CompareQuery,
          response: { 200: DriverComparison, ...errors },
        },
      },
      (request) => service.compare(request.params.raceId, request.query.a, request.query.b),
    )
  }
