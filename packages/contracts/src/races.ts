import { z } from 'zod'

export const RaceStatus = z.enum(['pending', 'ingesting', 'ready', 'failed'])
export type RaceStatus = z.infer<typeof RaceStatus>

export const RaceSummary = z.object({
  sessionKey: z.number().int(),
  meetingKey: z.number().int(),
  year: z.number().int(),
  round: z.number().int(),
  name: z.string(),
  officialName: z.string(),
  countryName: z.string(),
  countryCode: z.string(),
  circuit: z.string(),
  location: z.string(),
  dateStart: z.iso.datetime({ offset: true }),
  status: RaceStatus,
  ingestedAt: z.iso.datetime({ offset: true }).nullable(),
})
export type RaceSummary = z.infer<typeof RaceSummary>

export const Season = z.object({
  year: z.number().int(),
  races: z.number().int(),
  readyRaces: z.number().int(),
})
export type Season = z.infer<typeof Season>

export const SeasonList = z.object({ seasons: z.array(Season) })
export type SeasonList = z.infer<typeof SeasonList>

export const RaceList = z.object({ year: z.number().int(), races: z.array(RaceSummary) })
export type RaceList = z.infer<typeof RaceList>

export const YearParams = z.object({ year: z.coerce.number().int().min(2023).max(2100) })

export const SyncAccepted = z.object({
  jobId: z.string(),
  year: z.number().int(),
  message: z.string(),
})
export type SyncAccepted = z.infer<typeof SyncAccepted>
