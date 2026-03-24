import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'

import { api } from '@/api'
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
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({
      spotId,
      date,
      status,
    }: {
      spotId: string
      date: string
      status: 'free' | 'occupied' | null
    }) => api.setSpotDayStatus(spotId, date, status),
    onSuccess: (_, variables) => {
      void qc.invalidateQueries({ queryKey: ['owners', 'me', 'overrides'] })
      void qc.invalidateQueries({ queryKey: ['owners', 'me', 'spots'] })
      void qc.invalidateQueries({ queryKey: ['spots'] })
      // Proactively refetch day-overrides for the changed date so Stats/Dashboard
      // pages are immediately in sync even when they are not currently mounted
      // (invalidateQueries alone only marks inactive queries stale — no refetch).
      void qc.refetchQueries({
        queryKey: ['spots', 'day-overrides', variables.date],
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
