import { useQuery } from '@tanstack/react-query'

import { api } from '@/api'

export function useStatsHistory(
  lotId?: string,
  days?: number,
  heatmapDays?: number,
) {
  return useQuery({
    queryKey: ['stats-history', lotId ?? null, days ?? 30, heatmapDays ?? 90],
    queryFn: () => api.getStatsHistory(lotId, days, heatmapDays),
    staleTime: 60_000,
  })
}
