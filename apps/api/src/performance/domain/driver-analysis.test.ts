import { describe, expect, it } from 'vitest'
import { analyseDriver } from './driver-analysis'
import { driverData } from './fixtures.test-utils'
import { DEFAULT_ANALYSIS_OPTIONS } from './types'

describe('analyseDriver', () => {
  it('computes pace metrics from representative laps only', () => {
    const data = driverData(1, [100, 91, 91.2, 91.4, 91.6, 91.8, 130])
    const analysis = analyseDriver(data, DEFAULT_ANALYSIS_OPTIONS)

    expect(analysis.pace.bestLap).toBe(91)
    expect(analysis.pace.bestLapNumber).toBe(2)
    expect(analysis.pace.cleanLaps).toBe(5)
    expect(analysis.pace.medianPace).toBe(91.4)
    expect(analysis.pace.consistency).toBeCloseTo(0.316, 3)
    expect(analysis.pace.theoreticalBest).toBeCloseTo(91, 3)
    expect(analysis.pace.topSpeed).toBe(304)
  })

  it('measures tyre degradation, with and without fuel correction', () => {
    // +0.1 s per lap of tyre wear on a 0-lap-old set.
    const times = [100, ...Array.from({ length: 10 }, (_, i) => 90 + 0.1 * (i + 1))]
    const analysis = analyseDriver(driverData(1, times), DEFAULT_ANALYSIS_OPTIONS)
    const [stint] = analysis.stints

    expect(stint?.compound).toBe('MEDIUM')
    expect(stint?.degradation).toBeCloseTo(0.1, 4)
    expect(stint?.fuelCorrectedDegradation).toBeCloseTo(0.135, 4)
  })

  it('annotates every lap with tyre compound and age', () => {
    const data = driverData(1, [100, 91, 91, 91], {
      stints: [
        { stintNumber: 1, compound: 'SOFT', lapStart: 1, lapEnd: 2, tyreAgeAtStart: 3 },
        { stintNumber: 2, compound: 'hard', lapStart: 3, lapEnd: 4, tyreAgeAtStart: 0 },
      ],
    })
    const { laps } = analyseDriver(data, DEFAULT_ANALYSIS_OPTIONS)
    expect(laps.map((lap) => [lap.compound, lap.tyreAge])).toEqual([
      ['SOFT', 3],
      ['SOFT', 4],
      ['HARD', 0],
      ['HARD', 1],
    ])
  })

  it('derives positions gained from grid and finish', () => {
    const data = driverData(1, [100, 91], {
      result: {
        position: 3,
        gridPosition: 8,
        status: 'finished',
        points: 15,
        lapsCompleted: 2,
        raceTime: 191,
        gapToLeader: '+4.2s',
      },
    })
    expect(analyseDriver(data, DEFAULT_ANALYSIS_OPTIONS).result.positionsGained).toBe(5)
  })
})
