import type { DriverRef, RaceSummary } from '@pitwall/contracts'
import type { DriverRaceData, LapInput } from './types'

export const race: RaceSummary = {
  sessionKey: 9472,
  meetingKey: 1229,
  year: 2024,
  round: 1,
  name: 'Bahrain Grand Prix',
  officialName: 'FORMULA 1 GULF AIR BAHRAIN GRAND PRIX 2024',
  countryName: 'Bahrain',
  countryCode: 'BRN',
  circuit: 'Sakhir',
  location: 'Sakhir',
  dateStart: '2024-03-02T15:00:00.000Z',
  status: 'ready',
  ingestedAt: '2024-03-03T10:00:00.000Z',
}

export function driver(driverNumber: number, overrides: Partial<DriverRef> = {}): DriverRef {
  return {
    driverNumber,
    acronym: `D${driverNumber}`,
    fullName: `Driver ${driverNumber}`,
    teamName: 'Test Team',
    teamColour: 'ff0000',
    headshotUrl: null,
    ...overrides,
  }
}

const START = Date.parse('2024-03-02T15:03:00Z')

/** Builds consecutive laps from a list of lap times; timestamps are chained. */
export function lapsFrom(
  times: Array<number | null>,
  overrides: Partial<Record<number, Partial<LapInput>>> = {},
) {
  let clock = START
  return times.map((duration, index): LapInput => {
    const lapNumber = index + 1
    const lap: LapInput = {
      lapNumber,
      duration,
      sectors: duration === null ? [null, null, null] : [duration * 0.3, duration * 0.4, duration * 0.3],
      speedTrap: 300 + (index % 5),
      isPitOutLap: false,
      dateStart: new Date(clock),
      position: null,
      ...overrides[lapNumber],
    }
    clock += (duration ?? 95) * 1000
    return lap
  })
}

export function driverData(number: number, times: Array<number | null>, extra: Partial<DriverRaceData> = {}) {
  return {
    driver: driver(number),
    laps: lapsFrom(times),
    stints: [{ stintNumber: 1, compound: 'MEDIUM', lapStart: 1, lapEnd: times.length, tyreAgeAtStart: 0 }],
    pitStops: [],
    result: null,
    ...extra,
  } satisfies DriverRaceData
}
