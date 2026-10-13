import { pino } from 'pino'
import { describe, expect, it, vi } from 'vitest'
import { OpenF1Client, OpenF1Error } from './client'

const logger = pino({ level: 'silent' })
const json = (body: unknown, status = 200, headers: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), { status, headers })

function clientWith(...responses: Response[]) {
  const fetchFn = vi.fn<typeof fetch>()
  for (const response of responses) fetchFn.mockResolvedValueOnce(response)
  const sleep = vi.fn(async (_ms: number) => {})
  const client = new OpenF1Client({
    baseUrl: 'https://api.test/v1',
    minIntervalMs: 0,
    logger,
    fetchFn,
    sleep,
  })
  return { client, fetchFn, sleep }
}

describe('OpenF1Client', () => {
  it('validates payloads and builds query strings', async () => {
    const { client, fetchFn } = clientWith(
      json([
        {
          driver_number: 1,
          stint_number: 1,
          lap_start: 1,
          lap_end: 20,
          compound: 'SOFT',
          tyre_age_at_start: 2,
        },
      ]),
    )
    const stints = await client.stints(9472)
    expect(stints[0]?.compound).toBe('SOFT')
    expect(String(fetchFn.mock.calls[0]?.[0])).toBe('https://api.test/v1/stints?session_key=9472')
  })

  it('treats 404 as an empty collection', async () => {
    const { client } = clientWith(json({ detail: 'No results found.' }, 404))
    await expect(client.pitStops(1)).resolves.toEqual([])
  })

  it('retries on 429 honouring Retry-After', async () => {
    const { client, sleep } = clientWith(json({}, 429, { 'retry-after': '3' }), json([]))
    await expect(client.laps(1)).resolves.toEqual([])
    expect(sleep).toHaveBeenCalledWith(3000)
  })

  it('rejects unexpected payloads', async () => {
    const { client } = clientWith(json([{ driver_number: 'one' }]))
    await expect(client.drivers(1)).rejects.toBeInstanceOf(OpenF1Error)
  })
})
