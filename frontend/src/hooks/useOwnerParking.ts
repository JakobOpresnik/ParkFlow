import { useMutation, useQuery } from '@tanstack/react-query'

import { api } from '@/api'
import { invalidateAllSpotQueries, queryClient } from '@/lib/queryClient'
import { useAuthStore } from '@/store/authStore'

export function useOwnerMe() {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me'],
    queryFn: api.getOwnerMe,
    enabled: !!token,
    retry: false,
  })
}

export function useOwnerSpots(isOwner = true) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me', 'spots'],
    queryFn: api.getOwnerSpots,
    enabled: !!token && isOwner,
    refetchInterval: 15_000,
    retry: false,
  })
}

export function useOwnerWeek(from: string, to: string, isOwner = true) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me', 'week', from, to],
    queryFn: () => api.getOwnerWeek(from, to),
    enabled: !!token && !!from && !!to && isOwner,
  })
}

export function useOwnerOverrides(from: string, to: string, isOwner = true) {
  const token = useAuthStore((s) => s.accessToken)
  return useQuery({
    queryKey: ['owners', 'me', 'overrides', from, to],
    queryFn: () => api.getOwnerOverrides(from, to),
    enabled: !!token && !!from && !!to && isOwner,
  })
}

export function useSetSpotDayStatus() {
  return useMutation({
    mutationFn: ({
      spotId,
      date,
      status,
      days,
      indefinite,
    }: {
      spotId: string
      date?: string
      status: 'free' | 'occupied' | null
      days?: number
      indefinite?: boolean
    }) => api.setSpotDayStatus(spotId, date, status, { days, indefinite }),
    onSuccess: (_, variables) => {
      invalidateAllSpotQueries()
      // Proactively refetch day-overrides for the changed date(s) so Stats/Dashboard
      // pages are immediately in sync even when they are not currently mounted
      // (invalidateQueries alone only marks inactive queries stale — no refetch).
      void queryClient.refetchQueries({
        queryKey:
          variables.indefinite || (variables.days ?? 1) > 1
            ? ['spots', 'day-overrides']
            : ['spots', 'day-overrides', variables.date],
        type: 'all',
      })
    },
  })
}

export function useSpotBookings(spotId: string | null) {
  return useQuery({
    queryKey: ['spots', spotId, 'bookings'],
    queryFn: () => api.getSpotBookings(spotId!),
    enabled: !!spotId,
  })
}
