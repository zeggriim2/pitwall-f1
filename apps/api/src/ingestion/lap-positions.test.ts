import { describe, expect, it } from 'vitest'
import { lapKey, resolveLapPositions } from './lap-positions'

const at = (seconds: number) => new Date(Date.UTC(2024, 2, 2, 15, 0, seconds))

describe('resolveLapPositions', () => {
  it('projects the position timeline onto lap ends and extracts the grid', () => {
    const { byLap, grid } = resolveLapPositions(
      [
        { driverNumber: 1, lapNumber: 1, dateStart: at(0), duration: 10 },
        { driverNumber: 1, lapNumber: 2, dateStart: at(10), duration: 10 },
        { driverNumber: 1, lapNumber: 3, dateStart: at(20), duration: null },
        { driverNumber: 2, lapNumber: 1, dateStart: null, duration: 10 },
      ],
      [
        { driverNumber: 1, position: 4, date: at(-60) },
        { driverNumber: 1, position: 2, date: at(15) },
        { driverNumber: 1, position: 3, date: at(5) },
        { driverNumber: 2, position: 1, date: at(-60) },
      ],
    )

    expect(grid.get(1)).toBe(4)
    expect(grid.get(2)).toBe(1)
    expect(byLap.get(lapKey(1, 1))).toBe(3)
    expect(byLap.get(lapKey(1, 2))).toBe(2)
    expect(byLap.get(lapKey(1, 3))).toBe(2)
    expect(byLap.has(lapKey(2, 1))).toBe(false)
  })
})
