import { z } from 'zod'

/** Primary keys are UUIDs owned by Pitwall — never an upstream provider key. */
export const Id = z.uuid()
export type Id = z.infer<typeof Id>

export const TyreCompound = z.enum(['SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', 'UNKNOWN'])
export type TyreCompound = z.infer<typeof TyreCompound>

export const ApiError = z.object({
  error: z.string(),
  message: z.string(),
})
export type ApiError = z.infer<typeof ApiError>

/** Seconds, as a float (lap times, sector times, gaps). */
export const Seconds = z.number().describe('Duration in seconds')

export const DriverRef = z.object({
  id: Id.describe('Stable driver identity, shared by every race the driver took part in'),
  driverNumber: z.number().int().describe('Racing number worn in this race'),
  acronym: z.string(),
  fullName: z.string(),
  teamName: z.string(),
  teamColour: z.string().describe('Hex colour without the leading #'),
  headshotUrl: z.string().nullable(),
})
export type DriverRef = z.infer<typeof DriverRef>
