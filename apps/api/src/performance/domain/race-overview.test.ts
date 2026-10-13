import { describe, expect, it } from 'vitest'
import { compareDrivers } from './driver-comparison'
import { driverData, race } from './fixtures.test-utils'
import { analyseRace } from './race-overview'
import { DEFAULT_ANALYSIS_OPTIONS } from './types'

const fast = [100, 90, 90.1, 90, 90.2, 90.1, 90, 90.1, 90.2, 90, 90.1, 90]
const slow = [101, 91, 91.5, 90.5, 91.8, 91, 90.4, 92, 91, 91.1, 91.3, 90.9]

describe('analyseRace', () => {
  const analysis = analyseRace(
    {
      race,
      drivers: [
        driverData(44, slow, {
          result: {
            position: 2,
            gridPosition: 5,
            status: 'finished',
            points: 18,
            lapsCompleted: 12,
            raceTime: null,
            gapToLeader: '+10s',
          },
        }),
        driverData(1, fast, {
          result: {
            position: 1,
            gridPosition: 1,
            status: 'finished',
            points: 25,
            lapsCompleted: 12,
            raceTime: null,
            gapToLeader: null,
          },
        }),
        driverData(16, [100, null], {
          result: {
            position: null,
            gridPosition: 2,
            status: 'dnf',
            points: 0,
            lapsCompleted: 1,
            raceTime: null,
            gapToLeader: null,
          },
        }),
      ],
    },
    DEFAULT_ANALYSIS_OPTIONS,
  )

  it('orders drivers by classification, retirements last', () => {
    expect(analysis.overview.drivers.map((d) => d.driver.driverNumber)).toEqual([1, 44, 16])
  })

  it('ranks race pace and computes the delta to the best', () => {
    const [winner, second, dnf] = analysis.overview.drivers
    expect(winner?.paceRank).toBe(1)
    expect(winner?.paceDeltaToBest).toBe(0)
    expect(second?.paceRank).toBe(2)
    expect(second?.paceDeltaToBest).toBeGreaterThan(0.8)
    expect(dnf?.paceRank).toBeNull()
  })

  it('extracts highlights and the fastest lap', () => {
    expect(analysis.overview.fastestLap).toEqual({ driverNumber: 1, time: 90, lap: 2 })
    expect(analysis.overview.highlights.bestRacePace?.driverNumber).toBe(1)
    expect(analysis.overview.highlights.biggestGainer).toEqual({ driverNumber: 44, value: 3 })
    expect(analysis.overview.totalLaps).toBe(12)
    expect(analysis.overview.positionChart[0]?.positions).toHaveLength(12)
  })

  it('compares two drivers lap by lap with a cumulative gap', () => {
    const a = analysis.performances.get(1)
    const b = analysis.performances.get(44)
    if (!a || !b) throw new Error('missing performance')
    const comparison = compareDrivers(race, a, b)

    expect(comparison.laps).toHaveLength(12)
    expect(comparison.laps[1]?.delta).toBe(-1)
    expect(comparison.laps[11]?.gap).toBeLessThan(0)
    expect(comparison.summary.aFasterLaps).toBeGreaterThan(comparison.summary.bFasterLaps)
    expect(comparison.summary.medianDelta).toBeLessThan(0)
  })
})
