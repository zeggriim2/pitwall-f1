export interface PositionSample {
  driverNumber: number
  position: number
  date: Date
}

export interface TimedLap {
  driverNumber: number
  lapNumber: number
  dateStart: Date | null
  duration: number | null
}

export interface ResolvedPositions {
  /** key = `${driverNumber}:${lapNumber}` */
  byLap: Map<string, number>
  /** First known position of each driver: the starting grid. */
  grid: Map<number, number>
}

export const lapKey = (driverNumber: number, lapNumber: number) => `${driverNumber}:${lapNumber}`

/**
 * OpenF1 publishes positions as a sparse timeline of changes. We project it on
 * laps: the position at the end of a lap is the latest sample before the
 * driver crossed the line.
 */
export function resolveLapPositions(
  laps: readonly TimedLap[],
  samples: readonly PositionSample[],
): ResolvedPositions {
  const timelines = new Map<number, PositionSample[]>()
  for (const sample of samples) {
    const timeline = timelines.get(sample.driverNumber) ?? []
    timeline.push(sample)
    timelines.set(sample.driverNumber, timeline)
  }
  const grid = new Map<number, number>()
  for (const [driverNumber, timeline] of timelines) {
    timeline.sort((a, b) => a.date.getTime() - b.date.getTime())
    const first = timeline[0]
    if (first) grid.set(driverNumber, first.position)
  }

  const byLap = new Map<string, number>()
  for (const lap of laps) {
    const timeline = timelines.get(lap.driverNumber)
    if (!timeline || !lap.dateStart) continue
    // Missing lap time (e.g. last lap of a retirement): fall back to the lap start.
    const crossedAt = lap.dateStart.getTime() + (lap.duration ?? 0) * 1000
    const position = latestBefore(timeline, crossedAt)
    if (position !== null) byLap.set(lapKey(lap.driverNumber, lap.lapNumber), position)
  }
  return { byLap, grid }
}

/** Binary search on a time-sorted timeline. */
function latestBefore(timeline: readonly PositionSample[], time: number): number | null {
  let low = 0
  let high = timeline.length - 1
  let found: number | null = null
  while (low <= high) {
    const mid = (low + high) >> 1
    const sample = timeline[mid] as PositionSample
    if (sample.date.getTime() <= time) {
      found = sample.position
      low = mid + 1
    } else {
      high = mid - 1
    }
  }
  return found
}
