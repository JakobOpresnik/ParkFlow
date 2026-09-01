import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
import { useAuthStore } from '@/store/authStore'
import { useUIStore } from '@/store/uiStore'
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

// True when feedback newer than the admin's last visit to the feedback page
// exists — drives the nav indicator dot. Always false for non-admins.
export function useHasNewFeedback(): boolean {
  const isAdmin = useAuthStore((s) => s.user?.role === 'admin')
  const seenAt = useUIStore((s) => s.feedbackSeenAt)
  const { data } = useQuery({
    queryKey: ['feedback'],
    queryFn: api.getFeedbackList,
    enabled: isAdmin,
    refetchInterval: 5 * 60_000,
  })
  return !!data?.some((f) => f.created_at > seenAt)
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
