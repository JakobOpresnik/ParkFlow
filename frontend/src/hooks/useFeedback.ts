import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
import type { FeedbackCategory, FeedbackStatus } from '@/types'

export function useCreateFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: {
      title: string
      description: string
      category: FeedbackCategory
    }) => api.createFeedback(data),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feedback'] })
    },
  })
}

export function useFeedbackList() {
  return useQuery({
    queryKey: ['feedback'],
    queryFn: api.getFeedbackList,
  })
}

export function useDeleteFeedback() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.deleteFeedback(id),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feedback'] })
    },
  })
}

export function useUpdateFeedbackStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status }: { id: string; status: FeedbackStatus }) =>
      api.updateFeedbackStatus(id, status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['feedback'] })
    },
  })
}
