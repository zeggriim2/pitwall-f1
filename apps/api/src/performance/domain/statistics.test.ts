import { describe, expect, it } from 'vitest'
import { linearRegression, mean, median, round, standardDeviation } from './statistics'

describe('statistics', () => {
  it('computes mean and median', () => {
    expect(mean([1, 2, 3, 4])).toBe(2.5)
    expect(median([5, 1, 3])).toBe(3)
    expect(median([4, 1, 3, 2])).toBe(2.5)
    expect(median([])).toBeNull()
  })

  it('computes the sample standard deviation', () => {
    expect(standardDeviation([2, 4, 4, 4, 5, 5, 7, 9])).toBeCloseTo(2.138, 3)
    expect(standardDeviation([1])).toBeNull()
  })

  it('fits a straight line', () => {
    const fit = linearRegression([
      [0, 90],
      [1, 90.1],
      [2, 90.2],
      [3, 90.3],
    ])
    expect(fit?.slope).toBeCloseTo(0.1)
    expect(fit?.intercept).toBeCloseTo(90)
    expect(linearRegression([[1, 1]])).toBeNull()
    expect(
      linearRegression([
        [1, 1],
        [1, 2],
      ]),
    ).toBeNull()
  })

  it('rounds and guards against non-finite values', () => {
    expect(round(1.23456)).toBe(1.235)
    expect(round(Number.NaN)).toBeNull()
    expect(round(null)).toBeNull()
  })
})
