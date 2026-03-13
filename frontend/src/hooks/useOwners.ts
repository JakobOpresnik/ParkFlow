import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
import type { Owner } from '@/types'

export function useOwners() {
  return useQuery({
    queryKey: ['owners'],
    queryFn: api.getOwners,
  })
}

export function useCreateOwner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Omit<Owner, 'id' | 'created_at'>) =>
      api.createOwner(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['owners'] })
    },
  })
}

export function useUpdateOwner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string
      data: Partial<Omit<Owner, 'id' | 'created_at'>>
    }) => api.updateOwner(id, data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['owners'] })
      void qc.invalidateQueries({ queryKey: ['spots'] })
    },
  })
}

export function useLinkOwner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, username }: { id: string; username: string | null }) =>
      api.linkOwner(id, username),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['owners'] })
    },
  })
}

export function useDeleteOwner() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteOwner(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['owners'] })
      void qc.invalidateQueries({ queryKey: ['spots'] })
    },
  })
}
