import { describe, expect, it } from 'vitest'
import { lapsFrom } from './fixtures.test-utils'
import { classifyLaps, representativeTimes } from './lap-classification'

describe('classifyLaps', () => {
  it('excludes opening lap, pit laps, missing times and safety-car outliers', () => {
    const laps = lapsFrom([100, 92, 92.2, null, 99.5, 120, 92.4, 92.1], { 7: { isPitOutLap: true } })
    const classified = classifyLaps(laps, [{ lapNumber: 6, laneDuration: 22, stopDuration: 2.4 }], 1.07)

    expect(classified.map((entry) => entry.exclusion)).toEqual([
      'opening_lap',
      null,
      null,
      'no_time',
      'outlier',
      'pit_in',
      'pit_out',
      null,
    ])
    expect(representativeTimes(classified)).toEqual([92, 92.2, 92.1])
    expect(classified[5]?.isPitInLap).toBe(true)
  })

  it('keeps everything when no reference pace exists', () => {
    const classified = classifyLaps(lapsFrom([null, null]), [], 1.07)
    expect(classified.every((entry) => entry.exclusion === 'no_time')).toBe(true)
  })
})
