import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/api'
import { queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'

export function useNotificationPrefs() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['notification-prefs'],
    queryFn: api.getNotificationPrefs,
    enabled: !!token,
    retry: false,
  })
}

export function useSetNotificationPref() {
  return useMutation({
    mutationFn: ({ type, enabled }: { type: string; enabled: boolean }) =>
      api.setNotificationPref(type, enabled),
    onSuccess: () =>
      void queryClient.invalidateQueries({ queryKey: ['notification-prefs'] }),
  })
}
