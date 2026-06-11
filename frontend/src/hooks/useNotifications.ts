import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/api'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'

export function useNotifications() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['notifications'],
    queryFn: api.listNotifications,
    enabled: !!token,
    refetchInterval: 60_000,
    retry: false,
  })
}

export function useMarkNotificationRead() {
  return useMutation({
    mutationFn: (id: string) => api.markNotificationRead(id),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: () => api.markAllNotificationsRead(),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })
}
