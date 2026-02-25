import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/api'

export function useLots() {
  return useQuery({
    queryKey: ['lots'],
    queryFn: api.getLots,
    staleTime: 60_000,
  })
}

export function useCreateLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.createLot,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lots'] }),
  })
}

export function useUpdateLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Parameters<typeof api.updateLot>[1]
    }) => api.updateLot(id, data),
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lots'] }),
  })
}

export function useDeleteLot() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: api.deleteLot,
    onSuccess: () => void qc.invalidateQueries({ queryKey: ['lots'] }),
  })
}
