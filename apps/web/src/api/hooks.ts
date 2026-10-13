import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './client'

export const queryKeys = {
  seasons: ['seasons'] as const,
  races: (year: number) => ['races', year] as const,
  overview: (sessionKey: number) => ['overview', sessionKey] as const,
  driver: (sessionKey: number, driverNumber: number) => ['driver', sessionKey, driverNumber] as const,
  compare: (sessionKey: number, a: number, b: number) => ['compare', sessionKey, a, b] as const,
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

export function useRaceOverview(sessionKey: number) {
  return useQuery({ queryKey: queryKeys.overview(sessionKey), queryFn: () => api.overview(sessionKey) })
}

export function useDriverAnalysis(sessionKey: number, driverNumber: number) {
  return useQuery({
    queryKey: queryKeys.driver(sessionKey, driverNumber),
    queryFn: () => api.driver(sessionKey, driverNumber),
  })
}

export function useComparison(sessionKey: number, a: number, b: number | null) {
  return useQuery({
    queryKey: queryKeys.compare(sessionKey, a, b ?? 0),
    queryFn: () => api.compare(sessionKey, a, b as number),
    enabled: b !== null && b !== a,
  })
}
