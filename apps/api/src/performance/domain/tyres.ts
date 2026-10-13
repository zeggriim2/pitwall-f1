import type { TyreCompound } from '@pitwall/contracts'
import { match, P } from 'ts-pattern'
import type { StintInput } from './types'

export function normalizeCompound(raw: string | null | undefined): TyreCompound {
  return match(raw?.trim().toUpperCase())
    .with('SOFT', 'MEDIUM', 'HARD', 'INTERMEDIATE', 'WET', (compound) => compound)
    .with(P.union('INTER', 'INTERS'), () => 'INTERMEDIATE' as const)
    .otherwise(() => 'UNKNOWN' as const)
}

export interface TyreState {
  stint: StintInput | null
  compound: TyreCompound
  tyreAge: number | null
}

export function tyreStateAt(lapNumber: number, stints: readonly StintInput[]): TyreState {
  const stint = stints.find((s) => lapNumber >= s.lapStart && lapNumber <= s.lapEnd) ?? null
  if (stint === null) return { stint: null, compound: 'UNKNOWN', tyreAge: null }
  return {
    stint,
    compound: normalizeCompound(stint.compound),
    tyreAge: stint.tyreAgeAtStart + (lapNumber - stint.lapStart),
  }
}
