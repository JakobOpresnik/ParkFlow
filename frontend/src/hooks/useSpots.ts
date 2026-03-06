import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
import type { SpotCoordinates, SpotStatus } from '@/types'

export function useSpots() {
  return useQuery({
    queryKey: ['spots'],
    queryFn: api.getSpots,
    refetchInterval: 15_000,
  })
}

export function useCreateSpot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createSpot,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['spots'] }),
  })
}

export function useUpdateSpot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof api.updateSpot>[1]
    }) => api.updateSpot(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['spots'] }),
  })
}

export function useDeleteSpot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteSpot,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['spots'] }),
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, owner_id }: { id: string; owner_id: string | null }) =>
      api.assignOwner(id, owner_id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['spots'] })
    },
  })
}

export function useUpdateStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: SpotStatus }) =>
      api.updateStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['spots'] })
    },
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
