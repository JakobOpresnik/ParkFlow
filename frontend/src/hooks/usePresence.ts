import { useQuery } from '@tanstack/react-query'

import { api } from '@/api'
import type { PresenceResponse } from '@/types'

export function usePresence(date: string) {
  return useQuery<PresenceResponse>({
    queryKey: ['presence', date],
    queryFn: () => api.getPresence(date),
    enabled: /^\d{4}-\d{2}-\d{2}$/.test(date),
    // Presence data for a given day won't change frequently
    staleTime: 5 * 60 * 1000,
  })
}
