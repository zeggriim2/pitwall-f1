import { z } from 'zod'
import type { Logger } from '../../platform/logger'
import {
  OpenF1Driver,
  OpenF1Lap,
  OpenF1Meeting,
  OpenF1Pit,
  OpenF1Position,
  OpenF1Session,
  OpenF1SessionResult,
  OpenF1Stint,
} from './schemas'

export interface OpenF1ClientOptions {
  baseUrl: string
  /** Minimum delay between two requests (OpenF1 rate-limits anonymous clients). */
  minIntervalMs: number
  maxRetries?: number
  logger: Logger
  fetchFn?: typeof fetch
  sleep?: (ms: number) => Promise<void>
}

export class OpenF1Error extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message)
  }
}

type Query = Record<string, string | number>

/**
 * Typed, throttled and retrying client for https://openf1.org.
 * Calls are serialised through a promise chain so concurrent jobs in the same
 * process share a single rate budget.
 */
export class OpenF1Client {
  private queue: Promise<unknown> = Promise.resolve()
  private lastCall = 0
  private readonly fetchFn: typeof fetch
  private readonly sleep: (ms: number) => Promise<void>

  constructor(private readonly options: OpenF1ClientOptions) {
    this.fetchFn = options.fetchFn ?? fetch
    this.sleep = options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
  }

  meetings(year: number) {
    return this.list('meetings', { year }, OpenF1Meeting)
  }
  raceSessions(year: number) {
    return this.list('sessions', { year, session_name: 'Race' }, OpenF1Session)
  }
  drivers(sessionKey: number) {
    return this.list('drivers', { session_key: sessionKey }, OpenF1Driver)
  }
  laps(sessionKey: number) {
    return this.list('laps', { session_key: sessionKey }, OpenF1Lap)
  }
  stints(sessionKey: number) {
    return this.list('stints', { session_key: sessionKey }, OpenF1Stint)
  }
  pitStops(sessionKey: number) {
    return this.list('pit', { session_key: sessionKey }, OpenF1Pit)
  }
  positions(sessionKey: number) {
    return this.list('position', { session_key: sessionKey }, OpenF1Position)
  }
  results(sessionKey: number) {
    return this.list('session_result', { session_key: sessionKey }, OpenF1SessionResult)
  }

  private list<T extends z.ZodType>(endpoint: string, query: Query, schema: T): Promise<z.output<T>[]> {
    const run = this.queue.then(() => this.request(endpoint, query, z.array(schema)))
    this.queue = run.catch(() => undefined)
    return run
  }

  private async request<T extends z.ZodType>(
    endpoint: string,
    query: Query,
    schema: T,
  ): Promise<z.output<T>> {
    const url = new URL(`${this.options.baseUrl.replace(/\/$/, '')}/${endpoint}`)
    for (const [key, value] of Object.entries(query)) url.searchParams.set(key, String(value))
    const maxRetries = this.options.maxRetries ?? 4

    for (let attempt = 0; ; attempt++) {
      await this.throttle()
      const startedAt = Date.now()
      const response = await this.fetchFn(url, { headers: { accept: 'application/json' } })
      this.options.logger.debug({ url: url.toString(), status: response.status, ms: Date.now() - startedAt })

      // OpenF1 answers 404 "No results found" for an empty collection.
      if (response.status === 404) return schema.parse([])

      if (response.ok) {
        const parsed = schema.safeParse(await response.json())
        if (!parsed.success) {
          throw new OpenF1Error(`Unexpected payload from ${endpoint}: ${z.prettifyError(parsed.error)}`, 502)
        }
        return parsed.data
      }

      const retryable = response.status === 429 || response.status >= 500
      if (!retryable || attempt >= maxRetries) {
        throw new OpenF1Error(`OpenF1 ${endpoint} responded ${response.status}`, response.status)
      }
      const retryAfter = Number(response.headers.get('retry-after'))
      const backoff = Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter * 1000 : 2 ** attempt * 2000
      this.options.logger.warn({ endpoint, status: response.status, backoff }, 'OpenF1 throttled, retrying')
      await this.sleep(backoff)
    }
  }

  private async throttle() {
    const wait = this.lastCall + this.options.minIntervalMs - Date.now()
    if (wait > 0) await this.sleep(wait)
    this.lastCall = Date.now()
  }
}
