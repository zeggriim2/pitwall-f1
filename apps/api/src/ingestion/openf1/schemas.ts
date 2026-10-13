import { z } from 'zod'

/**
 * OpenF1 payloads, validated at the boundary. Anything that does not match is
 * rejected loudly instead of leaking `undefined` into the database.
 * Fields we do not use are stripped by Zod.
 */
const nullableNumber = z
  .number()
  .nullable()
  .optional()
  .transform((v) => v ?? null)
const nullableString = z
  .string()
  .nullable()
  .optional()
  .transform((v) => v ?? null)

export const OpenF1Meeting = z.object({
  meeting_key: z.number().int(),
  meeting_name: z.string(),
  meeting_official_name: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  country_name: z.string(),
  country_code: z
    .string()
    .nullish()
    .transform((v) => v ?? ''),
  circuit_short_name: z.string(),
  location: z.string(),
  date_start: z.string(),
  year: z.number().int(),
})

export const OpenF1Session = z.object({
  session_key: z.number().int(),
  session_name: z.string(),
  session_type: z.string(),
  meeting_key: z.number().int(),
  date_start: z.string(),
  date_end: z.string(),
  year: z.number().int(),
  is_cancelled: z.boolean().optional().default(false),
})

export const OpenF1Driver = z.object({
  driver_number: z.number().int(),
  name_acronym: nullableString,
  full_name: nullableString,
  broadcast_name: nullableString,
  team_name: nullableString,
  team_colour: nullableString,
  headshot_url: nullableString,
})

export const OpenF1Lap = z.object({
  driver_number: z.number().int(),
  lap_number: z.number().int(),
  date_start: nullableString,
  lap_duration: nullableNumber,
  duration_sector_1: nullableNumber,
  duration_sector_2: nullableNumber,
  duration_sector_3: nullableNumber,
  st_speed: nullableNumber,
  is_pit_out_lap: z
    .boolean()
    .nullable()
    .optional()
    .transform((v) => v ?? false),
})

export const OpenF1Stint = z.object({
  driver_number: z.number().int(),
  stint_number: z.number().int(),
  lap_start: z.number().int().nullable(),
  lap_end: z.number().int().nullable(),
  compound: nullableString,
  tyre_age_at_start: nullableNumber,
})

export const OpenF1Pit = z.object({
  driver_number: z.number().int(),
  lap_number: z.number().int(),
  pit_duration: nullableNumber,
  lane_duration: nullableNumber,
  stop_duration: nullableNumber,
})

export const OpenF1Position = z.object({
  driver_number: z.number().int(),
  position: z.number().int(),
  date: z.string(),
})

export const OpenF1SessionResult = z.object({
  driver_number: z.number().int(),
  position: z
    .number()
    .int()
    .nullable()
    .optional()
    .transform((v) => v ?? null),
  number_of_laps: nullableNumber,
  points: nullableNumber,
  dnf: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  dns: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  dsq: z
    .boolean()
    .nullish()
    .transform((v) => v ?? false),
  duration: z.union([z.number(), z.array(z.number().nullable())]).nullish(),
  gap_to_leader: z.union([z.number(), z.string(), z.array(z.unknown())]).nullish(),
})

export type OpenF1Meeting = z.infer<typeof OpenF1Meeting>
export type OpenF1Session = z.infer<typeof OpenF1Session>
export type OpenF1Driver = z.infer<typeof OpenF1Driver>
export type OpenF1Lap = z.infer<typeof OpenF1Lap>
export type OpenF1Stint = z.infer<typeof OpenF1Stint>
export type OpenF1Pit = z.infer<typeof OpenF1Pit>
export type OpenF1Position = z.infer<typeof OpenF1Position>
export type OpenF1SessionResult = z.infer<typeof OpenF1SessionResult>
