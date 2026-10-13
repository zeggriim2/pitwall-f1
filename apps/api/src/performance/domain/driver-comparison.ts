import type { ComparisonLap, DriverComparison } from '@pitwall/contracts'
import type { DriverPerformance } from './driver-analysis'
import { median, round } from './statistics'

/**
 * Head-to-head comparison. The cumulative gap uses the timestamp at which each
 * driver crossed the line, so it stays correct even when a lap time is missing.
 */
export function compareDrivers(
  race: DriverComparison['race'],
  a: DriverPerformance,
  b: DriverPerformance,
): DriverComparison {
  const lapsA = new Map(a.classified.map((entry) => [entry.lap.lapNumber, entry]))
  const lapsB = new Map(b.classified.map((entry) => [entry.lap.lapNumber, entry]))
  const lastLap = Math.max(0, ...lapsA.keys(), ...lapsB.keys())

  const laps: ComparisonLap[] = []
  const representativeDeltas: number[] = []
  let aFasterLaps = 0
  let bFasterLaps = 0

  for (let lap = 1; lap <= lastLap; lap++) {
    const entryA = lapsA.get(lap)
    const entryB = lapsB.get(lap)
    const timeA = entryA?.lap.duration ?? null
    const timeB = entryB?.lap.duration ?? null
    const delta = timeA !== null && timeB !== null ? timeA - timeB : null

    if (delta !== null && entryA?.exclusion === null && entryB?.exclusion === null) {
      representativeDeltas.push(delta)
      if (delta < 0) aFasterLaps++
      else if (delta > 0) bFasterLaps++
    }

    const endA = lapEnd(entryA?.lap)
    const endB = lapEnd(entryB?.lap)
    laps.push({
      lap,
      a: round(timeA),
      b: round(timeB),
      delta: round(delta),
      gap: endA !== null && endB !== null ? round((endA - endB) / 1000) : null,
    })
  }

  return {
    race,
    a: a.data.driver,
    b: b.data.driver,
    laps,
    summary: { aFasterLaps, bFasterLaps, medianDelta: round(median(representativeDeltas)) },
  }
}

function lapEnd(lap: { dateStart: Date | null; duration: number | null } | undefined): number | null {
  if (!lap?.dateStart || lap.duration === null) return null
  return lap.dateStart.getTime() + lap.duration * 1000
}
