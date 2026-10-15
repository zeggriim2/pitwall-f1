import type { Id } from '@pitwall/contracts'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export const queryKeys = {
  seasons: ['seasons'] as const,
  races: (year: number) => ['races', year] as const,
  overview: (raceId: Id) => ['overview', raceId] as const,
  driver: (raceId: Id, driverNumber: number) => ['driver', raceId, driverNumber] as const,
  compare: (raceId: Id, a: number, b: number) => ['compare', raceId, a, b] as const,
}

export function useSeasons() {
  return useQuery({ queryKey: queryKeys.seasons, queryFn: api.seasons })
}

export function useRaces(year: number | null) {
  return useQuery({
    queryKey: queryKeys.races(year ?? 0),
    queryFn: () => api.races(year as number),
    enabled: year !== null,
    // While an import runs, poll so the cards light up one by one.
    refetchInterval: (query) =>
      query.state.data?.races.some((race) => race.status === 'pending' || race.status === 'ingesting')
        ? 4000
        : false,
  })
}

export function useSyncSeason() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: api.syncSeason,
    onSuccess: (_data, year) => {
      // The calendar appears after the first job runs: poll seasons for a bit.
      setTimeout(() => {
        void client.invalidateQueries({ queryKey: queryKeys.seasons })
        void client.invalidateQueries({ queryKey: queryKeys.races(year) })
      }, 5000)
    },
  })
}

export function useRaceOverview(raceId: Id) {
  return useQuery({ queryKey: queryKeys.overview(raceId), queryFn: () => api.overview(raceId) })
}

export function useDriverAnalysis(raceId: Id, driverNumber: number) {
  return useQuery({
    queryKey: queryKeys.driver(raceId, driverNumber),
    queryFn: () => api.driver(raceId, driverNumber),
  })
}

export function useComparison(raceId: Id, a: number, b: number | null) {
  return useQuery({
    queryKey: queryKeys.compare(raceId, a, b ?? 0),
    queryFn: () => api.compare(raceId, a, b as number),
    enabled: b !== null && b !== a,
  })
}
