import { describe, expect, it } from 'vitest'
import { formatGap, mapRace, resultStatus } from './race-mapping'

describe('race mapping', () => {
  it('maps result flags and gaps', () => {
    expect(resultStatus({ dnf: true, dns: false, dsq: false })).toBe('dnf')
    expect(resultStatus({ dnf: true, dns: false, dsq: true })).toBe('dsq')
    expect(resultStatus({ dnf: false, dns: false, dsq: false })).toBe('finished')
    expect(formatGap(0)).toBeNull()
    expect(formatGap(12.3456)).toBe('+12.346s')
    expect(formatGap('+1 LAP')).toBe('+1 LAP')
    expect(formatGap(null)).toBeNull()
  })

  it('maps a race, resolving grid, lap positions and open stints', () => {
    const rows = mapRace(9472, {
      drivers: [
        {
          driver_number: 1,
          name_acronym: 'VER',
          full_name: 'Max VERSTAPPEN',
          broadcast_name: null,
          team_name: 'Red Bull Racing',
          team_colour: '3671C6',
          headshot_url: null,
        },
      ],
      laps: [
        {
          driver_number: 1,
          lap_number: 1,
          date_start: '2024-03-02T15:03:42Z',
          lap_duration: 97.7,
          duration_sector_1: 32.8,
          duration_sector_2: 41.2,
          duration_sector_3: 23.6,
          st_speed: 251,
          is_pit_out_lap: false,
        },
        // Unknown driver: ignored.
        {
          driver_number: 99,
          lap_number: 1,
          date_start: null,
          lap_duration: null,
          duration_sector_1: null,
          duration_sector_2: null,
          duration_sector_3: null,
          st_speed: null,
          is_pit_out_lap: false,
        },
      ],
      stints: [
        {
          driver_number: 1,
          stint_number: 1,
          lap_start: 1,
          lap_end: null,
          compound: 'SOFT',
          tyre_age_at_start: 3,
        },
      ],
      pitStops: [],
      positions: [
        { driver_number: 1, position: 1, date: '2024-03-02T14:03:47Z' },
        { driver_number: 1, position: 2, date: '2024-03-02T15:04:00Z' },
      ],
      results: [
        {
          driver_number: 1,
          position: 1,
          number_of_laps: 57,
          points: 26,
          dnf: false,
          dns: false,
          dsq: false,
          duration: 5504.742,
          gap_to_leader: 0,
        },
      ],
    })

    expect(rows.drivers[0]?.team_colour).toBe('3671c6')
    expect(rows.laps).toHaveLength(1)
    expect(rows.laps[0]?.position).toBe(2)
    expect(rows.stints[0]?.lap_end).toBe(1)
    expect(rows.results[0]).toMatchObject({ grid_position: 1, status: 'finished', race_time: 5504.742 })
  })
})
