import type { Id } from '@pitwall/contracts'
import {
  ApiError,
  DriverAnalysis,
  DriverComparison,
  RaceList,
  RaceOverview,
  SeasonList,
  SyncAccepted,
} from '@pitwall/contracts'
import type { z } from 'zod'

/**
 * In Docker the app is served by nginx, which proxies /api to the API:
 * an empty base URL keeps requests same-origin. In local dev / on a device,
 * EXPO_PUBLIC_API_URL points to the API.
 */
const BASE_URL = (process.env.EXPO_PUBLIC_API_URL ?? '').replace(/\/$/, '')

export class ApiRequestError extends Error {
  constructor(
    readonly status: number,
    message: string,
  ) {
    super(message)
  }
}

/** Every response is validated against the shared contract: the types cannot lie. */
async function request<T extends z.ZodType>(
  path: string,
  schema: T,
  init?: RequestInit,
): Promise<z.output<T>> {
  const response = await fetch(`${BASE_URL}${path}`, {
    ...init,
    headers: { accept: 'application/json', ...init?.headers },
  })
  const body: unknown = await response.json().catch(() => null)
  if (!response.ok) {
    const error = ApiError.safeParse(body)
    throw new ApiRequestError(response.status, error.success ? error.data.message : response.statusText)
  }
  return schema.parse(body)
}

export const api = {
  seasons: () => request('/api/seasons', SeasonList),
  races: (year: number) => request(`/api/seasons/${year}/races`, RaceList),
  syncSeason: (year: number) => request(`/api/seasons/${year}/sync`, SyncAccepted, { method: 'POST' }),
  overview: (raceId: Id) => request(`/api/races/${raceId}`, RaceOverview),
  driver: (raceId: Id, driverNumber: number) =>
    request(`/api/races/${raceId}/drivers/${driverNumber}`, DriverAnalysis),
  compare: (raceId: Id, a: number, b: number) =>
    request(`/api/races/${raceId}/compare?a=${a}&b=${b}`, DriverComparison),
}
