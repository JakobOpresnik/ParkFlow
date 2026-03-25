import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
import { invalidateAllSpotQueries } from '@/lib/queryClient'
import type { SpotCoordinates, SpotStatus } from '@/types'

export function useSpots() {
  return useQuery({
    queryKey: ['spots'],
    queryFn: api.getSpots,
    refetchInterval: 15_000,
  })
}

export function useSpotDayOverrides(date: string) {
  return useQuery({
    queryKey: ['spots', 'day-overrides', date],
    queryFn: () => api.getSpotDayOverrides(date),
    enabled: !!date,
    staleTime: 30_000,
  })
}

export function useCreateSpot() {
  return useMutation({
    mutationFn: api.createSpot,
    onSuccess: invalidateAllSpotQueries,
  })
}

export function useUpdateSpot() {
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof api.updateSpot>[1]
    }) => api.updateSpot(id, data),
    onSuccess: invalidateAllSpotQueries,
  })
}

export function useDeleteSpot() {
  return useMutation({
    mutationFn: api.deleteSpot,
    onSuccess: invalidateAllSpotQueries,
  })
}

export function useSpotByNumber(number: number | null) {
  return useQuery({
    queryKey: ['spots', 'number', number],
    queryFn: () => api.getSpotByNumber(number!),
    enabled: number !== null,
  })
}

export function useAssignOwner() {
  return useMutation({
    mutationFn: ({ id, owner_id }: { id: string; owner_id: string | null }) =>
      api.assignOwner(id, owner_id),
    onSuccess: invalidateAllSpotQueries,
  })
}

export function useUpdateStatus() {
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SpotStatus }) =>
      api.updateStatus(id, status),
    onSuccess: invalidateAllSpotQueries,
  })
}

export function usePatchCoordinates() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      coordinates,
    }: {
      id: string
      coordinates: SpotCoordinates | null
    }) => api.patchCoordinates(id, coordinates),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['spots'] }),
  })
}
