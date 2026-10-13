// k6 load test: a realistic browsing journey on the analysis endpoints.
// Run with `task load-test` (the stack must be up and at least one season imported).
import { check, group, sleep } from 'k6'
import http from 'k6/http'

const BASE_URL = __ENV.BASE_URL || 'http://localhost:3000'

export const options = {
  scenarios: {
    browsing: {
      executor: 'ramping-vus',
      stages: [
        { duration: '15s', target: 20 },
        { duration: '30s', target: 50 },
        { duration: '15s', target: 0 },
      ],
    },
  },
  thresholds: {
    http_req_failed: ['rate<0.01'],
    'http_req_duration{endpoint:overview}': ['p(95)<150'],
    'http_req_duration{endpoint:driver}': ['p(95)<150'],
    'http_req_duration{endpoint:compare}': ['p(95)<200'],
  },
}

export function setup() {
  const seasons = http.get(`${BASE_URL}/api/seasons`).json('seasons')
  const year = seasons.find((s) => s.readyRaces > 0)?.year
  if (!year) throw new Error('No ingested season: run `task sync` first')
  const races = http
    .get(`${BASE_URL}/api/seasons/${year}/races`)
    .json('races')
    .filter((r) => r.status === 'ready')
  return { races: races.map((r) => r.sessionKey) }
}

export default function ({ races }) {
  const sessionKey = races[Math.floor(Math.random() * races.length)]

  group('race overview', () => {
    const res = http.get(`${BASE_URL}/api/races/${sessionKey}`, { tags: { endpoint: 'overview' } })
    check(res, { 'overview 200': (r) => r.status === 200 })
    const drivers = res.json('drivers') || []
    if (drivers.length < 2) return

    const a = drivers[Math.floor(Math.random() * drivers.length)].driver.driverNumber
    const b = drivers[Math.floor(Math.random() * drivers.length)].driver.driverNumber
    sleep(1)

    group('driver deep dive', () => {
      const driver = http.get(`${BASE_URL}/api/races/${sessionKey}/drivers/${a}`, {
        tags: { endpoint: 'driver' },
      })
      check(driver, { 'driver 200': (r) => r.status === 200 })
      if (a !== b) {
        const compare = http.get(`${BASE_URL}/api/races/${sessionKey}/compare?a=${a}&b=${b}`, {
          tags: { endpoint: 'compare' },
        })
        check(compare, { 'compare 200': (r) => r.status === 200 })
      }
    })
  })
  sleep(1)
}
