import { useQuery } from '@tanstack/react-query'

import { api } from '@/api'

export function useChanges(lotId?: string) {
  return useQuery({
    queryKey: ['changes', lotId ?? null],
    queryFn: () => api.getChanges(lotId),
    refetchInterval: 15_000,
  })
}
